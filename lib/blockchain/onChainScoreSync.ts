import { createPublicClient, http, type PublicClient } from 'viem';
import { base } from 'viem/chains';
import { TRIVIA_ABI, TRIVIA_CONTRACT_ADDRESS } from '@/lib/blockchain/contracts';
import { resolveBaseRpcUrl } from '@/lib/blockchain/baseRpc';

type ReadContractClient = Pick<PublicClient, 'readContract'>;

export type OnChainPlayerScore = {
  address: `0x${string}`;
  score: bigint;
};

export const createBasePublicClient = () =>
  createPublicClient({ chain: base, transport: http(resolveBaseRpcUrl()) });

export type BasePublicClient = ReturnType<typeof createBasePublicClient>;

export const readOnChainPlayerScores = async (
  publicClient: ReadContractClient,
  players: readonly `0x${string}`[],
  sessionId?: bigint,
): Promise<OnChainPlayerScore[]> => {
  const contract = TRIVIA_CONTRACT_ADDRESS as `0x${string}`;
  const results: OnChainPlayerScore[] = [];

  for (const address of players) {
    const score = await publicClient.readContract({
      address: contract,
      abi: TRIVIA_ABI,
      functionName: sessionId !== undefined ? 'getPlayerScoreForSession' : 'getPlayerScore',
      args: sessionId !== undefined ? [sessionId, address] : [address],
    });
    results.push({ address, score: score as bigint });
  }

  return results;
};

/** True when every registered player has a non-zero on-chain score. */
export const hasNonZeroOnChainScores = (scores: readonly OnChainPlayerScore[]): boolean =>
  scores.length > 0 && scores.every((entry) => entry.score > BigInt(0));

/**
 * Idempotent guard for concurrent CRE DON nodes hitting the same admin endpoint.
 * Skips owner writes when scores are already present on-chain.
 */
export const scoresAlreadySyncedOnChain = async (
  publicClient: ReadContractClient,
  players: readonly `0x${string}`[],
  sessionId?: bigint,
): Promise<boolean> => {
  if (players.length === 0) {
    return true;
  }
  const onChain = await readOnChainPlayerScores(publicClient, players, sessionId);
  return hasNonZeroOnChainScores(onChain);
};

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

/** Poll until on-chain scores appear or timeout (used after a sync tx). */
export const waitForNonZeroOnChainScores = async (
  publicClient: ReadContractClient,
  players: readonly `0x${string}`[],
  options: { attempts?: number; delayMs?: number; sessionId?: bigint } = {},
): Promise<boolean> => {
  const attempts = options.attempts ?? 8;
  const delayMs = options.delayMs ?? 1500;
  const sessionId = options.sessionId;

  for (let attempt = 0; attempt < attempts; attempt++) {
    if (await scoresAlreadySyncedOnChain(publicClient, players, sessionId)) {
      return true;
    }
    if (attempt < attempts - 1) {
      await sleep(delayMs);
    }
  }

  return false;
};
