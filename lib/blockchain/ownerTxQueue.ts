import type { Hash } from 'viem';

type TxTask = () => Promise<Hash>;

/** Serializes owner-key writes within this runtime to reduce nonce collisions. */
let txChain: Promise<unknown> = Promise.resolve();

const NONCE_ERROR_PATTERN =
  /nonce too low|replacement transaction underpriced|already known|nonce has already been used/i;

const MAX_RETRIES = 3;

const isNonceError = (error: unknown): boolean => {
  const message = error instanceof Error ? error.message : String(error);
  return NONCE_ERROR_PATTERN.test(message);
};

/**
 * Enqueue a contract write so only one owner-key transaction runs at a time.
 * Retries on nonce conflicts (common under concurrent serverless invocations).
 */
export const enqueueOwnerTx = (task: TxTask): Promise<Hash> => {
  const run = async (): Promise<Hash> => {
    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        return await task();
      } catch (error) {
        if (!isNonceError(error) || attempt === MAX_RETRIES - 1) {
          throw error;
        }
        await new Promise((resolve) => setTimeout(resolve, 300 * (attempt + 1)));
      }
    }
    throw new Error('enqueueOwnerTx: exhausted retries');
  };

  const result = txChain.then(run, run);
  txChain = result.catch(() => undefined);
  return result;
};
