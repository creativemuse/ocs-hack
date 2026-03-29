import { useMemo, useState, useEffect } from 'react';
import { useAccount, useChainId, useWalletClient } from 'wagmi';
import { createBundlerClient } from 'viem/account-abstraction';
import { toCoinbaseSmartAccount } from 'viem/account-abstraction';
import { createPublicClient, http, custom, fallback, type EIP1193Provider } from 'viem';
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

  // IMPORTANT: Use public RPC for general reads, not the authenticated CDP endpoint
  // The authenticated CDP endpoint should ONLY be used for bundler/paymaster operations
  // Using it for general reads causes 401 errors
  const publicRpcUrl = useMemo(() => {
    const baseRpcUrl = process.env.NEXT_PUBLIC_BASE_RPC_URL;
    // Only use public endpoints (not authenticated CDP endpoints)
    if (baseRpcUrl && !baseRpcUrl.includes('api.developer.coinbase.com')) {
      return baseRpcUrl;
    }
    // Fallback to public Base RPC
    return chain.rpcUrls.default.http[0];
  }, [chain]);

  // Create public client for RPC calls
  // Use public RPC for reads, wallet provider for signing
  const publicClient = useMemo(() => {
    if (typeof window === 'undefined') return null;
    
    const transports = [];
    
    // Add public RPC endpoint for reads
    transports.push(http(publicRpcUrl));
    
    const injected = (window as Window & { ethereum?: EIP1193Provider }).ethereum;
    if (injected) {
      transports.push(custom(injected));
    }
    
    return createPublicClient({
      chain,
      transport: transports.length > 1 ? fallback(transports) : transports[0],
    });
  }, [chain, publicRpcUrl]);

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

