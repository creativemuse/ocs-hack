import { createPublicClient, http, toCoinType, type PublicClient } from 'viem';
import { mainnet, base } from 'viem/chains';

import { getMainnetRpcUrl, hasMainnetRpc } from '@/lib/rpc/getMainnetRpcUrl';

let basenameClient: PublicClient | null = null;
let basenameRpcUrl: string | null = null;
let missingRpcWarned = false;

const getBasenameClient = (): PublicClient | null => {
  const rpcUrl = getMainnetRpcUrl();
  if (!rpcUrl) {
    if (!missingRpcWarned) {
      console.warn(
        '⚠️ Basename resolution skipped: set MAINNET_RPC_URL or ALCHEMY_API_KEY for L1 ENS lookups',
      );
      missingRpcWarned = true;
    }
    return null;
  }

  if (basenameClient && basenameRpcUrl === rpcUrl) {
    return basenameClient;
  }

  basenameRpcUrl = rpcUrl;
  basenameClient = createPublicClient({
    chain: mainnet,
    transport: http(rpcUrl),
  });
  return basenameClient;
};

export const getBasename = async (
  address: `0x${string}`,
): Promise<string | null> => {
  const client = getBasenameClient();
  if (!client) {
    return null;
  }

  try {
    return await client.getEnsName({
      address,
      coinType: toCoinType(base.id),
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    console.warn(`Failed to resolve basename for ${address}: ${message}`);
    return null;
  }
};

/** Basenames register on the universal Base Account; try sub-account then universal. */
export const getBasenameWithFallback = async (
  primaryAddress: `0x${string}`,
  universalFallback?: `0x${string}` | string | null,
): Promise<string | null> => {
  if (!hasMainnetRpc()) {
    getBasenameClient();
    return null;
  }

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
