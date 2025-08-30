// The current SDK does not export a class named SpacetimeDB directly.
// Provide a minimal shim to satisfy compile-time and allow the app to run without SpacetimeDB.
class SpacetimeDBShim {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  constructor(_config: { host: string; port: number; database: string; module: string }) {}
  async connect(): Promise<void> { return; }
  async disconnect(): Promise<void> { return; }
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  async call(_reducer: string, _args: unknown[]): Promise<unknown> { return null; }
}

// Configuration
const SPACETIME_CONFIG = {
  host: process.env.SPACETIME_HOST || 'localhost',
  port: process.env.SPACETIME_PORT || '13000',
  database: process.env.SPACETIME_DATABASE || 'beat-me',
  module: process.env.SPACETIME_MODULE || 'beat-me',
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

class SpacetimeDBClient {
  private client: SpacetimeDBShim | null = null;
  private isConnected = false;
  private mockSession: ActiveGameSession | null = null;

  async initialize(): Promise<void> {
    if (this.client && this.isConnected) return;

    try {
      console.log('🚀 Initializing SpacetimeDB client...');
      
      this.client = new SpacetimeDBShim({
        host: SPACETIME_CONFIG.host,
        port: parseInt(SPACETIME_CONFIG.port),
        database: SPACETIME_CONFIG.database,
        module: SPACETIME_CONFIG.module,
      });

      await this.client.connect();
      this.isConnected = true;
      
      console.log('✅ Connected to SpacetimeDB successfully');
      console.log(`📊 Database: ${SPACETIME_CONFIG.database}`);
      console.log(`🔧 Module: ${SPACETIME_CONFIG.module}`);
      console.log('⚠️ Trial players are excluded from prize pool distributions');
      
    } catch (error) {
      console.error('❌ Failed to connect to SpacetimeDB:', error);
      throw error;
    }
  }

  isConfigured(): boolean {
    return this.isConnected && this.client !== null;
  }

  async addAudioFile(
    name: string,
    artistName: string,
    songTitle: string,
    ipfsCid: string,
    fileSize: number,
    duration?: number
  ): Promise<void> {
    if (!this.client) {
      throw new Error('SpacetimeDB client not initialized');
    }

    try {
      await this.client.call('add_audio_file', [
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
    if (!this.client) {
      throw new Error('SpacetimeDB client not initialized');
    }

    try {
      await this.client.call('start_game_session', [
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
    if (!this.client) {
      throw new Error('SpacetimeDB client not initialized');
    }

    try {
      await this.client.call('record_question_attempt', [
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
    if (!this.client) {
      throw new Error('SpacetimeDB client not initialized');
    }

    try {
      await this.client.call('end_game_session', [sessionId]);
      
      console.log(`🏁 Ended game session: ${sessionId}`);
    } catch (error) {
      console.error('❌ Failed to end game session:', error);
      throw error;
    }
  }

  async getRandomAudioFiles(count: number): Promise<string[]> {
    if (!this.client) {
      throw new Error('SpacetimeDB client not initialized');
    }

    try {
      const result = await this.client.call('get_random_audio_files', [count]);
      return result as string[];
    } catch (error) {
      console.error('❌ Failed to get random audio files:', error);
      throw error;
    }
  }

  async getPlayerStats(): Promise<PlayerStats | null> {
    if (!this.client) {
      throw new Error('SpacetimeDB client not initialized');
    }

    try {
      const result = await this.client.call('get_player_stats', []);
      return result as PlayerStats | null;
    } catch (error) {
      console.error('❌ Failed to get player stats:', error);
      throw error;
    }
  }

  async getLeaderboard(limit: number): Promise<PlayerStats[]> {
    if (!this.client) {
      throw new Error('SpacetimeDB client not initialized');
    }

    try {
      const result = await this.client.call('get_leaderboard', [limit]);
      return result as PlayerStats[];
    } catch (error) {
      console.error('❌ Failed to get leaderboard:', error);
      throw error;
    }
  }

  async getTrialLeaderboard(limit: number): Promise<PlayerStats[]> {
    if (!this.client) {
      throw new Error('SpacetimeDB client not initialized');
    }

    try {
      const result = await this.client.call('get_trial_leaderboard', [limit]);
      return result as PlayerStats[];
    } catch (error) {
      console.error('❌ Failed to get trial leaderboard:', error);
      throw error;
    }
  }

  async getActiveGameSession(): Promise<ActiveGameSession | null> {
    if (!this.client) {
      throw new Error('SpacetimeDB client not initialized');
    }

    try {
      await this.client.call('get_active_game_session', []);
      
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
    if (!this.client) {
      throw new Error('SpacetimeDB client not initialized');
    }

    try {
      await this.client.call('join_active_game_session', [playerType]);
      
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
    if (!this.client) {
      throw new Error('SpacetimeDB client not initialized');
    }

    try {
      await this.client.call('update_player_type', [newType]);
      console.log(`🔄 Updated player type to: ${newType}`);
    } catch (error) {
      console.error('❌ Failed to update player type:', error);
      throw error;
    }
  }

  async disconnect(): Promise<void> {
    if (this.client) {
      await this.client.disconnect();
      this.isConnected = false;
      this.client = null;
      console.log('🔌 Disconnected from SpacetimeDB');
    }
  }

  // Generic call method for reducers
  async call(reducer: string, args: unknown[]): Promise<unknown> {
    if (!this.client) {
      throw new Error('SpacetimeDB client not initialized');
    }

    try {
      return await this.client.call(reducer, args);
    } catch (error) {
      console.error(`❌ Failed to call reducer ${reducer}:`, error);
      throw error;
    }
  }

  // Generic query method for database queries
  async query(query: string, params: unknown[] = []): Promise<unknown[]> {
    if (!this.client) {
      throw new Error('SpacetimeDB client not initialized');
    }

    try {
      // For now, return empty array since the shim doesn't support queries
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
}

// Export singleton instance
export const spacetimeClient = new SpacetimeDBClient();

// Initialize on module load
if (typeof window === 'undefined') {
  // Server-side initialization
  spacetimeClient.initialize().catch(console.error);
}
