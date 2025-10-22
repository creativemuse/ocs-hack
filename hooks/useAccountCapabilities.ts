import { useMemo } from 'react';
import { useAccount, useCapabilities, useChainId } from 'wagmi';

interface AccountCapabilities {
  paymasterService?: {
    url: string;
  };
}

export function useAccountCapabilities(): AccountCapabilities {
  const { address: account } = useAccount();
  const chainId = useChainId();

  // Check for paymaster capabilities with `useCapabilities`
  const { data: availableCapabilities } = useCapabilities({
    account,
  });

  const capabilities = useMemo(() => {
    if (!availableCapabilities) return {};
    const capabilitiesForChain = availableCapabilities[chainId];
    if (
      capabilitiesForChain['paymasterService'] &&
      capabilitiesForChain['paymasterService'].supported
    ) {
      return {
        paymasterService: {
          url: `https://api.developer.coinbase.com/rpc/v1/base/${process.env.NEXT_PUBLIC_ONCHAINKIT_API_KEY}`, // For production use proxy
        },
      };
    }
    return {};
  }, [availableCapabilities, chainId]);

  return capabilities;
}
