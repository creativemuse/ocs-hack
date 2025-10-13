/**
 * SpacetimeDB Identity Management for Player Sessions
 * 
 * This module manages player identities and their trial/paid status using SpacetimeDB's
 * identity system with the new SDK.
 */

import { Identity } from 'spacetimedb';
import { createConnection, type DbConnectionImpl } from './database';

// Configuration
const SPACETIME_HOST = process.env.SPACETIME_HOST || 'https://maincloud.spacetimedb.com';

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
 * Store player identity using the connection's reducer
 */
export async function storePlayerIdentity(params: {
  connection: DbConnectionImpl;
  playerType: 'trial' | 'paid';
  walletAddress?: string;
  sessionId?: string;
}): Promise<void> {
  // Use the CreatePlayer reducer from the generated bindings
  await params.connection.reducers.createPlayer(
    params.walletAddress || '',
    undefined, // username
  );
}

/**
 * Get player profile from connection
 */
export async function getPlayerProfile(
  connection: DbConnectionImpl,
  walletAddress: string
): Promise<PlayerIdentity | null> {
  // Query the players table using the connection
  const players = (Array.from(connection.db.players.iter()) as any[]).filter(
    (player: any) => player.walletAddress === walletAddress
  );

  if (players.length === 0) {
    return null;
  }

  const player = players[0];
  
  return {
    spacetimeIdentity: '', // Identity is managed by connection
    playerType: player.trialCompleted ? 'paid' : 'trial',
    walletAddress: player.walletAddress,
    sessionId: undefined,
    trialCompleted: player.trialCompleted,
    createdAt: player.createdAt,
  };
}

/**
 * Mark a trial as completed for a player
 */
export async function markTrialCompleted(
  connection: DbConnectionImpl,
  walletAddress: string
): Promise<void> {
  await connection.reducers.updateTrialStatus(
    walletAddress,
    0, // trial_games_remaining
    true // trial_completed
  );
}

/**
 * Update player to paid status
 */
export async function linkWalletToIdentity(
  connection: DbConnectionImpl,
  walletAddress: string
): Promise<void> {
  await connection.reducers.updateTrialStatus(
    walletAddress,
    0,
    true
  );
}

/**
 * Create or get player identity for a session
 */
export async function ensurePlayerIdentity(params: {
  sessionId?: string;
  walletAddress?: string;
  isTrialPlayer: boolean;
}): Promise<{
  identity: SpacetimeIdentity;
  playerInfo: PlayerIdentity;
  isNewIdentity: boolean;
} | null> {
  try {
    // Create new identity
    const newIdentity = await createPlayerIdentity();
    
    if (!newIdentity) return null;

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
export async function canPlayTrial(
  connection: DbConnectionImpl,
  walletAddress: string
): Promise<boolean> {
  const playerInfo = await getPlayerProfile(connection, walletAddress);
  
  if (!playerInfo) return true; // New player can play trial
  
  // Cannot play trial if already completed or is a paid player
  return !playerInfo.trialCompleted && playerInfo.playerType === 'trial';
}

/**
 * Get player by wallet address
 */
export async function getPlayerByWallet(
  connection: DbConnectionImpl,
  walletAddress: string
): Promise<PlayerIdentity | null> {
  return getPlayerProfile(connection, walletAddress);
}
