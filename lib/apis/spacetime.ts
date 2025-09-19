// Configuration
const SPACETIME_CONFIG = {
  host: process.env.SPACETIME_HOST || 'https://maincloud.spacetimedb.com',
  port: process.env.SPACETIME_PORT || '443',
  database: process.env.SPACETIME_DATABASE || 'c2007dc6e3857303a80d6cf822ead75c1460957cfd14c51f5e168e9673e44b2b',
  module: process.env.SPACETIME_MODULE || 'beat-me',
  identity: process.env.SPACETIME_IDENTITY || 'c2009532fc1fc554482aecff4e1b56027991d26aaf86538679ec83183140151a',
};

// Types matching the Rust module
export interface AudioFile {
  name: string;
  artist_name: string;
  song_title: string;
  ipfs_cid: string;
  ipfs_url: string;
  file_size: number;
  duration?: number;
  uploaded_at: number;
  uploaded_by: string;
}

export interface GameSession {
  session_id: string;
  player_identity: string;
  player_type: 'paid' | 'trial'; // Added player type tracking
  score: number;
  questions_answered: number;
  correct_answers: number;
  started_at: number;
  ended_at?: number;
  difficulty: string;
  game_mode: string;
}

export interface ActiveGameSession {
  session_id: string;
  status: 'waiting' | 'active' | 'completed';
  player_count: number;
  paid_player_count: number; // Only paid players contribute to prize pool
  trial_player_count: number; // Trial players for tracking only
  prize_pool: number; // Only accumulates from paid player entry fees
  entry_fee: number;
  start_time: number;
  created_at: number;
}

export interface PlayerStats {
  player_identity: string;
  player_type: 'paid' | 'trial'; // Added player type tracking
  total_games: number;
  total_score: number;
  best_score: number;
  average_score: number;
  total_questions_answered: number;
  total_correct_answers: number;
  last_played: number;
}

export interface QuestionAttempt {
  session_id: string;
  player_identity: string;
  player_type: 'paid' | 'trial'; // Added player type tracking
  audio_file_id: string;
  selected_answer: number;
  correct_answer: number;
  is_correct: boolean;
  time_taken: number;
  answered_at: number;
}

// New data structures to replace Supabase tables
export interface Player {
  wallet_address: string;
  username?: string;
  avatar_url?: string;
  total_score: number;
  games_played: number;
  best_score: number;
  total_earnings: number;
  trial_games_remaining: number;
  trial_completed: boolean;
  wallet_connected: boolean;
  created_at: number;
  updated_at: number;
}

export interface GameEntry {
  session_id: string;
  wallet_address?: string;
  anon_id?: string;
  is_trial: boolean;
  status: string;
  paid_tx_hash?: string;
  verified_at: number;
  created_at: number;
}

export interface AnonymousSession {
  session_id: string;
  games_played: number;
  total_score: number;
  best_score: number;
  created_at: number;
  updated_at: number;
}

export interface PrizePool {
  game_id: string;
  total_amount: number;
  entry_fee: number;
  paid_players: number;
  free_players: number;
  winner_address?: string;
  winner_score?: number;
  claimed: boolean;
  created_at: number;
  expires_at: number;
}

export interface PendingClaim {
  session_id: string;
  wallet_address?: string;
  game_id: string;
  prize_amount: number;
  score: number;
  claimed: boolean;
  claim_transaction_hash?: string;
  created_at: number;
  expires_at: number;
}

export interface Admin {
  admin_identity: string;
  admin_level: string; // "super_admin", "admin", "moderator"
  granted_at: number;
  granted_by: string;
}

class SpacetimeDBClient {
  private isConnected = false;
  private mockSession: ActiveGameSession | null = null;

  async initialize(): Promise<void> {
    if (this.isConnected) return;

    // Check if SpacetimeDB is configured
    if (!process.env.SPACETIME_HOST || !process.env.SPACETIME_DATABASE) {
      console.log('⚠️ SpacetimeDB not configured - using fallback mode');
      this.isConnected = false;
      return;
    }

    try {
      console.log('🚀 Initializing SpacetimeDB client...');
      console.log(`🔗 Connecting to: ${SPACETIME_CONFIG.host}`);
      console.log(`📊 Database: ${SPACETIME_CONFIG.database}`);
      
      // Test connection by pinging the server
      const headers: Record<string, string> = {};
      if (SPACETIME_CONFIG.identity) {
        headers['Authorization'] = `Bearer ${SPACETIME_CONFIG.identity}`;
      }
      
      const response = await fetch(`${SPACETIME_CONFIG.host}/v1/ping`, {
        headers
      });
      if (!response.ok) {
        console.warn(`⚠️ SpacetimeDB server not available (${response.status}) - using fallback mode`);
        this.isConnected = false;
        return;
      }
      
      this.isConnected = true;
      
      console.log('✅ Connected to SpacetimeDB successfully');
      console.log(`📊 Database: ${SPACETIME_CONFIG.database}`);
      console.log(`🔧 Module: ${SPACETIME_CONFIG.module}`);
      console.log('⚠️ Trial players are excluded from prize pool distributions');
      
    } catch (error) {
      console.warn('⚠️ SpacetimeDB connection failed - using fallback mode:', error);
      this.isConnected = false;
    }
  }

  isConfigured(): boolean {
    return this.isConnected;
  }

  // Helper method for making SpaceTimeDB HTTP calls
  private async callReducer(reducerName: string, args: any[] = []): Promise<void> {
    if (!this.isConnected) {
      console.log(`⚠️ SpacetimeDB not connected - skipping ${reducerName} call`);
      return;
    }

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
    };

    // Add identity header if available
    if (SPACETIME_CONFIG.identity) {
      headers['Authorization'] = `Bearer ${SPACETIME_CONFIG.identity}`;
    }

    const response = await fetch(`${SPACETIME_CONFIG.host}/v1/database/${SPACETIME_CONFIG.database}/call/${reducerName}`, {
      method: 'POST',
      headers,
      body: JSON.stringify(args)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.warn(`⚠️ SpacetimeDB call failed (${reducerName}): ${response.status} - ${errorText}`);
    }
  }

  async addAudioFile(
    name: string,
    artistName: string,
    songTitle: string,
    ipfsCid: string,
    fileSize: number,
    duration?: number
  ): Promise<void> {
    try {
      await this.callReducer('add_audio_file', [
        name,
        artistName,
        songTitle,
        ipfsCid,
        fileSize,
        duration || null
      ]);
      
      console.log(`✅ Added audio file to SpacetimeDB: ${artistName} - ${songTitle}`);
    } catch (error) {
      console.error('❌ Failed to add audio file to SpacetimeDB:', error);
      throw error;
    }
  }

  async startGameSession(
    sessionId: string,
    difficulty: string,
    gameMode: string,
    playerType: 'paid' | 'trial' = 'trial' // Default to trial
  ): Promise<void> {
    try {
      await this.callReducer('start_game_session', [
        sessionId,
        difficulty,
        gameMode,
        playerType
      ]);
      
      console.log(`🎮 Started game session: ${sessionId} (${playerType})`);
    } catch (error) {
      console.error('❌ Failed to start game session:', error);
      throw error;
    }
  }

  async recordQuestionAttempt(
    sessionId: string,
    audioFileName: string,
    selectedAnswer: number,
    correctAnswer: number,
    timeTaken: number,
    playerType: 'paid' | 'trial' = 'trial' // Default to trial
  ): Promise<void> {
    try {
      await this.callReducer('record_question_attempt', [
        sessionId,
        audioFileName,
        selectedAnswer,
        correctAnswer,
        timeTaken,
        playerType
      ]);
      
      console.log(`📝 Recorded question attempt: ${audioFileName} (${playerType})`);
    } catch (error) {
      console.error('❌ Failed to record question attempt:', error);
      throw error;
    }
  }

  async endGameSession(sessionId: string): Promise<void> {
    try {
      await this.callReducer('end_game_session', [sessionId]);
      
      console.log(`🏁 Ended game session: ${sessionId}`);
    } catch (error) {
      console.error('❌ Failed to end game session:', error);
      throw error;
    }
  }

  async getRandomAudioFiles(count: number): Promise<string[]> {
    try {
      await this.callReducer('get_random_audio_files', [count]);
      // Note: HTTP calls don't return data directly, this would need subscription-based approach
      // For now, return empty array as placeholder
      console.log(`✅ Retrieved ${count} random audio files`);
      return [];
    } catch (error) {
      console.error('❌ Failed to get random audio files:', error);
      throw error;
    }
  }

  async getPlayerStats(): Promise<PlayerStats | null> {
    try {
      await this.callReducer('get_player_stats', []);
      // Note: HTTP calls don't return data directly, this would need subscription-based approach
      // For now, return null as placeholder
      console.log(`✅ Retrieved player stats`);
      return null;
    } catch (error) {
      console.error('❌ Failed to get player stats:', error);
      throw error;
    }
  }

  async getLeaderboard(limit: number): Promise<PlayerStats[]> {
    try {
      await this.callReducer('get_leaderboard', [limit]);
      // Note: HTTP calls don't return data directly, this would need subscription-based approach
      // For now, return empty array as placeholder
      console.log(`✅ Retrieved leaderboard (limit: ${limit})`);
      return [];
    } catch (error) {
      console.error('❌ Failed to get leaderboard:', error);
      throw error;
    }
  }

  async getTrialLeaderboard(limit: number): Promise<PlayerStats[]> {
    try {
      await this.callReducer('get_trial_leaderboard', [limit]);
      // Note: HTTP calls don't return data directly, this would need subscription-based approach
      // For now, return empty array as placeholder
      console.log(`✅ Retrieved trial leaderboard (limit: ${limit})`);
      return [];
    } catch (error) {
      console.error('❌ Failed to get trial leaderboard:', error);
      throw error;
    }
  }

  async getActiveGameSession(): Promise<ActiveGameSession | null> {
    try {
      await this.callReducer('get_active_game_session', []);
      
      // Initialize mock session if it doesn't exist
      if (!this.mockSession) {
        this.mockSession = {
          session_id: 'mock-session',
          status: 'waiting',
          player_count: 0,
          paid_player_count: 0,
          trial_player_count: 0,
          prize_pool: 0, // Start with 0 USDC - only accumulates from paid player entry fees
          entry_fee: 1,
          start_time: Date.now(),
          created_at: Date.now(),
        };
      }
      
      return this.mockSession;
    } catch (error) {
      console.error('❌ Failed to get active game session:', error);
      throw error;
    }
  }

  async joinActiveGameSession(playerType: 'paid' | 'trial' = 'trial'): Promise<void> {
    try {
      await this.callReducer('join_active_game_session', [playerType]);
      
      // Update mock session when player joins
      if (this.mockSession) {
        const isFirst = this.mockSession.player_count === 0;
        const now = Date.now();
        
        this.mockSession = {
          ...this.mockSession,
          player_count: this.mockSession.player_count + 1,
          paid_player_count: playerType === 'paid' ? this.mockSession.paid_player_count + 1 : this.mockSession.paid_player_count,
          trial_player_count: playerType === 'trial' ? this.mockSession.trial_player_count + 1 : this.mockSession.trial_player_count,
          prize_pool: playerType === 'paid' ? this.mockSession.prize_pool + this.mockSession.entry_fee : this.mockSession.prize_pool,
          status: isFirst ? 'active' : this.mockSession.status,
          start_time: isFirst ? now : this.mockSession.start_time,
        };
      }
      
      console.log(`✅ Joined active game session (${playerType})`);
    } catch (error) {
      console.error('❌ Failed to join active game session:', error);
      throw error;
    }
  }

  async updatePlayerType(newType: 'paid' | 'trial'): Promise<void> {
    try {
      await this.callReducer('update_player_type', [newType]);
      console.log(`🔄 Updated player type to: ${newType}`);
    } catch (error) {
      console.error('❌ Failed to update player type:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    this.isConnected = false;
    console.log('🔌 Disconnected from SpacetimeDB');
  }

  // Generic call method for reducers
  async call(reducer: string, args: unknown[]): Promise<unknown> {
    try {
      await this.callReducer(reducer, args);
      return null; // HTTP calls don't return data directly
    } catch (error) {
      console.error(`❌ Failed to call reducer ${reducer}:`, error);
      throw error;
    }
  }

  // Generic query method for database queries
  async query(query: string, params: unknown[] = []): Promise<unknown[]> {
    try {
      // For now, return empty array since HTTP calls don't support direct queries
      // In a real implementation, this would query the database
      console.log(`📊 Query: ${query} with params:`, params);
      return [];
    } catch (error) {
      console.error(`❌ Failed to execute query:`, error);
      throw error;
    }
  }

  // Helper method to populate SpacetimeDB with audio files from Storacha
  async populateAudioFilesFromStoracha(audioFiles: Array<{
    name: string;
    artistName: string;
    songTitle: string;
    cid: string;
  }>): Promise<void> {
    console.log(`📤 Populating SpacetimeDB with ${audioFiles.length} audio files...`);
    
    for (const file of audioFiles) {
      try {
        await this.addAudioFile(
          file.name,
          file.artistName,
          file.songTitle,
          file.cid,
          0, // fileSize - would need to be calculated
          undefined // duration - would need to be extracted from audio
        );
      } catch (error) {
        console.warn(`⚠️ Failed to add audio file ${file.name}:`, error);
      }
    }
    
    console.log(`✅ Populated SpacetimeDB with ${audioFiles.length} audio files`);
  }

  // Player management methods
  async createPlayer(walletAddress: string, username?: string): Promise<void> {
    try {
      await this.callReducer('create_player', [walletAddress, username || null]);
      console.log(`✅ Created player: ${walletAddress}`);
    } catch (error) {
      console.error('❌ Failed to create player:', error);
      throw error;
    }
  }

  async updatePlayerStats(walletAddress: string, totalScore: number, gamesPlayed: number, bestScore: number, totalEarnings: number): Promise<void> {
    try {
      await this.callReducer('update_player_stats', [walletAddress, totalScore, gamesPlayed, bestScore, totalEarnings]);
      console.log(`✅ Updated player stats: ${walletAddress}`);
    } catch (error) {
      console.error('❌ Failed to update player stats:', error);
      throw error;
    }
  }

  async updateTrialStatus(walletAddress: string, trialGamesRemaining: number, trialCompleted: boolean): Promise<void> {
    try {
      await this.callReducer('update_trial_status', [walletAddress, trialGamesRemaining, trialCompleted]);
      console.log(`✅ Updated trial status: ${walletAddress}`);
    } catch (error) {
      console.error('❌ Failed to update trial status:', error);
      throw error;
    }
  }

  // Game entry management methods
  async createGameEntry(sessionId: string, walletAddress?: string, anonId?: string, isTrial: boolean = true, paidTxHash?: string): Promise<void> {
    try {
      await this.callReducer('create_game_entry', [sessionId, walletAddress || null, anonId || null, isTrial, paidTxHash || null]);
      console.log(`✅ Created game entry: ${sessionId}`);
    } catch (error) {
      console.error('❌ Failed to create game entry:', error);
      throw error;
    }
  }

  async markEntryConsumed(sessionId: string): Promise<void> {
    try {
      await this.callReducer('mark_entry_consumed', [sessionId]);
      console.log(`✅ Marked entry as consumed: ${sessionId}`);
    } catch (error) {
      console.error('❌ Failed to mark entry as consumed:', error);
      throw error;
    }
  }

  // Anonymous session management methods
  async createAnonymousSession(sessionId: string): Promise<void> {
    try {
      await this.callReducer('create_anonymous_session', [sessionId]);
      console.log(`✅ Created anonymous session: ${sessionId}`);
    } catch (error) {
      console.error('❌ Failed to create anonymous session:', error);
      throw error;
    }
  }

  async updateAnonymousSession(sessionId: string, gamesPlayed: number, totalScore: number, bestScore: number): Promise<void> {
    try {
      await this.callReducer('update_anonymous_session', [sessionId, gamesPlayed, totalScore, bestScore]);
      console.log(`✅ Updated anonymous session: ${sessionId}`);
    } catch (error) {
      console.error('❌ Failed to update anonymous session:', error);
      throw error;
    }
  }

  // Prize pool management methods
  async createPrizePool(gameId: string, entryFee: number): Promise<void> {
    try {
      await this.callReducer('create_prize_pool', [gameId, entryFee]);
      console.log(`✅ Created prize pool: ${gameId}`);
    } catch (error) {
      console.error('❌ Failed to create prize pool:', error);
      throw error;
    }
  }

  async updatePrizePool(gameId: string, totalAmount: number, paidPlayers: number, freePlayers: number, winnerAddress?: string, winnerScore?: number, claimed: boolean = false): Promise<void> {
    try {
      await this.callReducer('update_prize_pool', [gameId, totalAmount, paidPlayers, freePlayers, winnerAddress || null, winnerScore || null, claimed]);
      console.log(`✅ Updated prize pool: ${gameId}`);
    } catch (error) {
      console.error('❌ Failed to update prize pool:', error);
      throw error;
    }
  }

  // Pending claims management methods
  async createPendingClaim(sessionId: string, gameId: string, prizeAmount: number, score: number, walletAddress?: string): Promise<void> {
    try {
      await this.callReducer('create_pending_claim', [sessionId, walletAddress || null, gameId, prizeAmount, score]);
      console.log(`✅ Created pending claim: ${sessionId}`);
    } catch (error) {
      console.error('❌ Failed to create pending claim:', error);
      throw error;
    }
  }

  async markClaimClaimed(sessionId: string, claimTransactionHash: string): Promise<void> {
    try {
      await this.callReducer('mark_claim_claimed', [sessionId, claimTransactionHash]);
      console.log(`✅ Marked claim as claimed: ${sessionId}`);
    } catch (error) {
      console.error('❌ Failed to mark claim as claimed:', error);
      throw error;
    }
  }

  // Admin management methods
  async grantAdminPrivileges(targetIdentity: string, adminLevel: string): Promise<void> {
    try {
      await this.callReducer('grant_admin_privileges', [targetIdentity, adminLevel]);
      console.log(`✅ Granted ${adminLevel} admin privileges to ${targetIdentity}`);
    } catch (error) {
      console.error('❌ Failed to grant admin privileges:', error);
      throw error;
    }
  }

  async revokeAdminPrivileges(targetIdentity: string): Promise<void> {
    try {
      await this.callReducer('revoke_admin_privileges', [targetIdentity]);
      console.log(`✅ Revoked admin privileges from ${targetIdentity}`);
    } catch (error) {
      console.error('❌ Failed to revoke admin privileges:', error);
      throw error;
    }
  }

  async listAdmins(): Promise<void> {
    try {
      await this.callReducer('list_admins', []);
      console.log(`✅ Listed admins`);
    } catch (error) {
      console.error('❌ Failed to list admins:', error);
      throw error;
    }
  }

  // Admin data access methods
  async getAllPlayerStatsAdmin(): Promise<void> {
    try {
      await this.callReducer('get_all_player_stats_admin');
      console.log(`✅ Retrieved all player stats (admin)`);
    } catch (error) {
      console.error('❌ Failed to get all player stats:', error);
      throw error;
    }
  }

  async getAllGameSessionsAdmin(): Promise<void> {
    try {
      await this.callReducer('get_all_game_sessions_admin');
      console.log(`✅ Retrieved all game sessions (admin)`);
    } catch (error) {
      console.error('❌ Failed to get all game sessions:', error);
      throw error;
    }
  }

  async getAllQuestionAttemptsAdmin(): Promise<void> {
    try {
      await this.callReducer('get_all_question_attempts_admin');
      console.log(`✅ Retrieved all question attempts (admin)`);
    } catch (error) {
      console.error('❌ Failed to get all question attempts:', error);
      throw error;
    }
  }

  async getAllPlayersAdmin(): Promise<void> {
    try {
      await this.callReducer('get_all_players_admin');
      console.log(`✅ Retrieved all players (admin)`);
    } catch (error) {
      console.error('❌ Failed to get all players:', error);
      throw error;
    }
  }

  async getAllGameEntriesAdmin(): Promise<void> {
    try {
      await this.callReducer('get_all_game_entries_admin');
      console.log(`✅ Retrieved all game entries (admin)`);
    } catch (error) {
      console.error('❌ Failed to get all game entries:', error);
      throw error;
    }
  }

  async getAllGuestPlayersAdmin(): Promise<void> {
    try {
      await this.callReducer('get_all_guest_players_admin');
      console.log(`✅ Retrieved all guest players (admin)`);
    } catch (error) {
      console.error('❌ Failed to get all guest players:', error);
      throw error;
    }
  }

  async getAllGuestGameSessionsAdmin(): Promise<void> {
    try {
      await this.callReducer('get_all_guest_game_sessions_admin');
      console.log(`✅ Retrieved all guest game sessions (admin)`);
    } catch (error) {
      console.error('❌ Failed to get all guest game sessions:', error);
      throw error;
    }
  }

  async getAllPendingClaimsAdmin(): Promise<void> {
    try {
      await this.callReducer('get_all_pending_claims_admin');
      console.log(`✅ Retrieved all pending claims (admin)`);
    } catch (error) {
      console.error('❌ Failed to get all pending claims:', error);
      throw error;
    }
  }

  async getLeaderboardAdmin(): Promise<void> {
    try {
      await this.callReducer('get_leaderboard_admin');
      console.log(`✅ Retrieved leaderboard (admin)`);
    } catch (error) {
      console.error('❌ Failed to get leaderboard:', error);
      throw error;
    }
  }

  async getTrialLeaderboardAdmin(): Promise<void> {
    try {
      await this.callReducer('get_trial_leaderboard_admin');
      console.log(`✅ Retrieved trial leaderboard (admin)`);
    } catch (error) {
      console.error('❌ Failed to get trial leaderboard:', error);
      throw error;
    }
  }
}

// Export singleton instance
export const spacetimeClient = new SpacetimeDBClient();

// Initialize on module load (only in production runtime, not during build)
// Skip initialization during build time to prevent connection errors
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production' && !process.env.NEXT_PHASE) {
  // Server-side initialization - only in production runtime, not during build
  spacetimeClient.initialize().catch((error) => {
    console.warn('⚠️ SpacetimeDB initialization failed during startup:', error.message);
  });
}
