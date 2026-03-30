import { useMemo } from 'react';
import { useAccount, useCapabilities, useChainId } from 'wagmi';

interface AccountCapabilities {
  paymasterService?: {
    url: string;
    supported: boolean;
  };
  atomicBatch?: {
    supported: boolean;
  };
  auxiliaryFunds?: {
    supported: boolean;
  };
}

export function useAccountCapabilities(): AccountCapabilities {
  const { address: account } = useAccount();
  const chainId = useChainId();

  // Check for capabilities with `useCapabilities`
  const { data: availableCapabilities } = useCapabilities({
    account,
  });

  const capabilities = useMemo(() => {
    if (!availableCapabilities) return {};
    const capabilitiesForChain = availableCapabilities[chainId];

    if (!capabilitiesForChain) return {};

    const result: AccountCapabilities = {};

    // 1. Paymaster Capability
    if (
      capabilitiesForChain['paymasterService'] &&
      capabilitiesForChain['paymasterService'].supported
    ) {
      result.paymasterService = {
        url: process.env.NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT || '',
        supported: true,
      };
    }

    // 2. Atomic Batch Capability
    if (
      capabilitiesForChain['atomicBatch'] &&
      capabilitiesForChain['atomicBatch'].supported
    ) {
      result.atomicBatch = {
        supported: true,
      };
    }

    // 3. Auxiliary Funds (MagicSpend) Capability
    if (
      capabilitiesForChain['auxiliaryFunds'] &&
      capabilitiesForChain['auxiliaryFunds'].supported
    ) {
      result.auxiliaryFunds = {
        supported: true,
      };
    }

    return result;
  }, [availableCapabilities, chainId]);

  return capabilities;
}
