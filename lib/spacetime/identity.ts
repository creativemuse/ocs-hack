/**
 * SpacetimeDB Identity Management for Player Sessions
 * 
 * This module manages player identities and their trial/paid status using SpacetimeDB's
 * identity system. Each player gets a unique SpacetimeDB identity that tracks:
 * - Trial game completion
 * - Player type (trial/paid)
 * - Associated wallet address (if any)
 */

import { executeSql, callReducer, PlayerQueries, Reducers } from './database';

// Configuration
const SPACETIME_HOST = process.env.SPACETIME_HOST || 'https://maincloud.spacetimedb.com';
const SPACETIME_DATABASE = process.env.SPACETIME_DATABASE || 'c2007dc6e3857303a80d6cf822ead75c1460957cfd14c51f5e168e9673e44b2b';

export interface SpacetimeIdentity {
  identity: string;
  token: string;
}

export interface PlayerIdentity {
  spacetimeIdentity: string;
  playerType: 'trial' | 'paid';
  walletAddress?: string;
  sessionId?: string;
  trialCompleted: boolean;
  createdAt: number;
}

/**
 * Create a new SpacetimeDB identity for a player
 */
export async function createPlayerIdentity(): Promise<SpacetimeIdentity> {
  const response = await fetch(`${SPACETIME_HOST}/v1/identity`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to create SpacetimeDB identity: ${response.status}`);
  }

  return response.json();
}

/**
 * Generate a short-lived websocket token for a player
 */
export async function generateWebsocketToken(token: string): Promise<string> {
  const response = await fetch(`${SPACETIME_HOST}/v1/identity/websocket-token`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.ok) {
    throw new Error(`Failed to generate websocket token: ${response.status}`);
  }

  const data = await response.json();
  return data.token;
}

/**
 * Verify an identity and token pair
 */
export async function verifyIdentity(identity: string, token: string): Promise<boolean> {
  const response = await fetch(`${SPACETIME_HOST}/v1/identity/${identity}/verify`, {
    method: 'GET',
    headers: {
      'Authorization': `Bearer ${token}`,
    },
  });

  return response.status === 204;
}

/**
 * Store player identity mapping in SpacetimeDB
 */
export async function storePlayerIdentity(params: {
  spacetimeIdentity: string;
  spacetimeToken: string;
  playerType: 'trial' | 'paid';
  walletAddress?: string;
  sessionId?: string;
  trialCompleted?: boolean;
}): Promise<void> {
  // Use SQL to insert player data
  const query = PlayerQueries.insertPlayer(
    params.spacetimeIdentity,
    params.playerType,
    params.walletAddress,
    params.sessionId
  );
  
  await executeSql(query, params.spacetimeToken);
}

/**
 * Get player identity information
 */
export async function getPlayerIdentity(identity: string, token: string): Promise<PlayerIdentity | null> {
  try {
    const query = PlayerQueries.getPlayerByIdentity(identity);
    const results = await executeSql(query, token);
    
    if (!results || results.length === 0 || !results[0].rows?.[0]) {
      return null;
    }
    
    const playerData = results[0].rows[0];
    
    return {
      spacetimeIdentity: playerData[0], // spacetime_identity
      playerType: playerData[1] as 'trial' | 'paid', // player_type
      walletAddress: playerData[2] || undefined, // wallet_address
      sessionId: playerData[3] || undefined, // session_id
      trialCompleted: playerData[4], // trial_completed
      createdAt: playerData[5], // created_at
    };
  } catch (error) {
    console.error('Error getting player identity:', error);
    return null;
  }
}

/**
 * Mark a trial as completed for a player identity
 */
export async function markTrialCompleted(identity: string, token: string): Promise<void> {
  const query = PlayerQueries.markTrialCompleted(identity);
  await executeSql(query, token);
}

/**
 * Link a wallet address to an existing identity
 */
export async function linkWalletToIdentity(identity: string, walletAddress: string, token: string): Promise<void> {
  const query = PlayerQueries.updatePlayerToPaid(identity, walletAddress);
  await executeSql(query, token);
}

/**
 * Create or get player identity for a session
 */
export async function ensurePlayerIdentity(params: {
  sessionId?: string;
  walletAddress?: string;
  isTrialPlayer: boolean;
  serverToken?: string;
}): Promise<{
  identity: SpacetimeIdentity;
  playerInfo: PlayerIdentity;
  isNewIdentity: boolean;
} | null> {
  try {
    // If wallet address provided, check if identity exists
    if (params.walletAddress && params.serverToken) {
      const query = PlayerQueries.getPlayerByWallet(params.walletAddress);
      const results = await executeSql(query, params.serverToken);
      
      if (results && results.length > 0 && results[0].rows?.[0]) {
        const playerData = results[0].rows[0];
        const existingIdentity = playerData[0]; // spacetime_identity
        
        // Note: We would need to retrieve the token for this identity
        // For now, create a new token for the existing identity
        return null; // Need to implement token retrieval
      }
    }

    // Create new identity
    const newIdentity = await createPlayerIdentity();
    
    if (!newIdentity) return null;
    
    // Store player identity mapping
    await storePlayerIdentity({
      spacetimeIdentity: newIdentity.identity,
      spacetimeToken: newIdentity.token,
      playerType: params.isTrialPlayer ? 'trial' : 'paid',
      walletAddress: params.walletAddress,
      sessionId: params.sessionId,
      trialCompleted: false,
    });

    return {
      identity: newIdentity,
      playerInfo: {
        spacetimeIdentity: newIdentity.identity,
        playerType: params.isTrialPlayer ? 'trial' : 'paid',
        walletAddress: params.walletAddress,
        sessionId: params.sessionId,
        trialCompleted: false,
        createdAt: Date.now(),
      },
      isNewIdentity: true,
    };
  } catch (error) {
    console.error('Error ensuring player identity:', error);
    return null;
  }
}

/**
 * Check if an identity can play trial games
 */
export async function canPlayTrial(identity: string, token: string): Promise<boolean> {
  const playerInfo = await getPlayerIdentity(identity, token);
  
  if (!playerInfo) return true; // New player can play trial
  
  // Cannot play trial if already completed or is a paid player
  return !playerInfo.trialCompleted && playerInfo.playerType === 'trial';
}

/**
 * Get player by session ID
 */
export async function getPlayerBySession(sessionId: string, token: string): Promise<PlayerIdentity | null> {
  try {
    const query = PlayerQueries.getPlayerBySession(sessionId);
    const results = await executeSql(query, token);
    
    if (!results || results.length === 0 || !results[0].rows?.[0]) {
      return null;
    }
    
    const playerData = results[0].rows[0];
    
    return {
      spacetimeIdentity: playerData[0], // spacetime_identity
      playerType: playerData[1] as 'trial' | 'paid', // player_type
      walletAddress: playerData[2] || undefined, // wallet_address
      sessionId: playerData[3] || undefined, // session_id
      trialCompleted: playerData[4], // trial_completed
      createdAt: playerData[5], // created_at
    };
  } catch (error) {
    console.error('Error getting player by session:', error);
    return null;
  }
}
