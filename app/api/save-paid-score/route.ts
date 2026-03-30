import { NextRequest, NextResponse } from 'next/server';
import { spacetimeClient } from '@/lib/apis/spacetime';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress, finalScore, username } = body;

    if (!walletAddress || typeof walletAddress !== 'string' || walletAddress.trim() === '') {
      return NextResponse.json(
        { error: 'walletAddress is required' },
        { status: 400 }
      );
    }

    if (typeof finalScore !== 'number' || finalScore < 0 || !Number.isFinite(finalScore)) {
      return NextResponse.json(
        { error: 'finalScore must be a non-negative number' },
        { status: 400 }
      );
    }

    await spacetimeClient.initialize();

    if (!spacetimeClient.isConfigured()) {
      return NextResponse.json(
        { error: 'SpacetimeDB not configured' },
        { status: 503 }
      );
    }

    const current = spacetimeClient.getPlayerProfile(walletAddress);

    if (!current) {
      await spacetimeClient.createPlayer(walletAddress, username);
    }

    const existing = spacetimeClient.getPlayerProfile(walletAddress);
    const totalScore = (existing?.totalScore ?? 0) + finalScore;
    const gamesPlayed = (existing?.gamesPlayed ?? 0) + 1;
    const bestScore = Math.max(existing?.bestScore ?? 0, finalScore);
    const totalEarnings = existing?.totalEarnings ?? 0;

    await spacetimeClient.updatePlayerStats(
      walletAddress,
      totalScore,
      gamesPlayed,
      bestScore,
      totalEarnings
    );

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error saving paid score:', error);
    return NextResponse.json(
      {
        error: 'Failed to save score',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
