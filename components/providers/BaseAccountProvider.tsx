'use client';

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react';
import type { ProviderInterface } from '@base-org/account';
import {
  getBaseAccountSDK,
  type BaseAccountSDKInstance,
} from '@/lib/base-account/sdk';

interface BaseAccountContextValue {
  sdk: BaseAccountSDKInstance | null;
  provider: ProviderInterface | null;
  isReady: boolean;
}

const BaseAccountContext = createContext<BaseAccountContextValue>({
  sdk: null,
  provider: null,
  isReady: false,
});

export const useBaseAccountContext = (): BaseAccountContextValue => {
  return useContext(BaseAccountContext);
};

export const BaseAccountProvider = ({ children }: { children: ReactNode }) => {
  const [sdk, setSdk] = useState<BaseAccountSDKInstance | null>(null);
  const [provider, setProvider] = useState<ProviderInterface | null>(null);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    try {
      const instance = getBaseAccountSDK();
      setSdk(instance);
      setProvider(instance.getProvider());
    } catch (error) {
      console.error('Failed to initialize Base Account SDK:', error);
    }
  }, []);

  const value = useMemo(
    () => ({
      sdk,
      provider,
      isReady: !!sdk && !!provider,
    }),
    [sdk, provider]
  );

  return (
    <BaseAccountContext.Provider value={value}>
      {children}
    </BaseAccountContext.Provider>
  );
};
