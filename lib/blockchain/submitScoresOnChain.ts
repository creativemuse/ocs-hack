import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { TRIVIA_ABI, TRIVIA_CONTRACT_ADDRESS } from '@/lib/blockchain/contracts';
import { enqueueOwnerTx } from '@/lib/blockchain/ownerTxQueue';
import { resolveBaseRpcUrl } from '@/lib/blockchain/baseRpc';

const getOwnerKey = (): string | undefined =>
  process.env.CONTRACT_OWNER_PRIVATE_KEY || process.env.PRIVATE_KEY;

export const submitScoresOnChain = async (
  addresses: `0x${string}`[],
  scores: bigint[],
  sessionId?: bigint
): Promise<string | null> => {
  const ownerKey = getOwnerKey();
  if (!ownerKey || addresses.length === 0) {
    return null;
  }

  const rpcUrl = resolveBaseRpcUrl();
  const publicClient = createPublicClient({ chain: base, transport: http(rpcUrl) });

  // If a specific session is provided (v5 per-session), validate it exists.
  // Otherwise fall back to the legacy live-session path.
  if (sessionId !== undefined) {
    try {
      const sessionInfo = await publicClient.readContract({
        address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
        abi: TRIVIA_ABI,
        functionName: 'getSessionInfo',
        args: [sessionId],
      });
      // sessionInfo: [isActive, distributed, startTime, endTime, prizePool, playerCount]
      const distributed = sessionInfo[1] as boolean;
      if (distributed) {
        console.warn(`submitScoresOnChain: session ${sessionId} already distributed, skipping`);
        return null;
      }
    } catch {
      // getSessionInfo not available (old contract?) — fall through to legacy path
    }
  }

  const account = privateKeyToAccount(ownerKey as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http(rpcUrl),
  });

  const functionName = sessionId !== undefined ? 'submitScoresForSession' : 'submitScores';
  const args = sessionId !== undefined ? [sessionId, addresses, scores] : [addresses, scores];

  const hash = await enqueueOwnerTx(() =>
    walletClient.writeContract({
      address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
      abi: TRIVIA_ABI,
      functionName,
      args,
    } as Parameters<typeof walletClient.writeContract>[0])
  );

  return hash;
};

/** Non-blocking on-chain sync — errors are logged, not thrown. */
export const submitScoresOnChainAsync = (
  addresses: `0x${string}`[],
  scores: bigint[]
): void => {
  void submitScoresOnChain(addresses, scores).catch((error) => {
    console.error('Warning: on-chain score submission failed (non-fatal):', error);
  });
};
