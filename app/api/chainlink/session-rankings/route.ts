import { NextRequest, NextResponse } from 'next/server';
import { createBasePublicClient } from '@/lib/blockchain/onChainScoreSync';
import { TRIVIA_ABI, TRIVIA_CONTRACT_ADDRESS } from '@/lib/blockchain/contracts';
import { getWeeklyScoresForPlayers } from '@/lib/game/weeklyScoresForPlayers';

/**
 * GET /api/chainlink/session-rankings
 *
 * Returns wallet addresses and scores for the current on-chain session.
 * Used by CRE weekly-prize-distribution to encode submitScores() without owner-key HTTP sync.
 */
export async function GET(request: NextRequest) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  };

  try {
    const publicClient = createBasePublicClient();
    const players = (await publicClient.readContract({
      address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
      abi: TRIVIA_ABI,
      functionName: 'getCurrentPlayers',
    })) as `0x${string}`[];

    const { sessionCounter, scores } = await getWeeklyScoresForPlayers(players);

    const rankings = scores
      .filter((entry) => entry.score > BigInt(0))
      .sort((a, b) => (a.score > b.score ? -1 : a.score < b.score ? 1 : 0))
      .map((entry) => ({
        address: entry.address,
        score: Number(entry.score),
      }));

    return NextResponse.json(
      {
        sessionCounter,
        players: rankings,
        rankings: rankings.map((entry) => entry.address),
        timestamp: Date.now(),
      },
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
        },
      },
    );
  } catch (error) {
    console.error('Error fetching session rankings:', error);
    return NextResponse.json(
      {
        error: 'Internal server error',
        details: error instanceof Error ? error.message : 'Unknown error',
        timestamp: Date.now(),
      },
      { status: 500, headers: corsHeaders },
    );
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}
