import { NextRequest, NextResponse } from 'next/server';

/** Spacetime WebSocket + reducer can exceed default Vercel limits without this. */
export const maxDuration = 60;
import { spacetimeClient } from '@/lib/apis/spacetime';
import {
  buildSpacetimeGameSessionApiPayload,
  isFirstPaidPlayerAfterJoin,
} from '@/lib/apis/mapSpacetimeGameSession';
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
  type MemoryGameSession,
} from './state';
import { validatePlayerAccess } from '@/lib/utils/jwt';

const buildMemorySessionJson = (session: MemoryGameSession) => {
  const timeRemaining = memTime(session);
  const lobbyTimeRemaining = getLobbyTimeRemainingSeconds(session);
  const inLobby = session.status === 'lobby';

  const isWaiting = session.status === 'waiting';
  const isLobbyOpen = inLobby && lobbyTimeRemaining > 0;
  const isActiveWithTime = session.status === 'active' && session.paid_player_count > 0 && timeRemaining > 0;
  const hasNoPaidPlayers = session.paid_player_count === 0;

  const canJoin = isWaiting || isLobbyOpen || isActiveWithTime || hasNoPaidPlayers;
  const waitingForPaidPlayer = session.paid_player_count === 0 && !inLobby;

  return {
    session,
    timeRemaining,
    lobbyTimeRemaining,
    inLobby,
    canJoin,
    waitingForPaidPlayer,
    source: 'memory' as const,
  };
};

const trySpacetimeSessionPayload = async () => {
  await spacetimeClient.initialize();
  if (!spacetimeClient.isConfigured()) return null;
  const row = await spacetimeClient.getActiveGameSession();
  if (!row) return null;
  const pool = spacetimeClient.getPoolPlayersForSession(row.sessionId);
  return buildSpacetimeGameSessionApiPayload(row, pool);
};

export async function GET() {
  try {
    const spacetimePayload = await trySpacetimeSessionPayload();
    if (spacetimePayload) {
      return NextResponse.json(spacetimePayload);
    }
  } catch (spacetimeError) {
    console.warn('⚠️ SpacetimeDB session query failed, using memory fallback:', spacetimeError);
  }

  reconcileLobbyToActive();
  const session = memGet();
  return NextResponse.json(buildMemorySessionJson(session));
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action, playerId, entryId, token, playerMode, lobbyDurationSec, durationSec } = body;

    if (action === 'join') {
      const useMemoryLobbyForPaidMultiplayer =
        Boolean(body.isPaidPlayer) && playerMode === 'paid_multiplayer';

      if (useMemoryLobbyForPaidMultiplayer) {
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

        if (mode !== 'paid_multiplayer') {
          return NextResponse.json({ error: 'Invalid player mode for paid lobby' }, { status: 400 });
        }

        if (!playerId || typeof playerId !== 'string') {
          return NextResponse.json({ error: 'Player ID required' }, { status: 400 });
        }

        const lobbySec =
          typeof lobbyDurationSec === 'number' && Number.isFinite(lobbyDurationSec)
            ? Math.round(lobbyDurationSec)
            : 180;

        try {
          await spacetimeClient.initialize();
          if (spacetimeClient.isConfigured()) {
            try {
              await spacetimeClient.joinMultiplayerPool(
                playerId,
                playerInfo.walletAddress || undefined,
                lobbySec
              );
              const row = await spacetimeClient.getActiveGameSession();
              if (row) {
                const pool = spacetimeClient.getPoolPlayersForSession(row.sessionId);
                const isFirstPaidPlayer = isFirstPaidPlayerAfterJoin(row, actualIsPaidPlayer);
                return NextResponse.json(
                  buildSpacetimeGameSessionApiPayload(row, pool, { isFirstPaidPlayer })
                );
              }
            } catch (spacetimeError) {
              const msg =
                spacetimeError instanceof Error ? spacetimeError.message : 'Cannot join session';
              console.warn('⚠️ SpacetimeDB paid multiplayer join failed:', spacetimeError);
              return NextResponse.json({ error: msg }, { status: 409 });
            }
          }
        } catch {
          console.warn('⚠️ SpacetimeDB initialization failed for paid multiplayer, using memory');
        }

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

      if (!useMemoryLobbyForPaidMultiplayer) {
        try {
          await spacetimeClient.initialize();

          if (spacetimeClient.isConfigured()) {
            try {
              await spacetimeClient.joinActiveGameSession();
              const updatedSession = await spacetimeClient.getActiveGameSession();
              if (updatedSession) {
                const pool = spacetimeClient.getPoolPlayersForSession(updatedSession.sessionId);
                return NextResponse.json(
                  buildSpacetimeGameSessionApiPayload(updatedSession, pool)
                );
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
      try {
        await spacetimeClient.initialize();
        if (spacetimeClient.isConfigured()) {
          try {
            await spacetimeClient.endMultiplayerLobby();
            const row = await spacetimeClient.getActiveGameSession();
            if (row) {
              const pool = spacetimeClient.getPoolPlayersForSession(row.sessionId);
              return NextResponse.json(buildSpacetimeGameSessionApiPayload(row, pool));
            }
          } catch (e) {
            console.warn('⚠️ SpacetimeDB end_lobby failed, using memory:', e);
          }
        }
      } catch {
        console.warn('⚠️ SpacetimeDB init failed for end_lobby');
      }

      reconcileLobbyToActive();
      const s = endLobbyNow();
      return NextResponse.json(buildMemorySessionJson(s));
    }

    if (action === 'sync_lobby_duration') {
      const sec = typeof durationSec === 'number' ? durationSec : Number(durationSec);
      if (!Number.isFinite(sec)) {
        return NextResponse.json({ error: 'durationSec required' }, { status: 400 });
      }

      try {
        await spacetimeClient.initialize();
        if (spacetimeClient.isConfigured()) {
          try {
            await spacetimeClient.syncMultiplayerLobbyEndsAfterSecs(Math.round(sec));
            const row = await spacetimeClient.getActiveGameSession();
            if (row) {
              const pool = spacetimeClient.getPoolPlayersForSession(row.sessionId);
              return NextResponse.json(buildSpacetimeGameSessionApiPayload(row, pool));
            }
          } catch (e) {
            console.warn('⚠️ SpacetimeDB sync_lobby_duration failed, using memory:', e);
          }
        }
      } catch {
        console.warn('⚠️ SpacetimeDB init failed for sync_lobby_duration');
      }

      const s = syncLobbyDurationSec(sec);
      return NextResponse.json(buildMemorySessionJson(s));
    }

    if (action === 'leave') {
      if (!playerId) {
        return NextResponse.json({ error: 'Player ID required for leave action' }, { status: 400 });
      }

      try {
        await spacetimeClient.initialize();
        if (spacetimeClient.isConfigured()) {
          try {
            await spacetimeClient.leaveMultiplayerPool(playerId);
            const row = await spacetimeClient.getActiveGameSession();
            if (row) {
              const pool = spacetimeClient.getPoolPlayersForSession(row.sessionId);
              const payload = buildSpacetimeGameSessionApiPayload(row, pool);
              return NextResponse.json({
                ...payload,
                gameCancelled:
                  payload.session.status === 'waiting' && payload.session.player_count === 0,
              });
            }
          } catch (e) {
            console.warn('⚠️ SpacetimeDB leave failed, using memory:', e);
          }
        }
      } catch (e) {
        console.warn('⚠️ SpacetimeDB connection check failed, using memory fallback:', e);
      }

      const s = memLeave(playerId);
      reconcileLobbyToActive();
      const payload = buildMemorySessionJson(s);
      return NextResponse.json({
        ...payload,
        gameCancelled: s.status === 'waiting' && s.player_count === 0,
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Error in game session:', error);
    return NextResponse.json({ error: 'Failed to process game session action' }, { status: 500 });
  }
}
