import { NextRequest, NextResponse } from 'next/server';
import { spacetimeClient } from '@/lib/apis/spacetime';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const walletAddress = searchParams.get('wallet');
    const sessionId = searchParams.get('session');

    console.log('Trial status request:', { walletAddress, sessionId });

    // Initialize SpacetimeDB connection
    await spacetimeClient.initialize();

    if (walletAddress) {
      // Check wallet-connected player trial status from SpaceTimeDB
      console.log('Checking wallet player status for:', walletAddress);
      
      try {
        // Query SpaceTimeDB for player data
        const playerData = await spacetimeClient.query(
          'SELECT * FROM players WHERE wallet_address = ?',
          [walletAddress]
        );

        if (playerData && playerData.length > 0) {
          const player = playerData[0] as any;
          return NextResponse.json({
            trialGamesRemaining: player.trial_games_remaining || 0,
            trialCompleted: player.trial_completed || false,
            walletConnected: true,
            gamesPlayed: player.games_played || 0,
            totalScore: player.total_score || 0,
            bestScore: player.best_score || 0
          });
        } else {
          // Player doesn't exist yet, return default trial status
          return NextResponse.json({
            trialGamesRemaining: 1,
            trialCompleted: false,
            walletConnected: true,
            gamesPlayed: 0,
            totalScore: 0,
            bestScore: 0
          });
        }
      } catch (queryError) {
        console.warn('SpaceTimeDB query failed, using fallback:', queryError);
        // Fallback to default trial status if SpaceTimeDB query fails
        return NextResponse.json({
          trialGamesRemaining: 1,
          trialCompleted: false,
          walletConnected: true,
          gamesPlayed: 0,
          totalScore: 0,
          bestScore: 0
        });
      }
    } else if (sessionId) {
      // Check anonymous session trial status from SpaceTimeDB
      console.log('Checking anonymous session for:', sessionId);
      
      try {
        // Query SpaceTimeDB for anonymous session data
        const sessionData = await spacetimeClient.query(
          'SELECT * FROM anonymous_sessions WHERE session_id = ?',
          [sessionId]
        );

        if (sessionData && sessionData.length > 0) {
          const session = sessionData[0] as any;
          return NextResponse.json({
            gamesPlayed: session.games_played || 0,
            totalScore: session.total_score || 0,
            bestScore: session.best_score || 0,
            trialGamesRemaining: Math.max(0, 1 - (session.games_played || 0)),
            trialCompleted: (session.games_played || 0) >= 1
          });
        } else {
          // Session doesn't exist yet, return default trial status
          return NextResponse.json({
            gamesPlayed: 0,
            totalScore: 0,
            bestScore: 0,
            trialGamesRemaining: 1,
            trialCompleted: false
          });
        }
      } catch (queryError) {
        console.warn('SpaceTimeDB query failed, using fallback:', queryError);
        // Fallback to default trial status if SpaceTimeDB query fails
        return NextResponse.json({
          gamesPlayed: 0,
          totalScore: 0,
          bestScore: 0,
          trialGamesRemaining: 1,
          trialCompleted: false
        });
      }
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Error checking trial status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Error details:', errorMessage);
    return NextResponse.json(
      { error: 'Failed to check trial status', details: errorMessage },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress, sessionId } = body;

    // Initialize SpacetimeDB connection
    await spacetimeClient.initialize();

    if (walletAddress) {
      // Update wallet player trial games
      await spacetimeClient.updateTrialStatus(walletAddress, 0, true);
      return NextResponse.json({ success: true });
    } else if (sessionId) {
      // Create anonymous session if it doesn't exist
      await spacetimeClient.createAnonymousSession(sessionId);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  } catch (error) {
    console.error('Error updating trial status:', error);
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    return NextResponse.json(
      { error: 'Failed to update trial status', details: errorMessage },
      { status: 500 }
    );
  }
}
