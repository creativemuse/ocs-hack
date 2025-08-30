'use client';

import { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';

export interface WalletState {
  address: string | null;
  isConnected: boolean;
  isConnecting: boolean;
  chainId: number | null;
  error: string | null;
}

export interface UseWalletReturn extends WalletState {
  connect: () => Promise<void>;
  disconnect: () => void;
  switchNetwork: (chainId: number) => Promise<void>;
  getBalance: (address: string) => Promise<string>;
}

export function useWallet(): UseWalletReturn {
  const [state, setState] = useState<WalletState>({
    address: null,
    isConnected: false,
    isConnecting: false,
    chainId: null,
    error: null,
  });

  // Check if MetaMask is installed
  const isMetaMaskInstalled = typeof window !== 'undefined' && window.ethereum;

  // Get provider
  const getProvider = useCallback(() => {
    if (!isMetaMaskInstalled) return null;
    return new ethers.BrowserProvider(window.ethereum);
  }, [isMetaMaskInstalled]);

  // Connect wallet
  const connect = useCallback(async () => {
    if (!isMetaMaskInstalled) {
      setState(prev => ({
        ...prev,
        error: 'MetaMask is not installed. Please install MetaMask to continue.',
      }));
      return;
    }

    setState(prev => ({ ...prev, isConnecting: true, error: null }));

    try {
      const provider = getProvider();
      if (!provider) throw new Error('No provider available');

      // Request account access
      const accounts = await provider.send('eth_requestAccounts', []);
      const address = accounts[0];

      if (!address) throw new Error('No accounts found');

      // Get network info
      const network = await provider.getNetwork();
      const chainId = Number(network.chainId);

      // Check if we're on the correct network (Base Sepolia)
      if (chainId !== 84532) {
        setState(prev => ({
          ...prev,
          address,
          isConnected: true,
          isConnecting: false,
          chainId,
          error: 'Please switch to Base Sepolia network (Chain ID: 84532)',
        }));
        return;
      }

      setState({
        address,
        isConnected: true,
        isConnecting: false,
        chainId,
        error: null,
      });
    } catch (error) {
      console.error('Error connecting wallet:', error);
      setState(prev => ({
        ...prev,
        isConnecting: false,
        error: error instanceof Error ? error.message : 'Failed to connect wallet',
      }));
    }
  }, [isMetaMaskInstalled, getProvider]);

  // Disconnect wallet
  const disconnect = useCallback(() => {
    setState({
      address: null,
      isConnected: false,
      isConnecting: false,
      chainId: null,
      error: null,
    });
  }, []);

  // Switch network
  const switchNetwork = useCallback(async (targetChainId: number) => {
    if (!isMetaMaskInstalled) {
      setState(prev => ({
        ...prev,
        error: 'MetaMask is not installed',
      }));
      return;
    }

    try {
      await window.ethereum.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId: `0x${targetChainId.toString(16)}` }],
      });

      // Refresh connection state
      const provider = getProvider();
      if (provider) {
        const network = await provider.getNetwork();
        setState(prev => ({
          ...prev,
          chainId: Number(network.chainId),
          error: null,
        }));
      }
    } catch (error) {
      console.error('Error switching network:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to switch network',
      }));
    }
  }, [isMetaMaskInstalled, getProvider]);

  // Get balance
  const getBalance = useCallback(async (address: string): Promise<string> => {
    const provider = getProvider();
    if (!provider) throw new Error('No provider available');

    const balance = await provider.getBalance(address);
    return ethers.formatEther(balance);
  }, [getProvider]);

  // Listen for account changes
  useEffect(() => {
    if (!isMetaMaskInstalled) return;

    const handleAccountsChanged = (accounts: string[]) => {
      if (accounts.length === 0) {
        // User disconnected
        disconnect();
      } else {
        // User switched accounts
        setState(prev => ({
          ...prev,
          address: accounts[0],
        }));
      }
    };

    const handleChainChanged = (chainId: string) => {
      const newChainId = parseInt(chainId, 16);
      setState(prev => ({
        ...prev,
        chainId: newChainId,
        error: newChainId !== 84532 ? 'Please switch to Base Sepolia network' : null,
      }));
    };

    // Add event listeners
    window.ethereum.on('accountsChanged', handleAccountsChanged);
    window.ethereum.on('chainChanged', handleChainChanged);

    // Check initial connection state
    const checkConnection = async () => {
      try {
        const provider = getProvider();
        if (!provider) return;

        const accounts = await provider.listAccounts();
        if (accounts.length > 0) {
          const network = await provider.getNetwork();
          const chainId = Number(network.chainId);
          
          setState({
            address: accounts[0].address,
            isConnected: true,
            isConnecting: false,
            chainId,
            error: chainId !== 84532 ? 'Please switch to Base Sepolia network' : null,
          });
        }
      } catch (error) {
        console.error('Error checking initial connection:', error);
      }
    };

    checkConnection();

    // Cleanup
    return () => {
      if (window.ethereum) {
        window.ethereum.removeListener('accountsChanged', handleAccountsChanged);
        window.ethereum.removeListener('chainChanged', handleChainChanged);
      }
    };
  }, [isMetaMaskInstalled, getProvider, disconnect]);

  return {
    ...state,
    connect,
    disconnect,
    switchNetwork,
    getBalance,
  };
}
