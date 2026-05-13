'use client';

import { useState, useEffect, useCallback } from 'react';
import { createBaseAccountSDK, getCryptoKeyAccount } from '@base-org/account';
import { base } from 'viem/chains';

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
  getProvider: () => any;
}

export function useBaseAccount(): UseBaseAccountReturn {
  const [state, setState] = useState<BaseAccountState>({
    address: null,
    subAccountAddress: null,
    universalAddress: null,
    isConnected: false,
    isConnecting: false,
    chainId: null,
    error: null,
  });

  const [provider, setProvider] = useState<any>(null);

  // Initialize Base Account SDK client-side only
  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const sdk = createBaseAccountSDK({
          appName: 'BEAT ME',
          appLogoUrl: 'https://base.org/logo.png',
          appChainIds: [base.id],
          subAccounts: {
            creation: 'on-connect',
            defaultAccount: 'sub',
          },
          paymasterUrls: process.env.NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT ? [process.env.NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT] : undefined,
        });
        setProvider(sdk.getProvider());
      } catch (error) {
        console.error('Failed to initialize Base Account SDK:', error);
      }
    }
  }, []);

  // Get provider instance
  const getProvider = useCallback(() => {
    return provider;
  }, [provider]);

  // Connect to Base Account
  const connect = useCallback(async () => {
    if (!provider) {
      setState(prev => ({ ...prev, error: 'Provider not ready' }));
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      // First, connect to the universal account
      const accounts = await provider.request({
        method: 'eth_requestAccounts',
        params: []
      });

      if (!accounts || accounts.length === 0) {
        throw new Error('No accounts found');
      }

      const universalAddress = accounts[0];
      
      // Get or create Sub Account
      let subAccountAddress = universalAddress;
      try {
        // Check if Sub Account already exists
        const { subAccounts } = await provider.request({
          method: 'wallet_getSubAccounts',
          params: [{
            account: universalAddress,
            domain: window.location.origin,
          }]
        });

        if (subAccounts && subAccounts.length > 0) {
          subAccountAddress = subAccounts[0].address;
        } else {
          // Create new Sub Account
          const newSubAccount = await provider.request({
            method: 'wallet_addSubAccount',
            params: [{
              account: {
                type: 'create',
              },
            }]
          });
          subAccountAddress = newSubAccount.address;
        }
      } catch (subAccountError) {
        console.warn('Sub Account creation failed, using universal account:', subAccountError);
        // Continue with universal account if Sub Account creation fails
      }

      setState({
        address: subAccountAddress, // Use Sub Account as primary address
        subAccountAddress,
        universalAddress,
        isConnected: true,
        isConnecting: false,
        chainId: base.id,
        error: null,
      });

      console.log('✅ Base Account connected:', {
        universal: universalAddress,
        subAccount: subAccountAddress
      });
    } catch (error) {
      console.error('❌ Base Account connection failed:', error);
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Failed to connect to Base Account',
      }));
    }
  }, [provider]);

  // Disconnect from Base Account
  const disconnect = useCallback(() => {
    setState({
      address: null,
      subAccountAddress: null,
      universalAddress: null,
      isConnected: false,
      isConnecting: false,
      chainId: null,
      error: null,
    });
  }, []);

  // Sign a message
  const signMessage = useCallback(async (message: string): Promise<string> => {
    if (!state.address || !provider) {
      throw new Error('No account connected or provider not ready');
    }

    try {
      const signature = await provider.request({
        method: 'personal_sign',
        params: [message, state.address]
      });
      return signature;
    } catch (error) {
      console.error('❌ Message signing failed:', error);
      throw error;
    }
  }, [provider, state.address]);

  // Send a transaction
  const sendTransaction = useCallback(async (to: string, value: string, data?: string): Promise<string> => {
    if (!state.address || !provider) {
      throw new Error('No account connected or provider not ready');
    }

    try {
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: state.address,
          to,
          value,
          data: data || '0x',
        }]
      });
      return txHash;
    } catch (error) {
      console.error('❌ Transaction failed:', error);
      throw error;
    }
  }, [provider, state.address]);

  // Check initial connection state
  useEffect(() => {
    if (!provider) return;
    
    const checkConnection = async () => {
      try {
        const accounts = await provider.request({
          method: 'eth_accounts',
          params: []
        });

        if (accounts && accounts.length > 0) {
          const universalAddress = accounts[0];
          
          // Try to get Sub Account
          try {
            const { subAccounts } = await provider.request({
              method: 'wallet_getSubAccounts',
              params: [{
                account: universalAddress,
                domain: window.location.origin,
              }]
            });

            const subAccountAddress = subAccounts && subAccounts.length > 0 
              ? subAccounts[0].address 
              : universalAddress;

            setState({
              address: subAccountAddress,
              subAccountAddress,
              universalAddress,
              isConnected: true,
              isConnecting: false,
              chainId: base.id,
              error: null,
            });
          } catch (subAccountError) {
            // Fallback to universal account
            setState({
              address: universalAddress,
              subAccountAddress: universalAddress,
              universalAddress,
              isConnected: true,
              isConnecting: false,
              chainId: base.id,
              error: null,
            });
          }
        }
      } catch (error) {
        // Error 4100 or similar means not connected — silently handle
        // Return prev unchanged when already disconnected to prevent re-render loop
        setState(prev => {
          if (prev.isConnected) {
            return {
              ...prev,
              address: null,
              subAccountAddress: null,
              universalAddress: null,
              isConnected: false,
              isConnecting: false,
              chainId: null,
              error: null,
            };
          }
          return prev;
        });
      }
    };

    checkConnection();
  }, [provider]);

  return {
    ...state,
    connect,
    disconnect,
    signMessage,
    sendTransaction,
    getProvider,
  };
}
