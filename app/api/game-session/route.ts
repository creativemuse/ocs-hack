import { NextRequest, NextResponse } from 'next/server';
import { spacetimeClient } from '@/lib/apis/spacetime';
import { getActiveSession as memGet, joinActiveSession as memJoin, leaveActiveSession as memLeave, getTimeRemainingSeconds as memTime } from './state';
import { verifyEntryToken } from '@/lib/utils/jwt';

interface GameSession {
  session_id: string;
  status: 'waiting' | 'active' | 'completed';
  player_count: number;
  paid_player_count: number;
  trial_player_count: number;
  prize_pool: number;
  entry_fee: number;
  start_time: number;
  created_at: number;
}

export async function GET() {
  // Attempt SpacetimeDB first; if it fails, fall back to memory session
  try {
    await spacetimeClient.initialize();
    const activeSession = await spacetimeClient.getActiveGameSession();

    if (activeSession) {
      const now = Date.now();
      const elapsed = Math.floor((now - activeSession.start_time) / 1000);
      const timeRemaining = Math.max(0, 300 - elapsed);
      // Fix: Allow joining when there are no paid players, regardless of time remaining
      const canJoin = activeSession.paid_player_count === 0 || timeRemaining > 0;
      return NextResponse.json({ 
        session: activeSession, 
        timeRemaining, 
        canJoin,
        waitingForPaidPlayer: activeSession.paid_player_count === 0 
      });
    }
  } catch (err) {
    console.warn('Spacetime unavailable, using in-memory session fallback');
  }

  // Memory fallback
  const session = memGet();
  const timeRemaining = memTime(session);
  // Fix: Allow joining when there are no paid players, regardless of time remaining
  const canJoin = session.paid_player_count === 0 || timeRemaining > 0;
  const waitingForPaidPlayer = session.paid_player_count === 0;
  
  return NextResponse.json({ 
    session, 
    timeRemaining, 
    canJoin,
    waitingForPaidPlayer 
  });
}

export async function POST(req: NextRequest) {
  try {
    const { action, playerAddress, isPaidPlayer = false, playerId, entryId, token } = await req.json();

    if (action === 'join') {
      try {
        await spacetimeClient.initialize();
        await spacetimeClient.joinActiveGameSession();
        const updatedSession = await spacetimeClient.getActiveGameSession();
        if (updatedSession) {
          const now = Date.now();
          const elapsed = Math.floor((now - updatedSession.start_time) / 1000);
          const timeRemaining = Math.max(0, 300 - elapsed);
          const isFirstPaidPlayer = isPaidPlayer && updatedSession.paid_player_count === 1 && updatedSession.status === 'active';
          const waitingForPaidPlayer = updatedSession.paid_player_count === 0;
          
          return NextResponse.json({ 
            session: updatedSession, 
            timeRemaining, 
            isFirstPaidPlayer,
            waitingForPaidPlayer 
          });
        }
      } catch (e) {
        console.warn('Spacetime join failed, using memory fallback');
      }

      // Verify JWT entry token
      const payload = token ? verifyEntryToken(token) : null;
      if (!payload || payload.entryId !== entryId) {
        return NextResponse.json({ error: 'Invalid or expired entry token' }, { status: 401 });
      }

      // Memory fallback
      const s = memJoin(isPaidPlayer, playerId);
      const timeRemaining = memTime(s);
      const isFirstPaidPlayer = isPaidPlayer && s.paid_player_count === 1 && s.status === 'active';
      const waitingForPaidPlayer = s.paid_player_count === 0;
      
      return NextResponse.json({ 
        session: s, 
        timeRemaining, 
        isFirstPaidPlayer,
        waitingForPaidPlayer 
      });
    }

    if (action === 'leave') {
      if (!playerId) {
        return NextResponse.json({ error: 'Player ID required for leave action' }, { status: 400 });
      }

      try {
        await spacetimeClient.initialize();
        // TODO: Implement leave functionality in SpacetimeDB
        // For now, fall back to memory implementation
      } catch (e) {
        console.warn('Spacetime leave failed, using memory fallback');
      }

      // Memory fallback
      const s = memLeave(playerId);
      const timeRemaining = memTime(s);
      const waitingForPaidPlayer = s.paid_player_count === 0;
      
      return NextResponse.json({ 
        session: s, 
        timeRemaining, 
        waitingForPaidPlayer,
        gameCancelled: s.status === 'waiting' && s.player_count === 0
      });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error in game session:', error);
    return NextResponse.json(
      { error: 'Failed to process game session action' },
      { status: 500 }
    );
  }
}
