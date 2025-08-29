import { NextRequest, NextResponse } from 'next/server';
import { spacetimeClient } from '@/lib/apis/spacetime';
import { getActiveSession as memGet, joinActiveSession as memJoin, getTimeRemainingSeconds as memTime } from './state';

interface GameSession {
  session_id: string;
  status: 'waiting' | 'active' | 'completed';
  player_count: number;
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
      return NextResponse.json({ session: activeSession, timeRemaining, canJoin: timeRemaining > 0 });
    }
  } catch (err) {
    console.warn('Spacetime unavailable, using in-memory session fallback');
  }

  // Memory fallback
  const session = memGet();
  const timeRemaining = memTime(session);
  return NextResponse.json({ session, timeRemaining, canJoin: timeRemaining > 0 });
}

export async function POST(req: NextRequest) {
  try {
    const { action, playerAddress } = await req.json();

    if (action === 'join') {
      try {
        await spacetimeClient.initialize();
        await spacetimeClient.joinActiveGameSession();
        const updatedSession = await spacetimeClient.getActiveGameSession();
        if (updatedSession) {
          const now = Date.now();
          const elapsed = Math.floor((now - updatedSession.start_time) / 1000);
          const timeRemaining = Math.max(0, 300 - elapsed);
          const isFirstPlayer = updatedSession.player_count === 1 && updatedSession.status === 'active';
          return NextResponse.json({ session: updatedSession, timeRemaining, isFirstPlayer });
        }
      } catch (e) {
        console.warn('Spacetime join failed, using memory fallback');
      }

      // Memory fallback
      const s = memJoin();
      const timeRemaining = memTime(s);
      const isFirstPlayer = s.player_count === 1 && s.status === 'active';
      return NextResponse.json({ session: s, timeRemaining, isFirstPlayer });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });

  } catch (error) {
    console.error('Error joining game session:', error);
    return NextResponse.json(
      { error: 'Failed to join game session' },
      { status: 500 }
    );
  }
}
