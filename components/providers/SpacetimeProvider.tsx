'use client';

/**
 * SpacetimeDB Provider for React
 * 
 * Wraps the application with SpacetimeDB connection and provides
 * access to the database via React hooks
 */

import React, { useEffect, useState } from 'react';
import { DbConnection, type DbConnectionImpl } from '@/lib/spacetime/database';

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
            setIsConnected(true);
            setError(null);

            // Subscribe to all relevant tables
            connection.subscriptionBuilder().subscribe([
              'SELECT * FROM players',
              'SELECT * FROM game_sessions',
              'SELECT * FROM player_stats',
              'SELECT * FROM active_game_sessions',
              'SELECT * FROM pending_claims',
              'SELECT * FROM prize_history',
              'SELECT * FROM audio_files',
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

