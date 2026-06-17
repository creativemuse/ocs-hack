import { createPublicClient, http } from 'viem';
import { normalize } from 'viem/ens';
import { mainnet } from 'viem/chains';
import { getBasenameWithFallback } from '@/lib/base-account/basenameServer';

const getMainnetClient = () => {
  const rpcUrl =
    process.env.MAINNET_RPC_URL?.trim() ??
    (process.env.ALCHEMY_API_KEY
      ? `https://eth-mainnet.g.alchemy.com/v2/${process.env.ALCHEMY_API_KEY}`
      : process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
        ? `https://eth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
        : 'https://eth.llamarpc.com');

  return createPublicClient({
    chain: mainnet,
    transport: http(rpcUrl),
  });
};

export type BaseProfile = {
  basename: string | null;
  avatarUrl: string | null;
};

export const resolveBaseProfile = async (
  address: `0x${string}`,
  universalFallback?: `0x${string}` | string | null,
): Promise<BaseProfile> => {
  const basename = await getBasenameWithFallback(address, universalFallback);
  if (!basename) {
    return { basename: null, avatarUrl: null };
  }

  try {
    const client = getMainnetClient();
    const avatarUrl = await client.getEnsAvatar({
      name: normalize(basename),
    });
    return {
      basename,
      avatarUrl: avatarUrl ?? null,
    };
  } catch {
    return { basename, avatarUrl: null };
  }
};

export const formatWalletAddress = (address: string): string => {
  if (address.length < 10) {
    return address;
  }
  return `${address.slice(0, 6)}...${address.slice(-4)}`;
};
