import { submitOnChainScoreWithRetry } from '@/lib/blockchain/submitOnChainScore';

const MAX_BACKGROUND_ATTEMPTS = 4;
const BACKOFF_MS = [3000, 8000, 15000, 30000];

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

export type PendingOnChainScoreParams = {
  walletAddress: string;
  score: number;
  sessionId?: string;
};

/**
 * Fire-and-forget retries after save-paid-score returns 202.
 * Runs in the API route process; does not block the HTTP response.
 */
export const schedulePendingOnChainScoreRetry = (params: PendingOnChainScoreParams): void => {
  void (async () => {
    for (let attempt = 0; attempt < MAX_BACKGROUND_ATTEMPTS; attempt++) {
      await sleep(BACKOFF_MS[attempt] ?? 30000);
      const result = await submitOnChainScoreWithRetry(
        params.walletAddress,
        params.score,
        params.sessionId,
      );
      if (result.ok) {
        console.info('[pendingOnChainScoreRetry] succeeded', {
          wallet: params.walletAddress,
          score: params.score,
          attempt: attempt + 1,
          tx: result.transactionHash,
        });
        return;
      }
      console.warn('[pendingOnChainScoreRetry] attempt failed', {
        wallet: params.walletAddress,
        score: params.score,
        attempt: attempt + 1,
        error: result.error,
      });
    }
    console.error('[pendingOnChainScoreRetry] exhausted retries', {
      wallet: params.walletAddress,
      score: params.score,
      sessionId: params.sessionId,
    });
  })();
};
