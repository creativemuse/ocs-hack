import { NextRequest, NextResponse } from 'next/server';
import { withAdminAuth } from '@/lib/utils/adminAuthMiddleware';
import { spacetimeClient } from '@/lib/apis/spacetime';
import {
  batchSubmitOnChainScores,
  readOnChainSessionCounter,
} from '@/lib/blockchain/submitOnChainScore';
import { getFinalizedScoresForOnChainSession } from '@/lib/game/paidScoreLedger';

type ScoreRow = { walletAddress: string; score: number };

const mergeLatestScores = (rows: ScoreRow[]): ScoreRow[] => {
  const byWallet = new Map<string, number>();
  for (const row of rows) {
    if (!row.walletAddress || row.score <= 0) continue;
    const wallet = row.walletAddress.toLowerCase();
    const existing = byWallet.get(wallet);
    if (existing === undefined || row.score >= existing) {
      byWallet.set(wallet, row.score);
    }
  }
  return [...byWallet.entries()].map(([walletAddress, score]) => ({
    walletAddress,
    score,
  }));
};

const collectScoresFromSpacetime = (onChainSessionId: string): ScoreRow[] => {
  const sessions = spacetimeClient.getAllGameSessions();
  const matching = sessions.filter(
    (s) =>
      s.gameId === onChainSessionId &&
      s.walletAddress &&
      s.playerType?.tag === 'Paid' &&
      s.score > 0,
  );

  const byWallet = new Map<string, { score: number; startedAt: number }>();
  for (const session of matching) {
    const wallet = session.walletAddress!.toLowerCase();
    const startedAt = session.startedAt?.microsSinceUnixEpoch
      ? Number(session.startedAt.microsSinceUnixEpoch)
      : 0;
    const prev = byWallet.get(wallet);
    if (!prev || startedAt >= prev.startedAt) {
      byWallet.set(wallet, { score: session.score, startedAt });
    }
  }

  return [...byWallet.entries()].map(([walletAddress, { score }]) => ({
    walletAddress,
    score,
  }));
};

async function handler(req: NextRequest): Promise<NextResponse> {
  try {
    const body = await req.json().catch(() => ({}));
    const requestedSessionId =
      typeof body.onChainSessionId === 'string' && body.onChainSessionId.trim()
        ? body.onChainSessionId.trim()
        : typeof body.gameId === 'string' && body.gameId.trim()
          ? body.gameId.trim()
          : undefined;

    const onChainSessionId =
      requestedSessionId ?? (await readOnChainSessionCounter()).toString();

    await spacetimeClient.initialize();

    const ledgerScores = getFinalizedScoresForOnChainSession(onChainSessionId);
    const spacetimeScores = spacetimeClient.isConfigured()
      ? collectScoresFromSpacetime(onChainSessionId)
      : [];

    const merged = mergeLatestScores([...ledgerScores, ...spacetimeScores]);

    if (merged.length === 0) {
      return NextResponse.json(
        {
          error: 'No scores found for this on-chain session',
          onChainSessionId,
        },
        { status: 404 },
      );
    }

    const wallets = merged.map((r) => r.walletAddress);
    const scores = merged.map((r) => r.score);

    const result = await batchSubmitOnChainScores(wallets, scores, onChainSessionId);
    if (!result.ok) {
      return NextResponse.json(
        { error: result.error, onChainSessionId, playerCount: merged.length },
        { status: 502 },
      );
    }

    return NextResponse.json({
      success: true,
      onChainSessionId,
      playerCount: merged.length,
      transactionHash: result.transactionHash,
    });
  } catch (error) {
    console.error('admin submit-session-scores error:', error);
    return NextResponse.json(
      {
        error: 'Failed to batch submit scores',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}

export const POST = withAdminAuth(handler);
