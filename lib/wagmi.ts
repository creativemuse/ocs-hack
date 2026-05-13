import { http, createConfig } from 'wagmi';
import { base, mainnet } from 'wagmi/chains';

const alchemyApiKey = process.env.NEXT_PUBLIC_ALCHEMY_API_KEY;

export const wagmiConfig = createConfig({
  chains: [base, mainnet],
  transports: {
    [base.id]: http(
      alchemyApiKey
        ? `https://base-mainnet.g.alchemy.com/v2/${alchemyApiKey}`
        : undefined
    ),
    [mainnet.id]: http(
      alchemyApiKey
        ? `https://eth-mainnet.g.alchemy.com/v2/${alchemyApiKey}`
        : undefined
    ),
  },
});
