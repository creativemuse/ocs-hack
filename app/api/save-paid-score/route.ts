import { NextRequest, NextResponse } from 'next/server';
import { callReducer } from '@/lib/apis/spacetimeHttp';
import { verifyEntryToken } from '@/lib/utils/jwt';
import { finalizePaidScoreLedger } from '@/lib/game/paidScoreLedger';
import { verifyScoreReceipt } from '@/lib/game/scoreReceipt';
import { submitOnChainScoreWithRetry, readOnChainSessionCounter } from '@/lib/blockchain/submitOnChainScore';
import { resolveAuthoritativeSessionId } from '@/lib/game/weeklyLeaderboard';

// On-chain score submission involves readContract + writeContract + waitForReceipt
// which can take 10-20s. Default Vercel timeout (10s on Hobby) kills the function
// before the transaction completes, causing silent on-chain submission failures.
export const maxDuration = 60;
export const runtime = 'nodejs';

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
    const { walletAddress, finalScore, username, entryToken, scoreReceipt } = body;

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

    let authoritativeScore = finalScore;
    let onChainSessionId = payload.onChainSessionId ?? '';

    if (!finalized.ok) {
      const receipt =
        typeof scoreReceipt === 'string' && scoreReceipt.trim()
          ? verifyScoreReceipt(scoreReceipt.trim(), payload.entryId, normalizedWallet)
          : null;

      if (!receipt || receipt.sc !== finalScore || receipt.av === 0) {
        return NextResponse.json(
          {
            error:
              finalized.error ??
              'Score could not be verified. Play through at least one verified answer.',
          },
          { status: 400 },
        );
      }

      authoritativeScore = receipt.sc;
      onChainSessionId = receipt.ocs || onChainSessionId;
    } else {
      authoritativeScore = finalized.authoritativeScore;
      onChainSessionId = finalized.onChainSessionId;
    }

    let liveSessionCounter = 0;
    try {
      liveSessionCounter = Number(await readOnChainSessionCounter());
    } catch (rpcErr) {
      console.warn(
        'Could not read live sessionCounter; falling back to entry token session id:',
        rpcErr,
      );
    }
    const authoritativeSessionId = resolveAuthoritativeSessionId(
      onChainSessionId,
      liveSessionCounter,
    );
    onChainSessionId = authoritativeSessionId;

    let spacetimeUpdated = false;
    let spacetimeError: string | undefined;
    let onChainResult:
      | { ok: true; transactionHash: `0x${string}`; sessionCounter: bigint }
      | { ok: false; error: string }
      | undefined;

    const isSpacetimeConfigured = Boolean(
      process.env.SPACETIME_HOST || process.env.NEXT_PUBLIC_SPACETIME_HOST,
    ) && Boolean(
      process.env.SPACETIME_DATABASE ||
        process.env.NEXT_PUBLIC_SPACETIME_DATABASE ||
        process.env.SPACETIME_MODULE ||
        process.env.NEXT_PUBLIC_SPACETIME_MODULE,
    );

    try {
      if (isSpacetimeConfigured) {
        const sessionIdNumeric = onChainSessionId
          ? Number(onChainSessionId)
          : 0;
        await callReducer('record_paid_game_score', {
          walletAddress: normalizedWallet,
          gameScore: authoritativeScore,
          onChainSessionId: sessionIdNumeric,
          username: displayUsername,
        });
        spacetimeUpdated = true;

        try {
          await callReducer('end_game_session', { sessionId: payload.entryId });
        } catch (endErr) {
          console.warn('Spacetime endGameSession failed (non-fatal):', endErr);
        }
      } else {
        spacetimeError = 'SpacetimeDB is not configured; leaderboard update deferred.';
      }
    } catch (spacetimeErr) {
      console.error('❌ SpacetimeDB paid score update failed:', spacetimeErr);
      spacetimeError =
        spacetimeErr instanceof Error ? spacetimeErr.message : 'SpacetimeDB leaderboard update failed';
    }

    // Attempt on-chain score submission. A failure here is non-fatal if
    // SpacetimeDB already has the score, but we want to know the result
    // before telling the client whether the leaderboard is ready.
    try {
      onChainResult = await submitOnChainScoreWithRetry(
        normalizedWallet,
        authoritativeScore,
        onChainSessionId,
      );
    } catch (onChainErr) {
      console.warn('On-chain score submission threw (non-fatal):', onChainErr);
      onChainResult = {
        ok: false,
        error: onChainErr instanceof Error ? onChainErr.message : String(onChainErr),
      };
    }

    // Leaderboard is ready if EITHER source has the score:
    // - SpacetimeDB (real-time cache) OR
    // - On-chain (authoritative, read by fetchWeeklyScoresFromChain)
    const leaderboardReady = spacetimeUpdated || Boolean(onChainResult?.ok);

    if (!onChainResult || !onChainResult.ok) {
      const onChainError = onChainResult?.error;
      console.warn('On-chain score submission failed (non-fatal):', {
        wallet: normalizedWallet,
        score: authoritativeScore,
        sessionId: onChainSessionId,
        error: onChainError,
      });

      // Surface a warning to the client. If SpacetimeDB also failed, the score
      // is not visible anywhere — return failure so the client knows.
      return NextResponse.json({
        success: spacetimeUpdated,
        authoritativeScore,
        onChainSessionId,
        spacetimeUpdated,
        onChainSubmitted: false,
        leaderboardReady,
        onChainError,
        spacetimeError,
        warning: spacetimeUpdated
          ? 'Score saved to the leaderboard. On-chain sync will be retried.'
          : 'Score could not be saved to the leaderboard. Please try again or contact support.',
      }, {
        status: spacetimeUpdated ? 200 : 500,
      });
    }

    return NextResponse.json({
      success: true,
      authoritativeScore,
      onChainSessionId,
      spacetimeUpdated,
      onChainSubmitted: true,
      leaderboardReady,
      transactionHash: onChainResult.transactionHash,
      sessionCounter: onChainResult.sessionCounter.toString(),
      spacetimeError,
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
