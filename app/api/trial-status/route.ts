import { NextRequest, NextResponse } from 'next/server';
import { SupabaseDatabase } from '@/lib/apis/supabase';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const walletAddress = searchParams.get('wallet');
    const sessionId = searchParams.get('session');

    console.log('Trial status request:', { walletAddress, sessionId });

    if (walletAddress) {
      // Check wallet-connected player
      console.log('Checking wallet player status for:', walletAddress);
      const playerStatus = await SupabaseDatabase.getPlayerTrialStatus(walletAddress);
      
      if (playerStatus) {
        return NextResponse.json({
          trialGamesRemaining: playerStatus.trial_games_remaining,
          trialCompleted: playerStatus.trial_completed,
          walletConnected: playerStatus.wallet_connected
        });
      } else {
        // New wallet player - give them 3 trial games
        return NextResponse.json({
          trialGamesRemaining: 3,
          trialCompleted: false,
          walletConnected: true
        });
      }
    } else if (sessionId) {
      // Check anonymous session
      console.log('Checking anonymous session for:', sessionId);
      const session = await SupabaseDatabase.getOrCreateAnonymousSession(sessionId);
      
      console.log('Anonymous session data:', session);
      if (!session) {
        return NextResponse.json({ error: 'Failed to create session' }, { status: 500 });
      }
      return NextResponse.json({
        gamesPlayed: session.games_played,
        totalScore: session.total_score,
        bestScore: session.best_score
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

    if (walletAddress) {
      // Update wallet player trial games
      await SupabaseDatabase.decrementTrialGames(walletAddress);
      return NextResponse.json({ success: true });
    } else if (sessionId) {
      // Update anonymous session games played
      await SupabaseDatabase.updateAnonymousSession(sessionId, 0); // Increment games played
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
