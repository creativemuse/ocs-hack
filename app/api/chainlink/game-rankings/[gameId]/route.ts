import { NextRequest, NextResponse } from 'next/server';
import { spacetimeClient } from '@/lib/apis/spacetime';

/**
 * Chainlink Functions API Endpoint for Game Rankings
 * 
 * This endpoint is called by Chainlink Functions DON nodes to fetch game rankings.
 * It must be publicly accessible (no authentication) and return data in the exact format
 * expected by the Chainlink Functions JavaScript source code.
 * 
 * Format: { gameId: number, rankings: string[], timestamp: number }
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  try {
    const { gameId } = await params;
    
    // Validate gameId parameter
    if (!gameId || isNaN(Number(gameId))) {
      return NextResponse.json(
        { 
          error: 'Invalid gameId parameter',
          gameId: gameId,
          timestamp: Date.now()
        },
        { 
          status: 400,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        }
      );
    }

    const gameIdNum = parseInt(gameId, 10);
    
    // Initialize SpacetimeDB connection
    await spacetimeClient.initialize();
    
    if (!spacetimeClient.isConfigured()) {
      return NextResponse.json(
        { 
          error: 'SpacetimeDB not configured',
          gameId: gameIdNum,
          timestamp: Date.now()
        },
        { 
          status: 503,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        }
      );
    }

    // Get all game sessions from SpacetimeDB
    const allSessions = spacetimeClient.getAllGameSessions();
    
    // Filter sessions by gameId using the new game_id field
    const gameSessions = allSessions.filter(session => {
      // Now we can properly filter by the game_id field that links to contract gameId
      return session.gameId === gameId;
    });

    if (gameSessions.length === 0) {
      return NextResponse.json(
        { 
          gameId: gameIdNum,
          rankings: [],
          timestamp: Date.now(),
          message: 'No game sessions found for this gameId'
        },
        { 
          status: 200,
          headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type',
          }
        }
      );
    }

    // Sort sessions by score (descending) to get rankings
    const sortedSessions = gameSessions
      .filter(session => session.score > 0) // Only include sessions with scores
      .sort((a, b) => b.score - a.score) // Sort by score descending
      .slice(0, 10); // Take top 10 players

    // Extract wallet addresses for rankings
    const rankings: string[] = [];
    
    for (const session of sortedSessions) {
      // Prioritize wallet_address for paid players, fallback to guest_id for trial players
      const playerAddress = session.walletAddress || session.guestId;
      
      if (playerAddress) {
        rankings.push(playerAddress);
      }
    }

    // Return the exact format expected by Chainlink Functions
    const response = {
      gameId: gameIdNum,
      rankings: rankings,
      timestamp: Date.now()
    };

    return NextResponse.json(response, {
      status: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
        'Expires': '0'
      }
    });

  } catch (error) {
    console.error('Error fetching game rankings:', error);
    
    const resolvedParams = await params;
    return NextResponse.json(
      { 
        error: 'Internal server error',
        gameId: parseInt(resolvedParams.gameId, 10),
        timestamp: Date.now(),
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { 
        status: 500,
        headers: {
          'Access-Control-Allow-Origin': '*',
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Allow-Headers': 'Content-Type',
        }
      }
    );
  }
}

// Handle CORS preflight requests
export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
