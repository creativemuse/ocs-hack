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
      // Check wallet-connected player
      console.log('Checking wallet player status for:', walletAddress);
      
      // Note: In a real implementation, you'd query SpaceTimeDB for player data
      // For now, we'll return default trial status
      return NextResponse.json({
        trialGamesRemaining: 1, // Default to 1 trial game
        trialCompleted: false,
        walletConnected: true
      });
    } else if (sessionId) {
      // Check anonymous session
      console.log('Checking anonymous session for:', sessionId);
      
      // Note: In a real implementation, you'd query SpaceTimeDB for anonymous session data
      // For now, we'll return default session data
      return NextResponse.json({
        gamesPlayed: 0,
        totalScore: 0,
        bestScore: 0
      });
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
