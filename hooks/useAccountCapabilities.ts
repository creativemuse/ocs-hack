import { useMemo } from 'react';
import { useAccount, useCapabilities, useChainId } from 'wagmi';

interface AccountCapabilities {
  paymasterService?: {
    url: string;
    supported: boolean;
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
      capabilitiesForChain?.['paymasterService'] &&
      capabilitiesForChain['paymasterService'].supported
    ) {
      return {
        paymasterService: {
          url: process.env.NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT || '',
          supported: true,
        },
      };
    }
    return {};
  }, [availableCapabilities, chainId]);

  return capabilities;
}
