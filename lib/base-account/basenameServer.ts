import { createPublicClient, http, toCoinType } from 'viem';
import { mainnet, base } from 'viem/chains';

/** Server-only mainnet RPC — never call from browser (CORS). */
const getMainnetRpcUrl = (): string => {
  if (process.env.MAINNET_RPC_URL?.trim()) {
    return process.env.MAINNET_RPC_URL.trim();
  }
  const serverAlchemy = process.env.ALCHEMY_API_KEY?.trim();
  if (serverAlchemy) {
    return `https://eth-mainnet.g.alchemy.com/v2/${serverAlchemy}`;
  }
  const publicAlchemy = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY?.trim();
  if (publicAlchemy) {
    return `https://eth-mainnet.g.alchemy.com/v2/${publicAlchemy}`;
  }
  return 'https://eth.llamarpc.com';
};

const createBasenameClient = () =>
  createPublicClient({
    chain: mainnet,
    transport: http(getMainnetRpcUrl()),
  });

export const getBasename = async (
  address: `0x${string}`,
): Promise<string | null> => {
  try {
    const client = createBasenameClient();
    return await client.getEnsName({
      address,
      coinType: toCoinType(base.id),
    });
  } catch (error) {
    console.error('Failed to resolve basename:', error);
    return null;
  }
};

/** Basenames register on the universal Base Account; try sub-account then universal. */
export const getBasenameWithFallback = async (
  primaryAddress: `0x${string}`,
  universalFallback?: `0x${string}` | string | null,
): Promise<string | null> => {
  const primaryName = await getBasename(primaryAddress);
  if (primaryName) {
    return primaryName;
  }

  const fallback = universalFallback?.trim().toLowerCase() as `0x${string}` | undefined;
  if (!fallback || fallback === primaryAddress.toLowerCase()) {
    return null;
  }

  return getBasename(fallback);
};
