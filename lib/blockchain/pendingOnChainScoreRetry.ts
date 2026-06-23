import { submitOnChainScoreWithRetry } from '@/lib/blockchain/submitOnChainScore';

const EXTENDED_RETRY_DELAYS_MS = [2000, 5000, 10000];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type PendingOnChainScoreParams = {
  walletAddress: string;
  score: number;
  sessionId?: string;
};

/**
 * Synchronous extended retries before save-paid-score returns 202.
 * Safe for serverless — work completes within the request lifecycle.
 */
export const retryOnChainScoreBeforeResponse = async (
  params: PendingOnChainScoreParams,
): Promise<{ ok: true; transactionHash: `0x${string}` } | { ok: false; error: string }> => {
  let lastError = 'Unknown error';

  for (const delayMs of EXTENDED_RETRY_DELAYS_MS) {
    await sleep(delayMs);
    const result = await submitOnChainScoreWithRetry(
      params.walletAddress,
      params.score,
      params.sessionId,
    );
    if (result.ok) {
      console.info('[retryOnChainScoreBeforeResponse] succeeded', {
        wallet: params.walletAddress,
        score: params.score,
        tx: result.transactionHash,
      });
      return { ok: true, transactionHash: result.transactionHash };
    }
    lastError = result.error;
    console.warn('[retryOnChainScoreBeforeResponse] attempt failed', {
      wallet: params.walletAddress,
      score: params.score,
      error: result.error,
    });
  }

  return { ok: false, error: lastError };
};
