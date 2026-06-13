'use client';

import { useState, useEffect, useCallback } from 'react';
import { base } from 'viem/chains';
import { useBaseAccountContext } from '@/components/providers/BaseAccountProvider';
import {
  connectSubAccountAddresses,
  resolveSubAccountAddresses,
} from '@/lib/base-account/subAccount';

export interface BaseAccountState {
  address: string | null;
  subAccountAddress: string | null;
  universalAddress: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  chainId: number | null;
  error: string | null;
}

export interface UseBaseAccountReturn extends BaseAccountState {
  connect: () => Promise<void>;
  disconnect: () => void;
  signMessage: (message: string) => Promise<string>;
  sendTransaction: (to: string, value: string, data?: string) => Promise<string>;
  getProvider: () => ReturnType<typeof useBaseAccountContext>['provider'];
}

const disconnectedState: BaseAccountState = {
  address: null,
  subAccountAddress: null,
  universalAddress: null,
  isConnected: false,
  isConnecting: false,
  chainId: null,
  error: null,
};

export const useBaseAccount = (): UseBaseAccountReturn => {
  const { provider } = useBaseAccountContext();
  const [state, setState] = useState<BaseAccountState>(disconnectedState);

  const getProvider = useCallback(() => provider, [provider]);

  const applyAddresses = useCallback(
    (universalAddress: string, subAccountAddress: string) => {
      setState({
        address: subAccountAddress,
        subAccountAddress,
        universalAddress,
        isConnected: true,
        isConnecting: false,
        chainId: base.id,
        error: null,
      });
    },
    []
  );

  const connect = useCallback(async () => {
    if (!provider) {
      setState((prev) => ({ ...prev, error: 'Provider not ready' }));
      return;
    }

    setState((prev) => ({ ...prev, isConnecting: true, error: null }));

    try {
      const { universalAddress, subAccountAddress } =
        await connectSubAccountAddresses(provider);
      applyAddresses(universalAddress, subAccountAddress);
    } catch (error) {
      console.error('Base Account connection failed:', error);
      setState((prev) => ({
        ...prev,
        isConnecting: false,
        error:
          error instanceof Error
            ? error.message
            : 'Failed to connect to Base Account',
      }));
    }
  }, [applyAddresses, provider]);

  const disconnect = useCallback(() => {
    setState(disconnectedState);
  }, []);

  const signMessage = useCallback(
    async (message: string): Promise<string> => {
      if (!state.address || !provider) {
        throw new Error('No account connected or provider not ready');
      }

      const signature = (await provider.request({
        method: 'personal_sign',
        params: [message, state.address],
      })) as string;

      return signature;
    },
    [provider, state.address]
  );

  const sendTransaction = useCallback(
    async (to: string, value: string, data?: string): Promise<string> => {
      if (!state.address || !provider) {
        throw new Error('No account connected or provider not ready');
      }

      const txHash = (await provider.request({
        method: 'eth_sendTransaction',
        params: [
          {
            from: state.address,
            to,
            value,
            data: data || '0x',
          },
        ],
      })) as string;

      return txHash;
    },
    [provider, state.address]
  );

  useEffect(() => {
    if (!provider) {
      return;
    }

    const checkConnection = async () => {
      try {
        const resolved = await resolveSubAccountAddresses(provider);
        if (!resolved) {
          setState((prev) => (prev.isConnected ? disconnectedState : prev));
          return;
        }

        applyAddresses(resolved.universalAddress, resolved.subAccountAddress);
      } catch {
        setState((prev) => (prev.isConnected ? disconnectedState : prev));
      }
    };

    checkConnection();
  }, [applyAddresses, provider]);

  return {
    ...state,
    connect,
    disconnect,
    signMessage,
    sendTransaction,
    getProvider,
  };
};
