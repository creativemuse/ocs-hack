/**
 * Wallet Linking Hook
 * 
 * Automatically links connected Base Account addresses to SpacetimeDB identity
 * This enables cross-device stat persistence for paid players
 */

import { useEffect, useRef } from 'react';
import { useBaseAccount } from './useBaseAccount';
import { spacetimeClient } from '@/lib/apis/spacetime';

export function useWalletLinking() {
  const { address, universalAddress, subAccountAddress, isConnected } = useBaseAccount();
  const hasLinked = useRef(false);

  useEffect(() => {
    const linkBaseAccount = async () => {
      // Only link if:
      // 1. Base Account is connected
      // 2. We have addresses
      // 3. SpacetimeDB is configured and connected
      // 4. Haven't already linked in this session
      if (!isConnected || !address || !spacetimeClient.isConfigured() || hasLinked.current) {
        return;
      }

      try {
        console.log(`🔗 Linking Base Account ${address} to SpacetimeDB...`);
        
        // Link the Sub Account address (primary) and universal address
        if (universalAddress && subAccountAddress) {
          await spacetimeClient.linkBaseAccountToIdentity(universalAddress, subAccountAddress);
        }
        
        hasLinked.current = true;
        console.log('✅ Base Account linked to SpacetimeDB identity', {
          universal: universalAddress,
          subAccount: subAccountAddress
        });
      } catch (error) {
        console.error('❌ Failed to link Base Account to SpacetimeDB:', error);
        // Don't throw - this is a background operation
        // Game will still work, just won't have cross-device persistence
      }
    };

    linkBaseAccount();
  }, [address, universalAddress, subAccountAddress, isConnected]);

  // Reset hasLinked when Base Account disconnects
  useEffect(() => {
    if (!isConnected || !address) {
      hasLinked.current = false;
    }
  }, [isConnected, address]);
}

