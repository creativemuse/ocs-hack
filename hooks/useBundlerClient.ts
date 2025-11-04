import { useMemo, useState, useEffect } from 'react';
import { useAccount, useChainId, useWalletClient } from 'wagmi';
import { createBundlerClient } from 'viem/account-abstraction';
import { toCoinbaseSmartAccount } from 'viem/account-abstraction';
import { createPublicClient, http, custom, fallback } from 'viem';
import { base, baseSepolia } from 'viem/chains';
import type { SmartAccount } from 'viem/account-abstraction';

/**
 * Hook to create a bundler client for account abstraction operations
 * Creates a Coinbase Smart Account from the connected wallet
 * 
 * Works with both:
 * - Base Account: Users connecting with their Base Account
 * - Embedded Wallets: Users using CDP Embedded Wallets via OnchainKit
 */
export function useBundlerClient() {
  const { address, connector } = useAccount();
  const chainId = useChainId();
  const { data: walletClient } = useWalletClient();
  const [smartAccount, setSmartAccount] = useState<SmartAccount | null>(null);
  const [isAccountLoading, setIsAccountLoading] = useState(false);
  
  const chain = chainId === base.id ? base : baseSepolia;
  const bundlerUrl = process.env.NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT;

  // Extract authenticated RPC URL from bundler endpoint or use base RPC URL
  // The bundler URL format is: https://api.developer.coinbase.com/rpc/v1/base/{API_KEY}
  // We can use this same URL for authenticated RPC calls
  const authenticatedRpcUrl = useMemo(() => {
    // If bundler URL is set, use it as the authenticated RPC endpoint
    if (bundlerUrl) {
      return bundlerUrl;
    }
    // Fallback to base RPC URL (may be public or authenticated)
    const baseRpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL;
    if (baseRpcUrl && baseRpcUrl.includes('api.developer.coinbase.com')) {
      return baseRpcUrl;
    }
    // Final fallback to public RPC (may cause 401 if authentication is required)
    return chain.rpcUrls.default.http[0];
  }, [bundlerUrl, chain]);

  // Create public client for RPC calls
  // Use authenticated RPC endpoint for reads, fallback to wallet provider for signing
  const publicClient = useMemo(() => {
    if (typeof window === 'undefined') return null;
    
    const transports = [];
    
    // Add authenticated RPC endpoint if available
    if (authenticatedRpcUrl) {
      transports.push(http(authenticatedRpcUrl));
    }
    
    // Add wallet provider for signing operations
    if (window.ethereum) {
      transports.push(custom(window.ethereum));
    }
    
    // Fallback to public RPC if no authenticated endpoint
    if (transports.length === 0) {
      transports.push(http(chain.rpcUrls.default.http[0]));
    }
    
    return createPublicClient({
      chain,
      transport: transports.length > 1 ? fallback(transports) : transports[0],
    });
  }, [chain, authenticatedRpcUrl]);

  // Create smart account from connected wallet
  useEffect(() => {
    const createSmartAccount = async () => {
      if (!address || !publicClient) {
        setSmartAccount(null);
        return;
      }

      if (!walletClient?.account) {
        setSmartAccount(null);
        return;
      }

      // Check if account is a LocalAccount (has signMessage and signTypedData)
      const account = walletClient.account;
      const isLocalAccount = 
        account.type === 'local' || 
        (typeof account.signMessage === 'function' && typeof account.signTypedData === 'function');

      if (!isLocalAccount) {
        // Silently skip - this wallet type doesn't support account abstraction
        console.debug('Wallet account type not compatible with account abstraction:', {
          accountType: account.type,
          connector: connector?.name || 'unknown',
        });
        setSmartAccount(null);
        return;
      }

      setIsAccountLoading(true);
      try {
        // Type assertion: We've verified it's a LocalAccount with type === 'local'
        // After the runtime check, TypeScript still needs the assertion
        const smartAccount = await toCoinbaseSmartAccount({
          client: publicClient,
          owners: [account as Extract<typeof account, { type: 'local' }>],
          version: '1.1',
        });
        
        setSmartAccount(smartAccount);
      } catch (error) {
        // Only log if it's an unexpected error
        if (error instanceof Error && !error.message.includes('invalid owner type')) {
          console.error('Failed to create smart account:', error);
        }
        console.debug('Account abstraction not available:', {
          address,
          connector: connector?.name || 'unknown',
          reason: error instanceof Error ? error.message : String(error),
        });
        setSmartAccount(null);
      } finally {
        setIsAccountLoading(false);
      }
    };

    createSmartAccount();
  }, [address, publicClient, walletClient, connector, chain]);

  // Create bundler client
  const bundlerClient = useMemo(() => {
    if (!smartAccount || !publicClient || !bundlerUrl) return null;

    try {
      return createBundlerClient({
        account: smartAccount,
        client: publicClient,
        transport: http(bundlerUrl),
        chain,
      });
    } catch (error) {
      console.error('Failed to create bundler client:', error);
      return null;
    }
  }, [smartAccount, publicClient, bundlerUrl, chain]);

  return {
    bundlerClient,
    publicClient,
    smartAccount,
    isReady: !!bundlerClient && !!publicClient && !!smartAccount && !isAccountLoading,
  };
}

