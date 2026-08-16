import { NextRequest, NextResponse } from 'next/server';
import { spacetimeClient } from '@/lib/apis/spacetime';
import { readOnChainSessionCounter } from '@/lib/blockchain/submitOnChainScore';

/**
 * Chainlink Functions API Endpoint for Game Rankings
 *
 * `gameId` is the on-chain TriviaBattle `sessionCounter` (weekly session id).
 * Returns wallet addresses sorted by latest paid score for that session.
 */

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Methods': 'GET, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
  };

  try {
    const { gameId } = await params;

    if (!gameId || !/^\d+$/.test(gameId)) {
      return NextResponse.json(
        {
          error: 'Invalid gameId — expected on-chain sessionCounter (numeric string)',
          gameId,
          timestamp: Date.now(),
        },
        { status: 400, headers: corsHeaders },
      );
    }

    const gameIdNum = parseInt(gameId, 10);

    await spacetimeClient.initialize();

    if (!spacetimeClient.isConfigured()) {
      return NextResponse.json(
        {
          error: 'SpacetimeDB not configured',
          gameId: gameIdNum,
          timestamp: Date.now(),
        },
        { status: 503, headers: corsHeaders },
      );
    }

    let currentCounter: string | null = null;
    try {
      currentCounter = (await readOnChainSessionCounter()).toString();
    } catch {
      // Non-fatal — rankings still returned for requested gameId
    }

    const allSessions = spacetimeClient.getAllGameSessions();
    const gameSessions = allSessions.filter(
      (session) =>
        session.gameId === gameId &&
        session.walletAddress &&
        session.playerType?.tag === 'Paid',
    );

    if (gameSessions.length === 0) {
      return NextResponse.json(
        {
          gameId: gameIdNum,
          rankings: [],
          timestamp: Date.now(),
          currentSessionCounter: currentCounter,
          message: 'No paid game sessions found for this on-chain session id',
        },
        {
          status: 200,
          headers: {
            ...corsHeaders,
            'Cache-Control': 'no-cache, no-store, must-revalidate',
          },
        },
      );
    }

    const latestByWallet = new Map<string, { score: number; startedAt: number }>();

    for (const session of gameSessions) {
      const wallet = session.walletAddress!.toLowerCase();
      const startedAt = session.startedAt?.microsSinceUnixEpoch
        ? Number(session.startedAt.microsSinceUnixEpoch)
        : 0;
      const prev = latestByWallet.get(wallet);
      if (!prev || startedAt >= prev.startedAt) {
        latestByWallet.set(wallet, { score: session.score, startedAt });
      }
    }

    const rankings = [...latestByWallet.entries()]
      .filter(([, data]) => data.score > 0)
      .sort((a, b) => b[1].score - a[1].score)
      .slice(0, 10)
      .map(([wallet]) => wallet);

    return NextResponse.json(
      {
        gameId: gameIdNum,
        rankings,
        timestamp: Date.now(),
        currentSessionCounter: currentCounter,
      },
      {
        status: 200,
        headers: {
          ...corsHeaders,
          'Cache-Control': 'no-cache, no-store, must-revalidate',
          Pragma: 'no-cache',
          Expires: '0',
        },
      },
    );
  } catch (error) {
    console.error('Error fetching game rankings:', error);

    const resolvedParams = await params;
    return NextResponse.json(
      {
        error: 'Internal server error',
        gameId: parseInt(resolvedParams.gameId, 10),
        timestamp: Date.now(),
        details: error instanceof Error ? error.message : 'Unknown error',
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
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
