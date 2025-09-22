import { NextRequest, NextResponse } from 'next/server';
import { spacetimeClient } from '@/lib/apis/spacetime';
import { TRIVIA_CONTRACT_ADDRESS, TRIVIA_ABI } from '@/lib/blockchain/contracts';
import { createPublicClient, http } from 'viem';
import { baseSepolia } from 'viem/chains';
import { getPlayerInfoFromToken, validatePlayerAccess } from '@/lib/utils/jwt';

// Create public client for contract calls
const publicClient = createPublicClient({
  chain: baseSepolia,
  transport: http()
});

// Helper function to check if a session ID has been used in the smart contract
async function checkTrialSessionUsed(sessionId: string): Promise<boolean> {
  try {
    const result = await publicClient.readContract({
      address: TRIVIA_CONTRACT_ADDRESS,
      abi: TRIVIA_ABI,
      functionName: 'getTrialPlayerScore',
      args: [sessionId]
    });
    
    // If the session has a score > 0, it means it was used
    return result[1]; // hasSubmitted field
  } catch (error) {
    console.warn('Failed to check trial session in contract:', error);
    return false;
  }
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const walletAddress = searchParams.get('wallet');
    const sessionId = searchParams.get('session');
    const token = searchParams.get('token');

    console.log('Trial status request:', { walletAddress, sessionId, token: !!token });

    // Initialize SpacetimeDB connection
    await spacetimeClient.initialize();

    // Check trial status using JWT token (preferred method)
    if (token) {
      const validation = validatePlayerAccess(token);
      if (!validation.isValid) {
        return NextResponse.json({ 
          error: validation.error || 'Invalid token' 
        }, { status: 401 });
      }

      const playerInfo = validation.playerInfo!;
      
      if (playerInfo.playerType === 'paid') {
        // Paid players have unlimited games
        return NextResponse.json({
          gamesPlayed: 0,
          totalScore: 0,
          bestScore: 0,
          trialGamesRemaining: 0,
          trialCompleted: false,
          playerType: 'paid'
        });
      } else {
        // Trial players - check if they've used their trial
        const contractUsed = await checkTrialSessionUsed(playerInfo.sessionId);
        
        if (contractUsed) {
          return NextResponse.json({
            gamesPlayed: 1,
            totalScore: 0,
            bestScore: 0,
            trialGamesRemaining: 0,
            trialCompleted: true,
            playerType: 'trial'
          });
        } else {
          return NextResponse.json({
            gamesPlayed: 0,
            totalScore: 0,
            bestScore: 0,
            trialGamesRemaining: 1,
            trialCompleted: false,
            playerType: 'trial'
          });
        }
      }
    }

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
      // Check anonymous session trial status from smart contract
      console.log('Checking anonymous session for:', sessionId);
      
      try {
        // First check if this session ID has been used in the smart contract
        const contractUsed = await checkTrialSessionUsed(sessionId);
        
        if (contractUsed) {
          // Session was used in contract, trial is completed
          return NextResponse.json({
            gamesPlayed: 1,
            totalScore: 0,
            bestScore: 0,
            trialGamesRemaining: 0,
            trialCompleted: true
          });
        }
        
        // If not used in contract, check SpaceTimeDB as fallback
        const sessionData = await spacetimeClient.query(
          'SELECT * FROM anonymous_sessions WHERE session_id = ?',
          [sessionId]
        );

        if (sessionData && sessionData.length > 0) {
          const session = sessionData[0] as any;
          const gamesPlayed = session.games_played || 0;
          return NextResponse.json({
            gamesPlayed,
            totalScore: session.total_score || 0,
            bestScore: session.best_score || 0,
            trialGamesRemaining: Math.max(0, 1 - gamesPlayed),
            trialCompleted: gamesPlayed >= 1
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
        console.warn('Smart contract or SpaceTimeDB query failed, using fallback:', queryError);
        // Fallback to default trial status if queries fail
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
      // Update wallet player trial games in SpaceTimeDB
      await spacetimeClient.updateTrialStatus(walletAddress, 0, true);
      return NextResponse.json({ success: true });
    } else if (sessionId) {
      // For anonymous sessions, we need to call joinTrialBattle on the smart contract
      // This will mark the session ID as used and prevent future trial games
      try {
        // Note: In a real implementation, this would require a transaction
        // For now, we'll just update SpaceTimeDB and let the game handle the contract call
        await spacetimeClient.createAnonymousSession(sessionId);
        
        console.log(`🎯 Trial session ${sessionId} marked as used`);
        return NextResponse.json({ 
          success: true,
          message: 'Trial session marked as used. Call joinTrialBattle() on contract to complete registration.'
        });
      } catch (contractError) {
        console.warn('Failed to update contract, updating SpaceTimeDB only:', contractError);
        await spacetimeClient.createAnonymousSession(sessionId);
        return NextResponse.json({ success: true });
      }
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
