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
  database: process.env.NEXT_PUBLIC_SPACETIME_DATABASE || 'c2009532fc1fc554482aecff4e1b56027991d26aaf86538679ec83183140151a',
  module: process.env.NEXT_PUBLIC_SPACETIME_MODULE || 'beat-me',
  token: process.env.NEXT_PUBLIC_SPACETIME_TOKEN,
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
    if (!SPACETIME_CONFIG.host || !SPACETIME_CONFIG.database) {
      console.log('⚠️ SpacetimeDB not configured');
      return;
    }

    let mounted = true;
    let conn: DbConnectionImpl | null = null;

    const initializeConnection = async () => {
      try {
        console.log('🚀 Initializing SpacetimeDB connection...');

        // Build WebSocket URI
        const wsUri = `${SPACETIME_CONFIG.host.replace('https://', 'wss://').replace('http://', 'ws://')}/database/subscribe/${SPACETIME_CONFIG.database}`;

        // Create connection builder
        const builder = DbConnection.builder()
          .withUri(wsUri)
          .withModuleName(SPACETIME_CONFIG.module)
          .onConnect((connection, identity, _token) => {
            if (!mounted) return;
            
            console.log('✅ Connected to SpacetimeDB with identity:', identity.toHexString());
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

        // Add token if available
        if (SPACETIME_CONFIG.token) {
          builder.withToken(SPACETIME_CONFIG.token);
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

