import { createPublicClient, createWalletClient, http } from 'viem';
import { base } from 'viem/chains';
import { privateKeyToAccount } from 'viem/accounts';
import { TRIVIA_CONTRACT_ADDRESS, TRIVIA_ABI } from '@/lib/blockchain/contracts';

const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
});

function getOwnerWalletClient() {
  const key = process.env.CONTRACT_OWNER_PRIVATE_KEY;
  if (!key) {
    throw new Error('CONTRACT_OWNER_PRIVATE_KEY is missing');
  }
  const account = privateKeyToAccount(key as `0x${string}`);
  return createWalletClient({
    account,
    chain: base,
    transport: http(process.env.BASE_RPC_URL || 'https://mainnet.base.org'),
  });
}

export type SubmitOnChainScoreResult =
  | { ok: true; transactionHash: `0x${string}`; sessionCounter: bigint }
  | { ok: false; error: string };

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

const isRetryableOnChainError = (error: string): boolean => {
  const lower = error.toLowerCase();
  return (
    lower.includes('timeout') ||
    lower.includes('rate limit') ||
    lower.includes('network') ||
    lower.includes('econnreset') ||
    lower.includes('nonce') ||
    lower.includes('replacement transaction underpriced')
  );
};

const INLINE_RETRY_DELAYS_MS = [0, 2000, 5000];

/**
 * Submit with inline retries on transient RPC / nonce failures.
 */
export async function submitOnChainScoreWithRetry(
  walletAddress: string,
  score: number,
  expectedSessionId?: string,
): Promise<SubmitOnChainScoreResult> {
  let lastError = 'Unknown error';

  for (let attempt = 0; attempt < INLINE_RETRY_DELAYS_MS.length; attempt++) {
    if (attempt > 0) {
      await sleep(INLINE_RETRY_DELAYS_MS[attempt] ?? 5000);
      console.warn('[submitOnChainScore] retrying after transient error:', lastError);
    }

    const result = await submitOnChainScore(walletAddress, score, expectedSessionId);
    if (result.ok) {
      return result;
    }

    lastError = result.error;
    if (!isRetryableOnChainError(result.error)) {
      console.warn('[submitOnChainScore] failed', {
        walletAddress,
        score,
        expectedSessionId,
        error: result.error,
      });
      return result;
    }
  }

  console.warn('[submitOnChainScore] inline retries exhausted', {
    walletAddress,
    score,
    expectedSessionId,
    error: lastError,
  });
  return { ok: false, error: lastError };
}

/**
 * Submit a player's latest score for the active on-chain session via owner wallet.
 */
export async function submitOnChainScore(
  walletAddress: string,
  score: number,
  expectedSessionId?: string
): Promise<SubmitOnChainScoreResult> {
  if (!walletAddress?.trim()) {
    return { ok: false, error: 'walletAddress is required' };
  }
  if (score < 0 || !Number.isFinite(score) || !Number.isInteger(score)) {
    return { ok: false, error: 'score must be a non-negative integer' };
  }

  const wallet = walletAddress.trim() as `0x${string}`;
  const contractAddress = TRIVIA_CONTRACT_ADDRESS as `0x${string}`;

  try {
    const [isActive, sessionCounter, players] = await Promise.all([
      publicClient.readContract({
        address: contractAddress,
        abi: TRIVIA_ABI,
        functionName: 'isSessionActive',
      }),
      publicClient.readContract({
        address: contractAddress,
        abi: TRIVIA_ABI,
        functionName: 'sessionCounter',
      }),
      publicClient.readContract({
        address: contractAddress,
        abi: TRIVIA_ABI,
        functionName: 'getCurrentPlayers',
      }),
    ]);

    if (!isActive) {
      return { ok: false, error: 'On-chain session is not active' };
    }

    if (expectedSessionId && sessionCounter.toString() !== expectedSessionId) {
      return {
        ok: false,
        error: `Session mismatch: expected ${expectedSessionId}, on-chain ${sessionCounter.toString()}`,
      };
    }

    const normalized = wallet.toLowerCase();
    const registered = (players as `0x${string}`[]).some(
      (p) => p.toLowerCase() === normalized
    );
    if (!registered) {
      return { ok: false, error: 'Wallet is not registered in the current on-chain session' };
    }

    const walletClient = getOwnerWalletClient();
    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi: TRIVIA_ABI,
      functionName: 'submitScores',
      args: [[wallet], [BigInt(score)]],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success') {
      return { ok: false, error: 'submitScores transaction failed' };
    }

    return { ok: true, transactionHash: hash, sessionCounter };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

export async function batchSubmitOnChainScores(
  wallets: string[],
  scores: number[],
  expectedSessionId?: string
): Promise<SubmitOnChainScoreResult> {
  if (wallets.length === 0 || wallets.length !== scores.length) {
    return { ok: false, error: 'wallet and score arrays must match and be non-empty' };
  }

  const contractAddress = TRIVIA_CONTRACT_ADDRESS as `0x${string}`;

  try {
    const [isActive, sessionCounter] = await Promise.all([
      publicClient.readContract({
        address: contractAddress,
        abi: TRIVIA_ABI,
        functionName: 'isSessionActive',
      }),
      publicClient.readContract({
        address: contractAddress,
        abi: TRIVIA_ABI,
        functionName: 'sessionCounter',
      }),
    ]);

    if (!isActive) {
      return { ok: false, error: 'On-chain session is not active' };
    }
    if (expectedSessionId && sessionCounter.toString() !== expectedSessionId) {
      return {
        ok: false,
        error: `Session mismatch: expected ${expectedSessionId}, on-chain ${sessionCounter.toString()}`,
      };
    }

    const walletClient = getOwnerWalletClient();
    const hash = await walletClient.writeContract({
      address: contractAddress,
      abi: TRIVIA_ABI,
      functionName: 'submitScores',
      args: [
        wallets as `0x${string}`[],
        scores.map((s) => BigInt(s)),
      ],
    });

    const receipt = await publicClient.waitForTransactionReceipt({ hash });
    if (receipt.status !== 'success') {
      return { ok: false, error: 'submitScores batch transaction failed' };
    }

    return { ok: true, transactionHash: hash, sessionCounter };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return { ok: false, error: message };
  }
}

export async function readOnChainSessionCounter(): Promise<bigint> {
  return publicClient.readContract({
    address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
    abi: TRIVIA_ABI,
    functionName: 'sessionCounter',
  });
}
