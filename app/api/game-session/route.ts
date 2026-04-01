import { NextRequest, NextResponse } from 'next/server';
import { spacetimeClient } from '@/lib/apis/spacetime';
import {
  getActiveSession as memGet,
  joinActiveSession as memJoin,
  leaveActiveSession as memLeave,
  getTimeRemainingSeconds as memTime,
  reconcileLobbyToActive,
  getLobbyTimeRemainingSeconds,
  endLobbyNow,
  syncLobbyDurationSec,
  type JoinPlayerMode,
} from './state';
import { validatePlayerAccess } from '@/lib/utils/jwt';

export async function GET() {
  try {
    await spacetimeClient.initialize();

    if (spacetimeClient.isConfigured()) {
      try {
        const activeSession = await spacetimeClient.getActiveGameSession();

        if (activeSession) {
          const now = Date.now();
          const sessionStatus = activeSession.status?.tag || activeSession.status || 'waiting';

          let timeRemaining = 0;
          if (sessionStatus === 'Active' && activeSession.paidPlayerCount > 0) {
            const elapsed = Math.floor((now - Number(activeSession.startTime)) / 1000);
            timeRemaining = Math.max(0, 300 - elapsed);
          }

          const isWaiting = sessionStatus === 'Waiting';
          const isActiveWithTime = sessionStatus === 'Active' && activeSession.paidPlayerCount > 0 && timeRemaining > 0;
          const hasNoPaidPlayers = activeSession.paidPlayerCount === 0;

          const canJoin = isWaiting || isActiveWithTime || hasNoPaidPlayers;
          const waitingForPaidPlayer = activeSession.paidPlayerCount === 0;

          return NextResponse.json({
            session: activeSession,
            timeRemaining,
            lobbyTimeRemaining: 0,
            inLobby: false,
            canJoin,
            waitingForPaidPlayer,
            source: 'spacetime',
          });
        }
      } catch (spacetimeError) {
        console.warn('⚠️ SpacetimeDB session query failed, using memory fallback:', spacetimeError);
      }
    } else {
      console.log('ℹ️ SpacetimeDB not configured - using memory session');
    }
  } catch {
    console.warn('⚠️ SpacetimeDB initialization failed, using in-memory session fallback');
  }

  reconcileLobbyToActive();
  const session = memGet();
  const timeRemaining = memTime(session);
  const lobbyTimeRemaining = getLobbyTimeRemainingSeconds(session);
  const inLobby = session.status === 'lobby';

  const isWaiting = session.status === 'waiting';
  const isLobbyOpen = inLobby && lobbyTimeRemaining > 0;
  const isActiveWithTime = session.status === 'active' && session.paid_player_count > 0 && timeRemaining > 0;
  const hasNoPaidPlayers = session.paid_player_count === 0;

  const canJoin = isWaiting || isLobbyOpen || isActiveWithTime || hasNoPaidPlayers;
  const waitingForPaidPlayer = session.paid_player_count === 0 && !inLobby;

  return NextResponse.json({
    session,
    timeRemaining,
    lobbyTimeRemaining,
    inLobby,
    canJoin,
    waitingForPaidPlayer,
    source: 'memory',
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, playerId, entryId, token, playerMode, lobbyDurationSec, durationSec } = body;

    if (action === 'join') {
      const useMemoryLobbyForPaidMultiplayer =
        Boolean(body.isPaidPlayer) && playerMode === 'paid_multiplayer';

      if (!useMemoryLobbyForPaidMultiplayer) {
        try {
          await spacetimeClient.initialize();

          if (spacetimeClient.isConfigured()) {
            try {
              await spacetimeClient.joinActiveGameSession();
              const updatedSession = await spacetimeClient.getActiveGameSession();
              if (updatedSession) {
                const now = Date.now();
                const sessionStatus = updatedSession.status?.tag || updatedSession.status || 'waiting';

                let timeRemaining = 0;
                if (sessionStatus === 'Active' && updatedSession.paidPlayerCount > 0) {
                  const elapsed = Math.floor((now - Number(updatedSession.startTime)) / 1000);
                  timeRemaining = Math.max(0, 300 - elapsed);
                }

                const isFirstPaidPlayer =
                  body.isPaidPlayer && updatedSession.paidPlayerCount === 1 && sessionStatus === 'Active';
                const waitingForPaidPlayer = updatedSession.paidPlayerCount === 0;

                const isWaiting = sessionStatus === 'Waiting';
                const isActiveWithTime =
                  sessionStatus === 'Active' && updatedSession.paidPlayerCount > 0 && timeRemaining > 0;
                const hasNoPaidPlayers = updatedSession.paidPlayerCount === 0;
                const canJoin = isWaiting || isActiveWithTime || hasNoPaidPlayers;

                return NextResponse.json({
                  session: updatedSession,
                  timeRemaining,
                  lobbyTimeRemaining: 0,
                  inLobby: false,
                  isFirstPaidPlayer,
                  waitingForPaidPlayer,
                  canJoin,
                  source: 'spacetime',
                });
              }
            } catch (spacetimeError) {
              console.warn('⚠️ SpacetimeDB join failed, using memory fallback:', spacetimeError);
            }
          } else {
            console.log('ℹ️ SpacetimeDB not configured - using memory session for join');
          }
        } catch {
          console.warn('⚠️ SpacetimeDB initialization failed, using memory fallback');
        }
      } else {
        console.log('ℹ️ Paid multiplayer join uses in-memory lobby path (skip Spacetime join short-circuit)');
      }

      if (!token) {
        console.error('No entry token provided');
        return NextResponse.json({ error: 'Entry token required' }, { status: 401 });
      }

      const validation = validatePlayerAccess(token);
      if (!validation.isValid) {
        return NextResponse.json(
          { error: validation.error || 'Invalid or expired entry token' },
          { status: 401 }
        );
      }

      const playerInfo = validation.playerInfo!;

      if (playerInfo.entryId !== entryId) {
        return NextResponse.json({ error: 'Entry ID mismatch' }, { status: 401 });
      }

      const actualIsPaidPlayer = playerInfo.playerType === 'paid';

      const mode: JoinPlayerMode = actualIsPaidPlayer
        ? playerMode === 'paid_multiplayer'
          ? 'paid_multiplayer'
          : 'paid_solo'
        : 'trial';

      let s;
      try {
        s = memJoin(actualIsPaidPlayer, playerId, {
          playerMode: mode,
          lobbyDurationSec: typeof lobbyDurationSec === 'number' ? lobbyDurationSec : undefined,
          walletAddress: playerInfo.walletAddress || undefined,
        });
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'Cannot join session';
        return NextResponse.json({ error: msg }, { status: 409 });
      }

      reconcileLobbyToActive();
      const timeRemaining = memTime(s);
      const lobbyTimeRemaining = getLobbyTimeRemainingSeconds(s);
      const inLobby = s.status === 'lobby';
      const isFirstPaidPlayer =
        actualIsPaidPlayer && s.paid_player_count === 1 && (s.status === 'active' || s.status === 'lobby');
      const waitingForPaidPlayer = s.paid_player_count === 0 && !inLobby;

      const isWaiting = s.status === 'waiting';
      const isLobbyOpen = inLobby && lobbyTimeRemaining > 0;
      const isActiveWithTime = s.status === 'active' && s.paid_player_count > 0 && timeRemaining > 0;
      const hasNoPaidPlayers = s.paid_player_count === 0;
      const canJoin = isWaiting || isLobbyOpen || isActiveWithTime || hasNoPaidPlayers;

      return NextResponse.json({
        session: s,
        timeRemaining,
        lobbyTimeRemaining,
        inLobby,
        isFirstPaidPlayer,
        waitingForPaidPlayer,
        canJoin,
        source: 'memory',
      });
    }

    if (action === 'end_lobby') {
      reconcileLobbyToActive();
      const s = endLobbyNow();
      const timeRemaining = memTime(s);
      const lobbyTimeRemaining = getLobbyTimeRemainingSeconds(s);
      const inLobby = s.status === 'lobby';
      const isWaiting = s.status === 'waiting';
      const isLobbyOpen = inLobby && lobbyTimeRemaining > 0;
      const isActiveWithTime = s.status === 'active' && s.paid_player_count > 0 && timeRemaining > 0;
      const hasNoPaidPlayers = s.paid_player_count === 0;
      const canJoin = isWaiting || isLobbyOpen || isActiveWithTime || hasNoPaidPlayers;
      const waitingForPaidPlayer = s.paid_player_count === 0 && !inLobby;

      return NextResponse.json({
        session: s,
        timeRemaining,
        lobbyTimeRemaining,
        inLobby,
        waitingForPaidPlayer,
        canJoin,
        source: 'memory',
      });
    }

    if (action === 'sync_lobby_duration') {
      const sec = typeof durationSec === 'number' ? durationSec : Number(durationSec);
      if (!Number.isFinite(sec)) {
        return NextResponse.json({ error: 'durationSec required' }, { status: 400 });
      }
      const s = syncLobbyDurationSec(sec);
      const lobbyTimeRemaining = getLobbyTimeRemainingSeconds(s);
      const inLobby = s.status === 'lobby';
      return NextResponse.json({
        session: s,
        lobbyTimeRemaining,
        inLobby,
        source: 'memory',
      });
    }

    if (action === 'leave') {
      if (!playerId) {
        return NextResponse.json({ error: 'Player ID required for leave action' }, { status: 400 });
      }

      try {
        await spacetimeClient.initialize();
      } catch (e) {
        console.warn('⚠️ SpacetimeDB connection check failed, using memory fallback:', e);
      }

      const s = memLeave(playerId);
      reconcileLobbyToActive();
      const timeRemaining = memTime(s);
      const lobbyTimeRemaining = getLobbyTimeRemainingSeconds(s);
      const inLobby = s.status === 'lobby';
      const waitingForPaidPlayer = s.paid_player_count === 0 && !inLobby;

      const isWaiting = s.status === 'waiting';
      const isLobbyOpen = inLobby && lobbyTimeRemaining > 0;
      const isActiveWithTime = s.status === 'active' && s.paid_player_count > 0 && timeRemaining > 0;
      const hasNoPaidPlayers = s.paid_player_count === 0;
      const canJoin = isWaiting || isLobbyOpen || isActiveWithTime || hasNoPaidPlayers;

      return NextResponse.json({
        session: s,
        timeRemaining,
        lobbyTimeRemaining,
        inLobby,
        waitingForPaidPlayer,
        canJoin,
        gameCancelled: s.status === 'waiting' && s.player_count === 0,
        source: 'memory',
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in game session:', error);
    return NextResponse.json({ error: 'Failed to process game session action' }, { status: 500 });
  }
}
