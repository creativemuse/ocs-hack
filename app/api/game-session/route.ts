import { NextRequest, NextResponse } from 'next/server';
import { spacetimeClient } from '@/lib/apis/spacetime';
import { getActiveSession as memGet, joinActiveSession as memJoin, leaveActiveSession as memLeave, getTimeRemainingSeconds as memTime } from './state';
import { verifyEntryToken, getPlayerInfoFromToken, validatePlayerAccess } from '@/lib/utils/jwt';

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
    
    // Check if SpacetimeDB is properly configured and connected
    if (spacetimeClient.isConfigured()) {
      try {
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
            waitingForPaidPlayer: activeSession.paid_player_count === 0,
            source: 'spacetime'
          });
        }
      } catch (spacetimeError) {
        console.warn('⚠️ SpacetimeDB session query failed, using memory fallback:', spacetimeError);
      }
    } else {
      console.log('ℹ️ SpacetimeDB not configured - using memory session');
    }
  } catch (err) {
    console.warn('⚠️ SpacetimeDB initialization failed, using in-memory session fallback');
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
    waitingForPaidPlayer,
    source: 'memory'
  });
}

export async function POST(req: NextRequest) {
  try {
    const { action, playerAddress, isPaidPlayer = false, playerId, entryId, token } = await req.json();

    if (action === 'join') {
      try {
        await spacetimeClient.initialize();
        
        // Check if SpacetimeDB is properly configured and connected
        if (spacetimeClient.isConfigured()) {
          try {
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
                waitingForPaidPlayer,
                source: 'spacetime'
              });
            }
          } catch (spacetimeError) {
            console.warn('⚠️ SpacetimeDB join failed, using memory fallback:', spacetimeError);
          }
        } else {
          console.log('ℹ️ SpacetimeDB not configured - using memory session for join');
        }
      } catch (e) {
        console.warn('⚠️ SpacetimeDB initialization failed, using memory fallback');
      }

      // Verify JWT entry token and extract player information
      if (!token) {
        return NextResponse.json({ error: 'Entry token required' }, { status: 401 });
      }

      const validation = validatePlayerAccess(token);
      if (!validation.isValid) {
        return NextResponse.json({ 
          error: validation.error || 'Invalid or expired entry token' 
        }, { status: 401 });
      }

      const playerInfo = validation.playerInfo!;
      
      // Verify entry ID matches
      if (playerInfo.entryId !== entryId) {
        return NextResponse.json({ error: 'Entry ID mismatch' }, { status: 401 });
      }

      // Override isPaidPlayer based on JWT token
      const actualIsPaidPlayer = playerInfo.playerType === 'paid';
      
      console.log(`🎯 Player ${playerInfo.playerType} joining with ${playerInfo.walletAddress || playerInfo.anonId}`);

      // Memory fallback - use actual player type from JWT
      const s = memJoin(actualIsPaidPlayer, playerId);
      const timeRemaining = memTime(s);
      const isFirstPaidPlayer = actualIsPaidPlayer && s.paid_player_count === 1 && s.status === 'active';
      const waitingForPaidPlayer = s.paid_player_count === 0;
      
      return NextResponse.json({ 
        session: s, 
        timeRemaining, 
        isFirstPaidPlayer,
        waitingForPaidPlayer,
        source: 'memory'
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
        gameCancelled: s.status === 'waiting' && s.player_count === 0,
        source: 'memory'
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
