/**
 * SpacetimeDB Client API
 * 
 * Unified API for interacting with SpacetimeDB using the new SDK
 */

import { 
  DbConnection, 
  type DbConnectionImpl,
  type Player,
  type GameSession,
  type ActiveGameSession,
  type PlayerStats,
  type AudioFile,
  type PendingClaim,
  type PrizeHistory,
  type GameEntry,
  type AnonymousSession,
  type PrizePool,
  type Admin,
  PlayerType,
} from '../spacetime/database';

// Re-export types for convenience
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
};

export interface TopEarner {
  walletAddress: string;
  username: string | undefined;
  avatarUrl: string | undefined;
  totalEarnings: number;
  gamesPlayed: number;
  bestScore: number;
}

// Configuration
const SPACETIME_CONFIG = {
  host: process.env.SPACETIME_HOST || 'https://maincloud.spacetimedb.com',
  module: process.env.SPACETIME_MODULE || 'beat-me',
};

/**
 * SpacetimeDB Client - Singleton wrapper around DbConnection
 */
class SpacetimeDBClient {
  private connection: DbConnectionImpl | null = null;
  private isConnected = false;
  private connectionPromise: Promise<void> | null = null;

  /**
   * Initialize the SpacetimeDB connection
   */
  async initialize(): Promise<void> {
    if (this.connectionPromise) {
      return this.connectionPromise;
    }

    if (this.isConnected && this.connection) {
      return Promise.resolve();
    }

    this.connectionPromise = this._doInitialize();
    return this.connectionPromise;
  }

  private async _doInitialize(): Promise<void> {
    // Check if SpacetimeDB is configured
    if (!process.env.SPACETIME_HOST || !process.env.SPACETIME_MODULE) {
      console.log('⚠️ SpacetimeDB not configured - using fallback mode');
      this.isConnected = false;
      return;
    }

    try {
      console.log('🚀 Initializing SpacetimeDB client...');
      console.log(`🔗 Connecting to: ${SPACETIME_CONFIG.host}`);
      console.log(`🔧 Module: ${SPACETIME_CONFIG.module}`);

      // Wait for connection to be established
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('SpaceTimeDB connection timeout'));
        }, 10000);

        let connectionResolved = false;

        // Create connection builder with event handlers
        const builder = DbConnection.builder()
          .withUri(SPACETIME_CONFIG.host)  // Just the host URL - SDK handles WebSocket conversion
          .withModuleName(SPACETIME_CONFIG.module)
          .onConnect((conn, identity, token) => {
            if (connectionResolved) return;
            connectionResolved = true;
            clearTimeout(timeout);
            
            console.log('✅ Connected to SpacetimeDB');
            console.log(`   Identity: ${identity.toHexString()}`);
            console.log(`   Token: ${token ? '***' + token.slice(-8) : 'None'}`);
            this.connection = conn;
            this.isConnected = true;
            
            // Subscribe to all tables for live updates
            conn.subscriptionBuilder()
              .onApplied(() => {
                console.log('✅ SpacetimeDB subscription applied');
              })
              .subscribeToAllTables();
            
            resolve();
          })
          .onDisconnect(() => {
            console.log('🔌 Disconnected from SpacetimeDB');
            this.isConnected = false;
          })
          .onConnectError((error) => {
            if (connectionResolved) return;
            connectionResolved = true;
            clearTimeout(timeout);
            console.error('❌ SpacetimeDB connection error:', error);
            this.isConnected = false;
            reject(error);
          });

        // Anonymous connection - no token needed
        // The SDK will generate and manage identity automatically

        // Build connection (this initiates the WebSocket connection)
        builder.build();
      });

      console.log('✅ SpacetimeDB client initialized successfully');
    } catch (error) {
      console.warn('⚠️ SpacetimeDB connection failed - using fallback mode:', error);
      this.isConnected = false;
      throw error;
    } finally {
      this.connectionPromise = null;
    }
  }

  /**
   * Check if configured and connected
   */
  isConfigured(): boolean {
    return this.isConnected && this.connection !== null;
  }

  /**
   * Get the active connection
   */
  getConnection(): DbConnectionImpl | null {
    return this.connection;
  }

  /**
   * Disconnect from SpacetimeDB
   */
  async disconnect(): Promise<void> {
    if (this.connection) {
      this.connection.disconnect();
      this.connection = null;
      this.isConnected = false;
      console.log('🔌 Disconnected from SpacetimeDB');
    }
  }

  /**
   * Generic call method for reducers (legacy compatibility)
   */
  async call(reducerName: string, args: any[]): Promise<void> {
    if (!this.connection) {
      throw new Error('Not connected to SpacetimeDB');
    }

    // @ts-ignore - Dynamic reducer call
    if (typeof this.connection.reducers[reducerName] === 'function') {
      // @ts-ignore
      await this.connection.reducers[reducerName](...args);
    } else {
      throw new Error(`Reducer ${reducerName} not found`);
    }
  }

  /**
   * @deprecated Raw SQL queries are not supported by SpacetimeDB TypeScript SDK.
   * Use the specific query methods instead:
   * - getPlayerProfile(walletAddress) - for player lookups
   * - getAnonymousSession(sessionId) - for anonymous sessions
   * - getGuestPlayer(guestId) - for guest players
   * - getGuestGameSessions(guestId, limit) - for guest game sessions
   * - Or access tables directly via this.connection.db.tableName.iter()
   * 
   * @throws Error explaining the proper methods to use
   */
  async query(_sql: string, _args: any[] = []): Promise<any[]> {
    throw new Error(
      'Raw SQL queries are not supported. Use specific methods like:\n' +
      '  - getPlayerProfile(walletAddress)\n' +
      '  - getAnonymousSession(sessionId)\n' +
      '  - getGuestPlayer(guestId)\n' +
      '  - getGuestGameSessions(guestId, limit)\n' +
      'Or access tables directly via connection.db.tableName'
    );
  }

  /**
   * Get anonymous session by session ID
   */
  getAnonymousSession(sessionId: string): AnonymousSession | null {
    if (!this.connection) return null;

    const sessions = Array.from(this.connection.db.anonymousSessions.iter()) as AnonymousSession[];
    const filtered = sessions.filter((s: AnonymousSession) => s.sessionId === sessionId);

    return filtered.length > 0 ? filtered[0] : null;
  }

  /**
   * Get guest player by guest ID
   */
  getGuestPlayer(guestId: string): any | null {
    if (!this.connection) return null;

    const guests = Array.from(this.connection.db.guestPlayers.iter())
      .filter((g: any) => g.guestId === guestId);

    return guests.length > 0 ? guests[0] : null;
  }

  /**
   * Get guest game sessions by guest ID
   */
  getGuestGameSessions(guestId: string, limit: number = 10): any[] {
    if (!this.connection) return [];

    return Array.from(this.connection.db.guestGameSessions.iter())
      .filter((g: any) => g.guestId === guestId)
      .sort((a: any, b: any) => Number(b.startedAt) - Number(a.startedAt))
      .slice(0, limit);
  }

  /**
   * Link current SpacetimeDB identity to wallet address for persistent stats
   */
  async linkWalletToIdentity(walletAddress: string): Promise<void> {
    if (!this.connection) {
      console.warn('⚠️ Not connected to SpacetimeDB');
      return;
    }

    try {
      this.connection.reducers.linkWalletToIdentity(walletAddress);
      console.log(`✅ Linked wallet ${walletAddress} to SpacetimeDB identity`);
    } catch (error) {
      console.error('❌ Failed to link wallet:', error);
      throw error;
    }
  }

  // ============================================================================
  // PLAYER MANAGEMENT
  // ============================================================================

  async createPlayer(walletAddress: string, username?: string): Promise<void> {
    if (!this.connection) {
      console.warn('⚠️ Not connected to SpacetimeDB');
      return;
    }

    try {
      await this.connection.reducers.createPlayer(walletAddress, username);
      console.log(`✅ Created player: ${walletAddress}`);
    } catch (error) {
      console.error('❌ Failed to create player:', error);
      throw error;
    }
  }

  async updatePlayerStats(
    walletAddress: string,
    totalScore: number,
    gamesPlayed: number,
    bestScore: number,
    totalEarnings: number
  ): Promise<void> {
    if (!this.connection) return;

    try {
      await this.connection.reducers.updatePlayerStats(
        walletAddress,
        totalScore,
        gamesPlayed,
        bestScore,
        totalEarnings
      );
      console.log(`✅ Updated player stats: ${walletAddress}`);
    } catch (error) {
      console.error('❌ Failed to update player stats:', error);
      throw error;
    }
  }

  async updateTrialStatus(
    walletAddress: string,
    trialGamesRemaining: number,
    trialCompleted: boolean
  ): Promise<void> {
    if (!this.connection) return;

    try {
      await this.connection.reducers.updateTrialStatus(
        walletAddress,
        trialGamesRemaining,
        trialCompleted
      );
      console.log(`✅ Updated trial status: ${walletAddress}`);
    } catch (error) {
      console.error('❌ Failed to update trial status:', error);
      throw error;
    }
  }

  getPlayerProfile(walletAddress: string): Player | null {
    if (!this.connection) return null;

    const players = (Array.from(this.connection.db.players.iter()) as Player[]).filter(
      (p: Player) => p.walletAddress === walletAddress
    );

    return players.length > 0 ? players[0] : null;
  }

  getActivePlayers(limit: number = 50): Player[] {
    if (!this.connection) return [];

    return (Array.from(this.connection.db.players.iter()) as Player[])
      .filter((p: Player) => p.gamesPlayed > 0)
      .sort((a: Player, b: Player) => Number(b.updatedAt) - Number(a.updatedAt))
      .slice(0, limit);
  }

  // ============================================================================
  // GAME SESSION MANAGEMENT
  // ============================================================================

  async startGameSession(
    sessionId: string,
    difficulty: string,
    gameMode: string,
    playerType: 'paid' | 'trial' = 'trial',
    walletAddress?: string,  // NEW: Required for paid players
    guestId?: string         // NEW: Required for trial/guest
  ): Promise<void> {
    if (!this.connection) return;

    try {
      this.connection.reducers.startGameSession(
        sessionId,
        difficulty,
        gameMode,
        playerType,
        walletAddress || undefined,
        guestId || undefined
      );
      const playerId = walletAddress || guestId || 'unknown';
      console.log(`🎮 Started game session: ${sessionId} for ${playerId} (${playerType})`);
    } catch (error) {
      console.error('❌ Failed to start game session:', error);
      throw error;
    }
  }

  async endGameSession(sessionId: string): Promise<void> {
    if (!this.connection) return;

    try {
      await this.connection.reducers.endGameSession(sessionId);
      console.log(`🏁 Ended game session: ${sessionId}`);
    } catch (error) {
      console.error('❌ Failed to end game session:', error);
      throw error;
    }
  }

  async getActiveGameSession(): Promise<ActiveGameSession | null> {
    if (!this.connection) return null;

    const activeSessions = Array.from(this.connection.db.activeGameSessions.iter()) as ActiveGameSession[];
    return activeSessions.length > 0 ? activeSessions[0] : null;
  }

  async joinActiveGameSession(): Promise<void> {
    if (!this.connection) return;

    try {
      // This would typically call a reducer to join the active session
      // For now, this is a placeholder - implement according to your SpacetimeDB schema
      console.log('🎮 Joined active game session');
    } catch (error) {
      console.error('❌ Failed to join active game session:', error);
      throw error;
    }
  }

  async recordQuestionAttempt(
    sessionId: string,
    audioFileName: string,
    selectedAnswer: number,
    correctAnswer: number,
    timeTaken: number,
    playerType: 'paid' | 'trial' = 'trial'
  ): Promise<void> {
    if (!this.connection) return;

    try {
      await this.connection.reducers.recordQuestionAttempt(
        sessionId,
        audioFileName,
        selectedAnswer,
        correctAnswer,
        timeTaken,
        playerType
      );
      console.log(`📝 Recorded question attempt: ${audioFileName}`);
    } catch (error) {
      console.error('❌ Failed to record question attempt:', error);
      throw error;
    }
  }

  // ============================================================================
  // LEADERBOARD & STATS
  // ============================================================================

  getLeaderboard(limit: number = 10): Player[] {
    if (!this.connection) return [];

    // Get paid players sorted by cumulative USDC earnings
    const players = Array.from(this.connection.db.players.iter()) as Player[];
    return players
      .filter((p: Player) => p.totalEarnings > 0)
      .sort((a: Player, b: Player) => b.totalEarnings - a.totalEarnings)
      .slice(0, limit);
  }

  getTrialLeaderboard(limit: number = 10): any[] {
    if (!this.connection) return [];

    // Trial players tracked in guest_players table, sorted by best score
    return Array.from(this.connection.db.guestPlayers.iter())
      .sort((a: any, b: any) => b.bestScore - a.bestScore)
      .slice(0, limit);
  }

  getTopEarners(limit: number = 10): TopEarner[] {
    if (!this.connection) return [];

    return (Array.from(this.connection.db.players.iter()) as Player[])
      .filter((p: Player) => p.totalEarnings > 0)
      .sort((a: Player, b: Player) => b.totalEarnings - a.totalEarnings)
      .slice(0, limit)
      .map((p: Player) => ({
        walletAddress: p.walletAddress,
        username: p.username,
        avatarUrl: p.avatarUrl,
        totalEarnings: p.totalEarnings,
        gamesPlayed: p.gamesPlayed,
        bestScore: p.bestScore,
      }));
  }

  // ============================================================================
  // AUDIO FILES
  // ============================================================================

  async addAudioFile(
    name: string,
    artistName: string,
    songTitle: string,
    ipfsCid: string,
    fileSize: number,
    duration?: number
  ): Promise<void> {
    if (!this.connection) return;

    try {
      await this.connection.reducers.addAudioFile(
        name,
        artistName,
        songTitle,
        ipfsCid,
        fileSize,
        duration || 0
      );
      console.log(`✅ Added audio file: ${artistName} - ${songTitle}`);
    } catch (error) {
      console.error('❌ Failed to add audio file:', error);
      throw error;
    }
  }

  getAllAudioFiles(): AudioFile[] {
    if (!this.connection) return [];
    return Array.from(this.connection.db.audioFiles.iter());
  }

  // ============================================================================
  // PRIZE & CLAIMS MANAGEMENT
  // ============================================================================

  async createPrizePool(gameId: string, entryFee: number): Promise<void> {
    if (!this.connection) return;

    try {
      await this.connection.reducers.createPrizePool(gameId, entryFee);
      console.log(`✅ Created prize pool: ${gameId}`);
    } catch (error) {
      console.error('❌ Failed to create prize pool:', error);
      throw error;
    }
  }

  async recordPrizeDistribution(
    walletAddress: string,
    sessionId: string,
    prizeAmount: number,
    rank: number
  ): Promise<void> {
    if (!this.connection) return;

    try {
      await this.connection.reducers.recordPrizeDistribution(
        walletAddress,
        sessionId,
        prizeAmount,
        rank
      );
      console.log(`💰 Recorded prize: ${prizeAmount} USDC for ${walletAddress}`);
    } catch (error) {
      console.error('❌ Failed to record prize distribution:', error);
      throw error;
    }
  }

  getPendingClaims(walletAddress?: string): PendingClaim[] {
    if (!this.connection) return [];

    const claims = (Array.from(this.connection.db.pendingClaims.iter()) as PendingClaim[])
      .filter((claim: PendingClaim) => !claim.claimed);

    if (walletAddress) {
      return claims.filter((claim: PendingClaim) => claim.walletAddress === walletAddress);
    }

    return claims;
  }

  getPrizeHistory(walletAddress: string, limit: number = 20): PrizeHistory[] {
    if (!this.connection) return [];

    return (Array.from(this.connection.db.prizeHistory.iter()) as PrizeHistory[])
      .filter((prize: PrizeHistory) => prize.walletAddress === walletAddress)
      .sort((a: PrizeHistory, b: PrizeHistory) => Number(b.gameTimestamp) - Number(a.gameTimestamp))
      .slice(0, limit);
  }

  // ============================================================================
  // GAME ENTRIES
  // ============================================================================

  async createGameEntry(
    sessionId: string,
    walletAddress?: string,
    anonId?: string,
    isTrial: boolean = true,
    paidTxHash?: string
  ): Promise<void> {
    if (!this.connection) return;

    try {
      await this.connection.reducers.createGameEntry(
        sessionId,
        walletAddress || '',
        anonId || '',
        isTrial,
        paidTxHash || ''
      );
      console.log(`✅ Created game entry: ${sessionId}`);
    } catch (error) {
      console.error('❌ Failed to create game entry:', error);
      throw error;
    }
  }

  async markEntryConsumed(sessionId: string): Promise<void> {
    if (!this.connection) return;

    try {
      await this.connection.reducers.markEntryConsumed(sessionId);
      console.log(`✅ Marked entry as consumed: ${sessionId}`);
    } catch (error) {
      console.error('❌ Failed to mark entry as consumed:', error);
      throw error;
    }
  }

  // ============================================================================
  // ANONYMOUS SESSIONS
  // ============================================================================

  async createAnonymousSession(sessionId: string): Promise<void> {
    if (!this.connection) return;

    try {
      await this.connection.reducers.createAnonymousSession(sessionId);
      console.log(`✅ Created anonymous session: ${sessionId}`);
    } catch (error) {
      console.error('❌ Failed to create anonymous session:', error);
      throw error;
    }
  }

  async updateAnonymousSession(
    sessionId: string,
    gamesPlayed: number,
    totalScore: number,
    bestScore: number
  ): Promise<void> {
    if (!this.connection) return;

    try {
      await this.connection.reducers.updateAnonymousSession(
        sessionId,
        gamesPlayed,
        totalScore,
        bestScore
      );
      console.log(`✅ Updated anonymous session: ${sessionId}`);
    } catch (error) {
      console.error('❌ Failed to update anonymous session:', error);
      throw error;
    }
  }

  // ============================================================================
  // ADMIN FUNCTIONS
  // ============================================================================

  async grantAdminPrivileges(targetIdentity: string, adminLevel: string): Promise<void> {
    if (!this.connection) return;

    try {
      await this.connection.reducers.grantAdminPrivileges(targetIdentity, adminLevel);
      console.log(`✅ Granted ${adminLevel} privileges to ${targetIdentity}`);
    } catch (error) {
      console.error('❌ Failed to grant admin privileges:', error);
      throw error;
    }
  }

  async revokeAdminPrivileges(targetIdentity: string): Promise<void> {
    if (!this.connection) return;

    try {
      await this.connection.reducers.revokeAdminPrivileges(targetIdentity);
      console.log(`✅ Revoked admin privileges from ${targetIdentity}`);
    } catch (error) {
      console.error('❌ Failed to revoke admin privileges:', error);
      throw error;
    }
  }

  getAllPlayers(): Player[] {
    if (!this.connection) return [];
    return Array.from(this.connection.db.players.iter());
  }

  getAllGameSessions(): GameSession[] {
    if (!this.connection) return [];
    return Array.from(this.connection.db.gameSessions.iter());
  }

  getAllPlayerStats(): PlayerStats[] {
    if (!this.connection) return [];
    return Array.from(this.connection.db.playerStats.iter());
  }

  getAllAdmins(): Admin[] {
    if (!this.connection) return [];
    return Array.from(this.connection.db.admins.iter());
  }

  /**
   * Get admin record by spacetime identity
   * Note: Admins are identified by their SpacetimeDB Identity, not wallet address
   */
  async getAdminByIdentity(identityHex: string): Promise<Admin | null> {
    if (!this.connection) return null;

    try {
      // Find admin by their SpacetimeDB identity
      // The adminIdentity.find method expects an Identity object, 
      // so we need to compare hex strings manually
      for (const admin of this.connection.db.admins.iter()) {
        if (admin.adminIdentity.toHexString() === identityHex) {
          return admin;
        }
      }
      
      return null;
    } catch (error) {
      console.error('❌ Failed to get admin by identity:', error);
      return null;
    }
  }
}

// Export singleton instance
export const spacetimeClient = new SpacetimeDBClient();

// Initialize on module load (only in production runtime, not during build)
if (typeof window === 'undefined' && process.env.NODE_ENV === 'production' && !process.env.NEXT_PHASE) {
  spacetimeClient.initialize().catch((error) => {
    console.warn('⚠️ SpacetimeDB initialization failed during startup:', error.message);
  });
}
