import crypto from 'crypto';

/**
 * HMAC-signed cumulative score receipt for paid games.
 * Survives serverless cold starts where the in-memory paidScoreLedger is empty.
 */

export type ScoreReceiptPayload = {
  /** entryId from JWT */
  eid: string;
  /** wallet address (lowercase) */
  wal: string;
  /** cumulative score */
  sc: number;
  /** verified answer count */
  av: number;
  /** on-chain session id */
  ocs: string;
  /** issued at ms */
  iat: number;
};

const RECEIPT_TTL_MS = 3 * 60 * 60 * 1000;

function getSecret(): Buffer {
  const secret = process.env.ENTRY_TOKEN_SECRET;
  if (!secret) {
    throw new Error('ENTRY_TOKEN_SECRET is required for score receipts');
  }
  return Buffer.from(secret);
}

function hmacSign(payload: string): string {
  return crypto.createHmac('sha256', getSecret()).update(payload).digest('base64url');
}

export const signScoreReceipt = (payload: ScoreReceiptPayload): string => {
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = hmacSign(payloadStr);
  return `${payloadStr}.${sig}`;
};

export const verifyScoreReceipt = (
  token: string,
  entryId: string,
  walletAddress: string,
): ScoreReceiptPayload | null => {
  try {
    const dotIdx = token.lastIndexOf('.');
    if (dotIdx === -1) return null;

    const payloadStr = token.slice(0, dotIdx);
    const sig = token.slice(dotIdx + 1);
    if (hmacSign(payloadStr) !== sig) return null;

    const payload = JSON.parse(
      Buffer.from(payloadStr, 'base64url').toString(),
    ) as ScoreReceiptPayload;

    const wallet = walletAddress.trim().toLowerCase();
    if (payload.eid !== entryId || payload.wal !== wallet) return null;
    if (payload.sc < 0 || payload.av < 0 || !Number.isFinite(payload.sc)) return null;

    const elapsedMs = Date.now() - payload.iat;
    if (elapsedMs > RECEIPT_TTL_MS || elapsedMs < 0) return null;

    return payload;
  } catch {
    return null;
  }
};

export const advancePaidScore = (params: {
  entryId: string;
  walletAddress: string;
  onChainSessionId: string;
  pointsEarned: number;
  previousReceipt?: string | null;
  ledgerTotalScore?: number;
  ledgerAnswersVerified?: number;
}): { totalScore: number; answersVerified: number; receipt: string } => {
  const wallet = params.walletAddress.trim().toLowerCase();
  let baseScore = 0;
  let baseAnswers = 0;

  if (params.previousReceipt) {
    const verified = verifyScoreReceipt(params.previousReceipt, params.entryId, wallet);
    if (verified) {
      baseScore = verified.sc;
      baseAnswers = verified.av;
    }
  } else if (
    typeof params.ledgerTotalScore === 'number' &&
    typeof params.ledgerAnswersVerified === 'number'
  ) {
    baseScore = params.ledgerTotalScore;
    baseAnswers = params.ledgerAnswersVerified;
  }

  const totalScore = baseScore + params.pointsEarned;
  const answersVerified = baseAnswers + 1;
  const receipt = signScoreReceipt({
    eid: params.entryId,
    wal: wallet,
    sc: totalScore,
    av: answersVerified,
    ocs: params.onChainSessionId,
    iat: Date.now(),
  });

  return { totalScore, answersVerified, receipt };
};
