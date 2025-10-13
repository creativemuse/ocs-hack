/**
 * Wallet Linking Hook
 * 
 * Automatically links connected wallet address to SpacetimeDB identity
 * This enables cross-device stat persistence for paid players
 */

import { useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { spacetimeClient } from '@/lib/apis/spacetime';

export function useWalletLinking() {
  const { address, isConnected } = useAccount();
  const hasLinked = useRef(false);

  useEffect(() => {
    const linkWallet = async () => {
      // Only link if:
      // 1. Wallet is connected
      // 2. We have an address
      // 3. SpacetimeDB is configured and connected
      // 4. Haven't already linked in this session
      if (!isConnected || !address || !spacetimeClient.isConfigured() || hasLinked.current) {
        return;
      }

      try {
        console.log(`🔗 Linking wallet ${address} to SpacetimeDB...`);
        await spacetimeClient.linkWalletToIdentity(address);
        hasLinked.current = true;
        console.log('✅ Wallet linked to SpacetimeDB identity');
      } catch (error) {
        console.error('❌ Failed to link wallet to SpacetimeDB:', error);
        // Don't throw - this is a background operation
        // Game will still work, just won't have cross-device persistence
      }
    };

    linkWallet();
  }, [address, isConnected]);

  // Reset hasLinked when wallet disconnects
  useEffect(() => {
    if (!isConnected || !address) {
      hasLinked.current = false;
    }
  }, [isConnected, address]);
}

