import { NextRequest, NextResponse } from 'next/server';
import { spacetimeClient } from '@/lib/apis/spacetime';
import { verifyEntryToken } from '@/lib/utils/jwt';
import { finalizePaidScoreLedger } from '@/lib/game/paidScoreLedger';
import { submitOnChainScore } from '@/lib/blockchain/submitOnChainScore';

const MAX_GAME_SCORE = 3000;

/** Only persist real basenames — not truncated wallet addresses. */
const normalizeUsername = (username?: string): string | undefined => {
  if (!username?.trim()) return undefined;
  const trimmed = username.trim();
  if (trimmed.includes('...')) return undefined;
  return trimmed;
};

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
    const displayUsername = normalizeUsername(username);

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
    let spacetimeUpdated = false;

    await spacetimeClient.ensurePlayerDataReady();

    if (spacetimeClient.isConfigured()) {
      await spacetimeClient.recordPaidGameScore(
        normalizedWallet,
        authoritativeScore,
        displayUsername,
      );
      spacetimeUpdated = true;

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
      console.warn('On-chain score submission failed:', onChainResult.error);
      return NextResponse.json(
        {
          success: true,
          authoritativeScore,
          onChainSessionId: finalized.onChainSessionId,
          spacetimeUpdated,
          onChainSubmitted: false,
          onChainError: onChainResult.error,
          warning:
            'Score saved but the weekly leaderboard update failed. Your score may not appear until retried.',
        },
        { status: 202 },
      );
    }

    return NextResponse.json({
      success: true,
      authoritativeScore,
      onChainSessionId: finalized.onChainSessionId,
      spacetimeUpdated,
      onChainSubmitted: true,
      transactionHash: onChainResult.transactionHash,
      sessionCounter: onChainResult.sessionCounter.toString(),
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
