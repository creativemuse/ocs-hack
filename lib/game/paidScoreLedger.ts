/**
 * Server-authoritative paid game scores keyed by entry JWT `entryId`.
 * Points accumulate only via /api/verify-answer with a valid paid entry token.
 */

type LedgerEntry = {
  entryId: string;
  walletAddress: string;
  onChainSessionId: string;
  paidTxHash?: string;
  totalScore: number;
  answersVerified: number;
  createdAt: number;
  updatedAt: number;
  finalized: boolean;
};

const ledger = new Map<string, LedgerEntry>();

const LEDGER_TTL_MS = 3 * 60 * 60 * 1000; // 3 hours

const pruneExpired = (): void => {
  const now = Date.now();
  for (const [key, entry] of ledger.entries()) {
    if (now - entry.updatedAt > LEDGER_TTL_MS) {
      ledger.delete(key);
    }
  }
};

export const initPaidScoreLedger = (params: {
  entryId: string;
  walletAddress: string;
  onChainSessionId: string;
  paidTxHash?: string;
}): void => {
  pruneExpired();
  ledger.set(params.entryId, {
    entryId: params.entryId,
    walletAddress: params.walletAddress.toLowerCase(),
    onChainSessionId: params.onChainSessionId,
    paidTxHash: params.paidTxHash,
    totalScore: 0,
    answersVerified: 0,
    createdAt: Date.now(),
    updatedAt: Date.now(),
    finalized: false,
  });
};

export const addVerifiedAnswerScore = (
  entryId: string,
  walletAddress: string,
  pointsEarned: number
): { ok: true; totalScore: number } | { ok: false; error: string } => {
  pruneExpired();
  const entry = ledger.get(entryId);
  if (!entry) {
    return { ok: false, error: 'No active paid game session for this entry' };
  }
  if (entry.finalized) {
    return { ok: false, error: 'This paid game entry is already finalized' };
  }
  if (entry.walletAddress !== walletAddress.toLowerCase()) {
    return { ok: false, error: 'Wallet does not match paid entry' };
  }
  if (pointsEarned < 0 || !Number.isFinite(pointsEarned)) {
    return { ok: false, error: 'Invalid points' };
  }

  entry.totalScore += pointsEarned;
  entry.answersVerified += 1;
  entry.updatedAt = Date.now();
  return { ok: true, totalScore: entry.totalScore };
};

export const finalizePaidScoreLedger = (
  entryId: string,
  walletAddress: string,
  clientFinalScore: number
): { ok: true; authoritativeScore: number; onChainSessionId: string } | { ok: false; error: string } => {
  pruneExpired();
  const entry = ledger.get(entryId);
  if (!entry) {
    return { ok: false, error: 'No active paid game session for this entry' };
  }
  if (entry.walletAddress !== walletAddress.toLowerCase()) {
    return { ok: false, error: 'Wallet does not match paid entry' };
  }
  if (entry.finalized) {
    return { ok: false, error: 'Score already submitted for this entry' };
  }
  if (entry.answersVerified === 0) {
    return { ok: false, error: 'No verified answers recorded for this game' };
  }
  if (clientFinalScore !== entry.totalScore) {
    return {
      ok: false,
      error: `Score mismatch: server total ${entry.totalScore}, client reported ${clientFinalScore}`,
    };
  }

  entry.finalized = true;
  entry.updatedAt = Date.now();
  return {
    ok: true,
    authoritativeScore: entry.totalScore,
    onChainSessionId: entry.onChainSessionId,
  };
};

export const getPaidScoreLedgerEntry = (entryId: string): LedgerEntry | undefined => {
  pruneExpired();
  return ledger.get(entryId);
};

/** Latest finalized score per wallet for an on-chain session (admin batch retry). */
export const getFinalizedScoresForOnChainSession = (
  onChainSessionId: string
): { walletAddress: string; score: number }[] => {
  pruneExpired();
  const byWallet = new Map<string, { score: number; updatedAt: number }>();

  for (const entry of ledger.values()) {
    if (!entry.finalized || entry.onChainSessionId !== onChainSessionId) continue;
    const prev = byWallet.get(entry.walletAddress);
    if (!prev || entry.updatedAt >= prev.updatedAt) {
      byWallet.set(entry.walletAddress, { score: entry.totalScore, updatedAt: entry.updatedAt });
    }
  }

  return [...byWallet.entries()].map(([walletAddress, { score }]) => ({
    walletAddress,
    score,
  }));
};
