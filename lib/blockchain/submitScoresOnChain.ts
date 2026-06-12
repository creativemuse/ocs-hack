import { createPublicClient, createWalletClient, http } from 'viem';
import { privateKeyToAccount } from 'viem/accounts';
import { base } from 'viem/chains';
import { TRIVIA_ABI, TRIVIA_CONTRACT_ADDRESS } from '@/lib/blockchain/contracts';
import { enqueueOwnerTx } from '@/lib/blockchain/ownerTxQueue';

const BASE_RPC = process.env.BASE_RPC_URL || 'https://mainnet.base.org';

const getOwnerKey = (): string | undefined =>
  process.env.CONTRACT_OWNER_PRIVATE_KEY || process.env.PRIVATE_KEY;

export const submitScoresOnChain = async (
  addresses: `0x${string}`[],
  scores: bigint[]
): Promise<string | null> => {
  const ownerKey = getOwnerKey();
  if (!ownerKey || addresses.length === 0) {
    return null;
  }

  const publicClient = createPublicClient({ chain: base, transport: http(BASE_RPC) });

  const isActive = await publicClient.readContract({
    address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
    abi: TRIVIA_ABI,
    functionName: 'isSessionActive',
  });

  if (!isActive) {
    return null;
  }

  const account = privateKeyToAccount(ownerKey as `0x${string}`);
  const walletClient = createWalletClient({
    account,
    chain: base,
    transport: http(BASE_RPC),
  });

  const hash = await enqueueOwnerTx(() =>
    walletClient.writeContract({
      address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
      abi: TRIVIA_ABI,
      functionName: 'submitScores',
      args: [addresses, scores],
    })
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
