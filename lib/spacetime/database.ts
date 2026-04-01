/**
 * SpacetimeDB Database Connection Management
 * 
 * This module manages the connection to SpacetimeDB using the new SDK
 */

import { DbConnection } from './index';

// Configuration
const SPACETIME_CONFIG = {
  host: process.env.SPACETIME_HOST || 'https://maincloud.spacetimedb.com',
  module: process.env.SPACETIME_MODULE || 'beat-me',
};

export interface DatabaseConfig {
  host: string;
  module: string;
}

/**
 * Create a connection builder configured for the project
 */
export function createConnectionBuilder() {
  // Load saved token from localStorage (browser only)
  const savedToken = typeof window !== 'undefined' 
    ? localStorage.getItem('spacetime_auth_token') 
    : null;
  
  const builder = DbConnection.builder()
    .withUri(SPACETIME_CONFIG.host)  // Just the host URL - SDK handles WebSocket conversion
    .withDatabaseName(SPACETIME_CONFIG.module)
    .onConnect((conn, identity, token) => {
      console.log('✅ Connected to SpacetimeDB with identity:', identity.toHexString());
      // Save token for future connections to maintain persistent identity
      if (typeof window !== 'undefined') {
        localStorage.setItem('spacetime_auth_token', token);
      }
    })
    .onDisconnect(() => {
      console.log('🔌 Disconnected from SpacetimeDB');
    })
    .onConnectError((error) => {
      console.error('❌ SpacetimeDB connection error:', error);
    });

  // Pass saved token if available for persistent identity
  if (savedToken) {
    builder.withToken(savedToken);
  }

  return builder;
}

/**
 * Create and return a database connection
 * This is the main connection factory for the application
 */
export async function createConnection(): Promise<DbConnection> {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Connection timeout'));
    }, 10000);

    // Load saved token from localStorage (browser only)
    const savedToken = typeof window !== 'undefined' 
      ? localStorage.getItem('spacetime_auth_token') 
      : null;
    
    const builder = DbConnection.builder()
      .withUri(SPACETIME_CONFIG.host)  // Just the host URL - SDK handles WebSocket conversion
      .withDatabaseName(SPACETIME_CONFIG.module)
      .onConnect((conn, identity, token) => {
        clearTimeout(timeout);
        console.log('✅ Connected to SpacetimeDB with identity:', identity.toHexString());
        // Save token for persistent identity
        if (typeof window !== 'undefined') {
          localStorage.setItem('spacetime_auth_token', token);
        }
        resolve(conn);
      })
      .onConnectError((error) => {
        clearTimeout(timeout);
        console.error('❌ SpacetimeDB connection error:', error);
        reject(error);
      });

    // Pass saved token if available for persistent identity
    if (savedToken) {
      builder.withToken(savedToken);
    }

    builder.build();
  });
}

/**
 * Check if SpacetimeDB is configured
 */
export function isConfigured(): boolean {
  return !!(SPACETIME_CONFIG.host && SPACETIME_CONFIG.module);
}

/**
 * Get database configuration
 */
export function getConfig(): DatabaseConfig {
  return { ...SPACETIME_CONFIG };
}

// Export connection API and table helpers from generated bindings
export * from './index';

export type {
  Player,
  GameSession,
  ActiveGameSession,
  PlayerStats,
  AudioFile,
  PendingClaim,
  PrizeHistory,
  GameEntry,
  AnonymousSession,
  PrizePool,
  Admin,
  PlayerType,
} from './types';
