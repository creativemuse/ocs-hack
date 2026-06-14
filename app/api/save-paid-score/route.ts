import { NextRequest, NextResponse } from 'next/server';
import { spacetimeClient } from '@/lib/apis/spacetime';
import { verifyEntryToken } from '@/lib/utils/jwt';
import { finalizePaidScoreLedger } from '@/lib/game/paidScoreLedger';
import { submitOnChainScore } from '@/lib/blockchain/submitOnChainScore';

const MAX_GAME_SCORE = 3000;

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { walletAddress, finalScore, username, entryToken } = body;

    if (!entryToken || typeof entryToken !== 'string') {
      return NextResponse.json(
        { error: 'entryToken is required for paid score submission' },
        { status: 401 },
      );
    }

    const payload = verifyEntryToken(entryToken);
    if (!payload || payload.playerType !== 'paid') {
      return NextResponse.json(
        { error: 'Invalid or non-paid entry token' },
        { status: 401 },
      );
    }

    if (!walletAddress || typeof walletAddress !== 'string' || walletAddress.trim() === '') {
      return NextResponse.json(
        { error: 'walletAddress is required' },
        { status: 400 },
      );
    }

    const normalizedWallet = walletAddress.trim().toLowerCase();

    if (payload.identity.walletAddress?.toLowerCase() !== normalizedWallet) {
      return NextResponse.json(
        { error: 'Wallet address does not match entry token' },
        { status: 403 },
      );
    }

    if (typeof finalScore !== 'number' || finalScore < 0 || !Number.isFinite(finalScore)) {
      return NextResponse.json(
        { error: 'finalScore must be a non-negative number' },
        { status: 400 },
      );
    }

    if (finalScore > MAX_GAME_SCORE) {
      return NextResponse.json(
        { error: `finalScore exceeds maximum possible (${MAX_GAME_SCORE})` },
        { status: 400 },
      );
    }

    const finalized = finalizePaidScoreLedger(
      payload.entryId,
      normalizedWallet,
      finalScore,
    );
    if (!finalized.ok) {
      return NextResponse.json({ error: finalized.error }, { status: 400 });
    }

    const authoritativeScore = finalized.authoritativeScore;

    await spacetimeClient.ensurePlayerDataReady();

    if (spacetimeClient.isConfigured()) {
      const current = spacetimeClient.getPlayerProfile(normalizedWallet);
      if (!current) {
        await spacetimeClient.createPlayer(normalizedWallet, username);
      }

      const existing = spacetimeClient.getPlayerProfile(normalizedWallet);
      const totalScore = (existing?.totalScore ?? 0) + authoritativeScore;
      const gamesPlayed = (existing?.gamesPlayed ?? 0) + 1;
      const bestScore = Math.max(existing?.bestScore ?? 0, authoritativeScore);
      const totalEarnings = existing?.totalEarnings ?? 0;

      await spacetimeClient.updatePlayerStats(
        normalizedWallet,
        totalScore,
        gamesPlayed,
        bestScore,
        totalEarnings,
      );

      try {
        await spacetimeClient.endGameSession(payload.entryId);
      } catch (endErr) {
        console.warn('Spacetime endGameSession failed (non-fatal):', endErr);
      }
    }

    const onChainResult = await submitOnChainScore(
      normalizedWallet,
      authoritativeScore,
      finalized.onChainSessionId,
    );

    if (!onChainResult.ok) {
      return NextResponse.json(
        {
          error: 'Score verified but on-chain submission failed',
          details: onChainResult.error,
          authoritativeScore,
          onChainSessionId: finalized.onChainSessionId,
        },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      authoritativeScore,
      onChainSessionId: finalized.onChainSessionId,
      transactionHash: onChainResult.transactionHash,
    });
  } catch (error) {
    console.error('Error saving paid score:', error);
    return NextResponse.json(
      {
        error: 'Failed to save score',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
