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
  private baseUrl = 'https://api.testnet-dataengine.chain.link/api/v1';
  private apiKey: string;
  private apiSecret: string;

  constructor(jwtGenerator: CDPJWTGenerator) {
    this.jwtGenerator = jwtGenerator;
    // Extract credentials from the JWT generator config
    const config = (jwtGenerator as any).config;
    this.apiKey = config.keyName;
    this.apiSecret = config.keySecret;
  }

  /**
   * Generate HMAC-based authentication headers for CDP API
   */
  private generateAuthHeaders(method: string, path: string, body: any): Record<string, string> {
    const crypto = require('crypto');
    
    // Generate timestamp (milliseconds since Unix epoch)
    const timestamp = Date.now();
    
    // Create body hash
    const bodyString = JSON.stringify(body);
    const bodyHash = crypto.createHash('sha256').update(bodyString).digest('hex');
    
    // Create string to sign: METHOD FULL_PATH BODY_HASH API_KEY TIMESTAMP
    const stringToSign = `${method} ${path} ${bodyHash} ${this.apiKey} ${timestamp}`;
    
    // Generate HMAC-SHA256 signature
    const signature = crypto.createHmac('sha256', this.apiSecret).update(stringToSign).digest('hex');
    
    return {
      'Authorization': this.apiKey,
      'X-Authorization-Timestamp': timestamp.toString(),
      'X-Authorization-Signature-SHA256': signature
    };
  }

  /**
   * Execute a SQL query against Chainlink Data Streams API
   */
  async executeQuery(sql: string): Promise<CDPSQLResponse> {
    // Use HMAC-based authentication for Chainlink Data Streams API
    const authHeaders = this.generateAuthHeaders('GET', '/reports/latest', {});
    
    // Debug logging
    console.log('Chainlink Data Streams API Request:', {
      url: `${this.baseUrl}/reports/latest`,
      sqlLength: sql.length,
      hasAuth: !!authHeaders.Authorization,
      hasTimestamp: !!authHeaders['X-Authorization-Timestamp'],
      hasSignature: !!authHeaders['X-Authorization-Signature-SHA256']
    });

    const response = await fetch(`${this.baseUrl}/reports/latest`, {
      method: 'GET',
      headers: {
        ...authHeaders,
        'Content-Type': 'application/json'
      }
    });

    if (!response.ok) {
      const errorBody = await response.json().catch(() => null);
      const errorMessage = errorBody?.message || errorBody?.error || response.statusText;
      
      // Enhanced debugging for 401 errors
      if (response.status === 401) {
        console.error('CDP API 401 Error Details:', {
          status: response.status,
          statusText: response.statusText,
          errorBody,
          url: `${this.baseUrl}/run`,
          headers: {
            'Authorization': `${this.apiKey.substring(0, 8)}...`,
            'Content-Type': 'application/json'
          }
        });
        
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

  // Debug logging
  console.log('CDP Credentials Check:', {
    hasCDPKey: !!process.env.CDP_API_KEY,
    hasCDPSecret: !!process.env.CDP_API_SECRET,
    hasLegacyKey: !!process.env.KEY_NAME,
    hasLegacySecret: !!process.env.KEY_SECRET,
    keyNameLength: keyName?.length || 0,
    keySecretLength: keySecret?.length || 0
  });

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

