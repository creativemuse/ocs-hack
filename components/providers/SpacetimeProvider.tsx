'use client';

/**
 * SpacetimeDB Provider for React
 * 
 * Wraps the application with SpacetimeDB connection and provides
 * access to the database via React hooks
 */

import React, { useEffect, useState } from 'react';
import { DbConnection, type DbConnectionImpl } from '@/lib/spacetime/database';
import { useWalletLinking } from '@/hooks/useWalletLinking';

// Configuration
const SPACETIME_CONFIG = {
  host: process.env.NEXT_PUBLIC_SPACETIME_HOST || 'https://maincloud.spacetimedb.com',
  module: process.env.NEXT_PUBLIC_SPACETIME_MODULE || 'beat-me',
};

interface SpacetimeContextValue {
  connection: DbConnectionImpl | null;
  isConnected: boolean;
  error: Error | null;
}

const SpacetimeContext = React.createContext<SpacetimeContextValue>({
  connection: null,
  isConnected: false,
  error: null,
});

export const useSpacetime = () => {
  const context = React.useContext(SpacetimeContext);
  if (!context) {
    throw new Error('useSpacetime must be used within SpacetimeProvider');
  }
  return context;
};

interface SpacetimeProviderProps {
  children: React.ReactNode;
}

export const SpacetimeProvider: React.FC<SpacetimeProviderProps> = ({ children }) => {
  const [connection, setConnection] = useState<DbConnectionImpl | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Automatically link wallet to SpacetimeDB identity when wallet connects
  useWalletLinking();

  useEffect(() => {
    // Only initialize in browser environment
    if (typeof window === 'undefined') {
      return;
    }

    // Check if SpacetimeDB is configured
    if (!SPACETIME_CONFIG.host || !SPACETIME_CONFIG.module) {
      console.log('⚠️ SpacetimeDB not configured');
      return;
    }

    let mounted = true;
    let conn: DbConnectionImpl | null = null;

    const initializeConnection = async () => {
      try {
        console.log('🚀 Initializing SpacetimeDB connection...');

        // Load saved token from localStorage for persistent identity
        const savedToken = localStorage.getItem('spacetime_auth_token');

        // Create connection builder
        const builder = DbConnection.builder()
          .withUri(SPACETIME_CONFIG.host)  // Just the host URL - SDK handles WebSocket conversion
          .withModuleName(SPACETIME_CONFIG.module)
          .onConnect((connection, identity, token) => {
            if (!mounted) return;
            
            console.log('✅ Connected to SpacetimeDB with identity:', identity.toHexString());
            // Save token for future connections to maintain persistent identity
            localStorage.setItem('spacetime_auth_token', token);
            
            conn = connection;
            setConnection(connection);
            setError(null);

            // Subscribe to all relevant tables
            // Wait for subscriptions to be applied before marking as connected
            connection.subscriptionBuilder()
              .onApplied(() => {
                if (!mounted) return;
                console.log('✅ SpacetimeDB subscriptions applied - data ready');
                setIsConnected(true); // Mark as connected AFTER subscriptions applied
              })
              .onError((errorContext) => {
                if (!mounted) return;
                console.error('❌ SpacetimeDB subscription error:', errorContext);
                
                // Extract the actual error message
                const errorMessage = typeof errorContext === 'string' 
                  ? errorContext 
                  : 'Subscription failed';
                setError(new Error(`SpacetimeDB subscription error: ${errorMessage}`));
              })
              .subscribe([
                'SELECT * FROM players',
                'SELECT * FROM game_sessions',
                'SELECT * FROM player_stats',
                'SELECT * FROM active_game_sessions',
                'SELECT * FROM pending_claims',
                'SELECT * FROM audio_files',
                'SELECT * FROM active_connections',
                'SELECT * FROM identity_wallet_mapping',
              ]);
          })
          .onDisconnect(() => {
            if (!mounted) return;
            console.log('🔌 Disconnected from SpacetimeDB');
            setIsConnected(false);
          })
          .onConnectError((err) => {
            if (!mounted) return;
            console.error('❌ SpacetimeDB connection error:', err);
            setError(err instanceof Error ? err : new Error(String(err)));
            setIsConnected(false);
          });

        // Pass saved token if available for persistent identity
        if (savedToken) {
          builder.withToken(savedToken);
        }

        // Build connection (this automatically connects)
        conn = builder.build();
        
      } catch (err) {
        if (!mounted) return;
        console.error('❌ Failed to initialize SpacetimeDB:', err);
        setError(err instanceof Error ? err : new Error(String(err)));
      }
    };

    initializeConnection();

    // Cleanup
    return () => {
      mounted = false;
      if (conn) {
        conn.disconnect();
      }
    };
  }, []);

  const value: SpacetimeContextValue = {
    connection,
    isConnected,
    error,
  };

  return (
    <SpacetimeContext.Provider value={value}>
      {children}
    </SpacetimeContext.Provider>
  );
};

