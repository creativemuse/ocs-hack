import { createPublicClient, http, toCoinType } from 'viem';
import { mainnet, base } from 'viem/chains';

// ENSIP-19 reverse resolution for Base names uses the L1 Universal Resolver with
// coinType for Base — see https://docs.base.org/base-account/framework-integrations/wagmi/basenames
const mainnetRpc = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY
  ? `https://eth-mainnet.g.alchemy.com/v2/${process.env.NEXT_PUBLIC_ALCHEMY_API_KEY}`
  : 'https://eth.llamarpc.com';

const basenameClient = createPublicClient({
  chain: mainnet,
  transport: http(mainnetRpc),
});

export const getBasename = async (
  address: `0x${string}`
): Promise<string | null> => {
  try {
    return await basenameClient.getEnsName({
      address,
      coinType: toCoinType(base.id),
    });
  } catch (error) {
    console.error('Failed to resolve basename:', error);
    return null;
  }
};
