/**
 * CDP SQL API Client
 * Provides real-time blockchain data queries for player activity, earnings, and game events
 */

import { CDPJWTGenerator } from './jwt-generator';

interface CDPSQLQuery {
  sql: string;
}

interface CDPSQLResponse {
  result: Record<string, any>[];
  schema?: {
    columns: Array<{
      name: string;
      type: string;
    }>;
  };
  metadata?: {
    cached: boolean;
    executionTimeMs: number;
    rowCount: number;
  };
}

export class CDPSQLClient {
  private jwtGenerator: CDPJWTGenerator;
  private baseUrl = 'https://api.cdp.coinbase.com/platform/v2/data/query';

  constructor(jwtGenerator: CDPJWTGenerator) {
    this.jwtGenerator = jwtGenerator;
  }

  /**
   * Execute a SQL query against CDP's indexed blockchain data
   */
  async executeQuery(sql: string): Promise<CDPSQLResponse> {
    const jwt = this.jwtGenerator.generateJWT();

    const response = await fetch(`${this.baseUrl}/run`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${jwt}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ sql })
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      const errorMessage = errorBody?.message || errorBody?.error || response.statusText;
      
      // Provide specific error messages for common issues
      if (response.status === 401) {
        throw new Error(
          `CDP SQL API authentication failed (401). ` +
          `Please check your CDP_API_KEY and CDP_API_SECRET in .env.local. ` +
          `Error: ${errorMessage}`
        );
      }
      
      throw new Error(
        `CDP SQL API error (${response.status}): ${errorMessage}. ` +
        `Response body: ${JSON.stringify(errorBody)}`
      );
    }

    return response.json();
  }

  /**
   * Get active players from recent game events
   */
  async getActivePlayers(contractAddress: string, usdcAddress: string, timeWindowHours: number = 24): Promise<any[]> {
    const sql = `
      WITH player_activities AS (
        SELECT 
          transaction_from as address,
          MAX(block_timestamp) as last_active,
          COUNT(DISTINCT transaction_hash) as games_played
        FROM base.events
        WHERE address = '${contractAddress.toLowerCase()}'
          AND event_name IN ('GameStarted', 'GameCompleted', 'RoundCompleted')
          AND block_timestamp > now() - INTERVAL ${timeWindowHours} HOUR
        GROUP BY transaction_from
      ),
      player_earnings AS (
        SELECT 
          to_address as address,
          SUM(CAST(value AS DOUBLE) / 1000000.0) as total_score
        FROM base.transfers
        WHERE token_address = '${usdcAddress.toLowerCase()}'
          AND from_address = '${contractAddress.toLowerCase()}'
        GROUP BY to_address
      )
      SELECT 
        pa.address,
        pa.last_active,
        pa.games_played,
        COALESCE(pe.total_score, 0) as total_score
      FROM player_activities pa
      LEFT JOIN player_earnings pe ON pa.address = pe.address
      ORDER BY pa.last_active DESC
      LIMIT 50
    `;

    const response = await this.executeQuery(sql);
    return response.result;
  }

  /**
   * Get detailed player profile statistics
   */
  async getPlayerProfile(playerAddress: string, contractAddress: string, usdcAddress: string): Promise<any> {
    const sql = `
      WITH player_games AS (
        SELECT 
          COUNT(DISTINCT transaction_hash) as total_games,
          COUNT(DISTINCT CASE WHEN event_name = 'PerfectRound' THEN transaction_hash END) as perfect_rounds,
          MIN(block_timestamp) as first_game,
          MAX(block_timestamp) as last_game
        FROM base.events
        WHERE address = '${contractAddress.toLowerCase()}'
          AND transaction_from = '${playerAddress.toLowerCase()}'
          AND event_name IN ('GameStarted', 'GameCompleted', 'RoundCompleted', 'PerfectRound')
      ),
      player_earnings AS (
        SELECT 
          SUM(CAST(value AS DOUBLE) / 1000000.0) as total_earnings,
          COUNT(*) as payout_count,
          MAX(CAST(value AS DOUBLE) / 1000000.0) as highest_payout
        FROM base.transfers
        WHERE token_address = '${usdcAddress.toLowerCase()}'
          AND from_address = '${contractAddress.toLowerCase()}'
          AND to_address = '${playerAddress.toLowerCase()}'
      )
      SELECT 
        pg.total_games,
        pg.perfect_rounds,
        pg.first_game,
        pg.last_game,
        COALESCE(pe.total_earnings, 0) as total_earnings,
        COALESCE(pe.payout_count, 0) as payout_count,
        COALESCE(pe.highest_payout, 0) as highest_payout
      FROM player_games pg
      LEFT JOIN player_earnings pe ON true
    `;

    const response = await this.executeQuery(sql);
    return response.result[0] || null;
  }

  /**
   * Get recent game events for activity feed
   */
  async getRecentGameEvents(contractAddress: string, limit: number = 20): Promise<any[]> {
    const sql = `
      SELECT 
        event_name,
        transaction_from as player,
        block_timestamp,
        transaction_hash,
        parameters
      FROM base.events
      WHERE address = '${contractAddress.toLowerCase()}'
        AND event_name IN ('GameStarted', 'GameCompleted', 'RoundCompleted', 'PerfectRound')
      ORDER BY block_timestamp DESC
      LIMIT ${limit}
    `;

    const response = await this.executeQuery(sql);
    return response.result;
  }

  /**
   * Get leaderboard of top earners
   */
  async getTopEarners(contractAddress: string, usdcAddress: string, limit: number = 10): Promise<any[]> {
    const sql = `
      SELECT 
        to_address as address,
        SUM(CAST(value AS DOUBLE) / 1000000.0) as total_earnings,
        COUNT(*) as payout_count
      FROM base.transfers
      WHERE token_address = '${usdcAddress.toLowerCase()}'
        AND from_address = '${contractAddress.toLowerCase()}'
      GROUP BY to_address
      ORDER BY total_earnings DESC
      LIMIT ${limit}
    `;

    const response = await this.executeQuery(sql);
    return response.result;
  }
}

/**
 * Create CDP SQL client from environment variables
 */
export function createCDPSQLClient(): CDPSQLClient {
  // Check for credentials using both new and legacy variable names
  const keyName = process.env.CDP_API_KEY || process.env.KEY_NAME;
  const keySecret = process.env.CDP_API_SECRET || process.env.KEY_SECRET;

  if (!keyName || !keySecret) {
    throw new Error(
      'CDP API credentials not configured. ' +
      'Add CDP_API_KEY and CDP_API_SECRET to your .env.local file. ' +
      'Get your credentials from: https://portal.cdp.coinbase.com/'
    );
  }

  const config = {
    keyName,
    keySecret,
    requestMethod: 'POST',
    requestHost: 'api.cdp.coinbase.com',
    requestPath: '/platform/v2/data/query/run',
  };

  const jwtGenerator = new CDPJWTGenerator(config);
  return new CDPSQLClient(jwtGenerator);
}

