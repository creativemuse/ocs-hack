/**
 * SpacetimeDB Database Management
 * 
 * This module handles database operations for player management
 */

const SPACETIME_HOST = process.env.SPACETIME_HOST || 'https://maincloud.spacetimedb.com';
const SPACETIME_DATABASE = process.env.SPACETIME_DATABASE || 'c2009532fc1fc554482aecff4e1b56027991d26aaf86538679ec83183140151a';

export interface DatabaseConfig {
  host: string;
  database: string;
  token?: string;
}

/**
 * Execute a SQL query against the database
 */
export async function executeSql(query: string, token: string): Promise<any[]> {
  const response = await fetch(`${SPACETIME_HOST}/v1/database/${SPACETIME_DATABASE}/sql`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'text/plain',
    },
    body: query,
  });

  if (!response.ok) {
    throw new Error(`SQL query failed: ${response.status}`);
  }

  return response.json();
}

/**
 * Call a reducer function in the database
 */
export async function callReducer(
  reducerName: string,
  args: any[],
  token: string
): Promise<void> {
  const response = await fetch(
    `${SPACETIME_HOST}/v1/database/${SPACETIME_DATABASE}/call/${reducerName}`,
    {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(args),
    }
  );

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Reducer call failed: ${response.status} - ${errorText}`);
  }
}

/**
 * Get the database schema
 */
export async function getDatabaseSchema(token?: string): Promise<any> {
  const headers: Record<string, string> = {};
  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(
    `${SPACETIME_HOST}/v1/database/${SPACETIME_DATABASE}/schema?version=9`,
    { headers }
  );

  if (!response.ok) {
    throw new Error(`Failed to get schema: ${response.status}`);
  }

  return response.json();
}

/**
 * Check database connection
 */
export async function checkDatabaseConnection(): Promise<boolean> {
  try {
    const response = await fetch(
      `${SPACETIME_HOST}/v1/database/${SPACETIME_DATABASE}`,
      {
        method: 'GET',
      }
    );
    return response.ok;
  } catch {
    return false;
  }
}

// SQL queries for player management
export const PlayerQueries = {
  createPlayerTable: `
    CREATE TABLE IF NOT EXISTS players (
      spacetime_identity TEXT PRIMARY KEY,
      player_type TEXT NOT NULL CHECK (player_type IN ('trial', 'paid')),
      wallet_address TEXT,
      session_id TEXT,
      trial_completed BOOLEAN DEFAULT FALSE,
      created_at INTEGER NOT NULL,
      updated_at INTEGER NOT NULL
    );
    
    CREATE INDEX IF NOT EXISTS idx_players_wallet ON players(wallet_address);
    CREATE INDEX IF NOT EXISTS idx_players_session ON players(session_id);
  `,

  getPlayerByIdentity: (identity: string) => `
    SELECT * FROM players WHERE spacetime_identity = '${identity}';
  `,

  getPlayerByWallet: (wallet: string) => `
    SELECT * FROM players WHERE wallet_address = '${wallet}';
  `,

  getPlayerBySession: (sessionId: string) => `
    SELECT * FROM players WHERE session_id = '${sessionId}';
  `,

  insertPlayer: (
    identity: string,
    playerType: 'trial' | 'paid',
    walletAddress?: string,
    sessionId?: string
  ) => `
    INSERT INTO players (
      spacetime_identity,
      player_type,
      wallet_address,
      session_id,
      created_at,
      updated_at
    ) VALUES (
      '${identity}',
      '${playerType}',
      ${walletAddress ? `'${walletAddress}'` : 'NULL'},
      ${sessionId ? `'${sessionId}'` : 'NULL'},
      ${Date.now()},
      ${Date.now()}
    );
  `,

  updatePlayerToPaid: (identity: string, walletAddress: string) => `
    UPDATE players 
    SET 
      player_type = 'paid',
      wallet_address = '${walletAddress}',
      trial_completed = TRUE,
      updated_at = ${Date.now()}
    WHERE spacetime_identity = '${identity}';
  `,

  markTrialCompleted: (identity: string) => `
    UPDATE players 
    SET 
      trial_completed = TRUE,
      updated_at = ${Date.now()}
    WHERE spacetime_identity = '${identity}';
  `,
};

// Reducer names for SpacetimeDB module
export const Reducers = {
  // Player management
  STORE_PLAYER_IDENTITY: 'store_player_identity',
  UPDATE_PLAYER_TO_PAID: 'update_player_to_paid',
  MARK_TRIAL_COMPLETED: 'mark_trial_completed',
  
  // Game session management
  CREATE_GAME_ENTRY: 'create_game_entry',
  JOIN_GAME_SESSION: 'join_game_session',
  SUBMIT_SCORE: 'submit_score',
  
  // Admin functions
  GRANT_ADMIN: 'grant_admin',
  REVOKE_ADMIN: 'revoke_admin',
};
