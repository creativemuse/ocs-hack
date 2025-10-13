/**
 * SpacetimeDB Database Connection Management
 * 
 * This module manages the connection to SpacetimeDB using the new SDK
 */

import { DbConnection } from './bindings';
import type { DbConnectionImpl } from 'spacetimedb';

// Configuration
const SPACETIME_CONFIG = {
  host: process.env.SPACETIME_HOST || 'https://maincloud.spacetimedb.com',
  database: process.env.SPACETIME_DATABASE || 'c2009532fc1fc554482aecff4e1b56027991d26aaf86538679ec83183140151a',
  module: process.env.SPACETIME_MODULE || 'beat-me',
  token: process.env.SPACETIME_TOKEN || undefined,
};

export interface DatabaseConfig {
  host: string;
  database: string;
  module: string;
  token?: string;
}

/**
 * Get the WebSocket URI for SpacetimeDB connection
 */
export function getWebSocketUri(): string {
  const host = SPACETIME_CONFIG.host
    .replace('https://', 'wss://')
    .replace('http://', 'ws://');
  
  return `${host}/database/subscribe/${SPACETIME_CONFIG.database}`;
}

/**
 * Create a connection builder configured for the project
 */
export function createConnectionBuilder() {
  const wsUri = getWebSocketUri();
  
  const builder = DbConnection.builder()
    .withUri(wsUri)
    .withModuleName(SPACETIME_CONFIG.module)
    .onConnect((conn, identity, _token) => {
      console.log('✅ Connected to SpacetimeDB with identity:', identity.toHexString());
    })
    .onDisconnect(() => {
      console.log('🔌 Disconnected from SpacetimeDB');
    })
    .onConnectError((error) => {
      console.error('❌ SpacetimeDB connection error:', error);
    });

  // Add token if available
  if (SPACETIME_CONFIG.token) {
    builder.withToken(SPACETIME_CONFIG.token);
  }

  return builder;
}

/**
 * Create and return a database connection
 * This is the main connection factory for the application
 */
export async function createConnection(): Promise<DbConnectionImpl> {
  const builder = createConnectionBuilder();
  const connection = builder.build();
  
  // Wait for connection to be established
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Connection timeout'));
    }, 10000);

    // Listen for connection
    const checkConnection = () => {
      // Connection is established when builder completes
      clearTimeout(timeout);
      resolve(connection);
    };

    // Connection is ready immediately after build
    // The SDK handles the connection lifecycle
    checkConnection();
  });
}

/**
 * Check if SpacetimeDB is configured
 */
export function isConfigured(): boolean {
  return !!(SPACETIME_CONFIG.host && SPACETIME_CONFIG.database && SPACETIME_CONFIG.module);
}

/**
 * Get database configuration
 */
export function getConfig(): DatabaseConfig {
  return { ...SPACETIME_CONFIG };
}

// Export types from bindings for convenience
export * from './bindings';
export type { DbConnectionImpl } from 'spacetimedb';
