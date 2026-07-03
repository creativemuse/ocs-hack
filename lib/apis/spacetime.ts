/**
 * SpacetimeDB Client API
 * 
 * Unified API for interacting with SpacetimeDB using the new SDK
 */

import { Identity } from 'spacetimedb';

import {
  buildAppSubscriptionQueries,
  buildGameSessionOnlySubscriptionQueries,
  buildPlayerLookupSubscriptionQueries,
  buildTrialStatusSubscriptionQueries,
  type AppSubscriptionTables,
} from '../spacetime/appSubscriptionQueries';

import {
  DbConnection,
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
} from '../spacetime/database';
import type { PoolPlayer } from '../spacetime/types';
import { pickCurrentActiveGameSession } from './mapSpacetimeGameSession';
import {
  formatSpacetimeConnectError,
  isSpacetimeTokenVerificationError,
} from '../spacetime/connectErrors';

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
export type { PoolPlayer };

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
  host:
    process.env.SPACETIME_HOST ||
    process.env.NEXT_PUBLIC_SPACETIME_HOST ||
    'https://maincloud.spacetimedb.com',
  module:
    process.env.SPACETIME_MODULE ||
    process.env.NEXT_PUBLIC_SPACETIME_MODULE ||
    'beat-me',
};

export interface SpacetimeInitOptions {
  /** Subscribe to player rows on the server before reading profiles. */
  syncPlayers?: boolean;
  /** Subscribe to players + anonymous_sessions for trial-status routes. */
  syncTrialData?: boolean;
}

/**
 * SpacetimeDB Client - Singleton wrapper around DbConnection
 */
class SpacetimeDBClient {
  private connection: DbConnection | null = null;
  private isConnected = false;
  private connectedIdentityHex: string | null = null;
  private connectionPromise: Promise<void> | null = null;
  private initOptions: SpacetimeInitOptions = {};
  private playersSubscribed = false;
  private trialDataSubscribed = false;
  private subscriptionSynced = false;
  private syncPromise: Promise<void> | null = null;
  private syncResolve: (() => void) | null = null;

  private resetSyncState(): void {
    this.subscriptionSynced = false;
    this.syncPromise = null;
    this.syncResolve = null;
  }

  private beginSyncWait(): void {
    if (this.syncPromise) {
      return;
    }

    this.syncPromise = new Promise<void>((resolve) => {
      if (this.subscriptionSynced) {
        resolve();
        return;
      }
      this.syncResolve = resolve;
    });
  }

  private markSubscriptionApplied(): void {
    console.log('✅ SpacetimeDB subscription applied');
    this.subscriptionSynced = true;
    this.syncResolve?.();
    this.syncResolve = null;
  }

  /**
   * Wait until the initial subscription snapshot is applied to the local cache.
   */
  async waitForSync(timeoutMs = 15000): Promise<void> {
    if (this.subscriptionSynced) {
      return;
    }

    this.beginSyncWait();

    const timeout = new Promise<void>((_, reject) => {
      setTimeout(() => reject(new Error('SpacetimeDB subscription sync timeout')), timeoutMs);
    });

    await Promise.race([this.syncPromise!, timeout]);
  }

  /**
   * Connect (if needed), subscribe to players on the server, and wait for cache sync.
   */
  async ensurePlayerDataReady(): Promise<void> {
    await this.initialize({ syncPlayers: true });
    if (this.playersSubscribed) {
      return;
    }
    await this.waitForSync();
  }

  /**
   * Connect (if needed), subscribe to trial tables on the server, and wait for cache sync.
   */
  async ensureTrialDataReady(): Promise<void> {
    await this.initialize({ syncTrialData: true });
  }

  private async subscribeToQuerySet(
    label: string,
    buildQueries: (t: AppSubscriptionTables) => unknown[],
    onSubscribed: () => void,
  ): Promise<void> {
    if (!this.connection) {
      return;
    }

    await new Promise<void>((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error(`SpacetimeDB ${label} subscription timeout`));
      }, 15000);

      this.connection!.subscriptionBuilder()
        .onApplied(() => {
          clearTimeout(timeout);
          onSubscribed();
          resolve();
        })
        .onError((errorContext) => {
          clearTimeout(timeout);
          const message =
            typeof errorContext === 'string'
              ? errorContext
              : errorContext instanceof Error
                ? errorContext.message
                : `SpacetimeDB ${label} subscription failed`;
          reject(new Error(message));
        })
        .subscribe((t) => {
          const tbl = t as unknown as AppSubscriptionTables;
          return buildQueries(tbl) as ReturnType<
            typeof buildTrialStatusSubscriptionQueries
          >;
        });
    });
  }

  private async subscribeToTrialData(): Promise<void> {
    if (!this.connection || this.trialDataSubscribed) {
      return;
    }

    await this.subscribeToQuerySet(
      'trial data',
      buildTrialStatusSubscriptionQueries,
      () => {
        this.trialDataSubscribed = true;
        this.playersSubscribed = true;
      },
    );
  }

  private async subscribeToPlayers(): Promise<void> {
    if (!this.connection || this.playersSubscribed) {
      return;
    }

    await this.subscribeToQuerySet(
      'player',
      buildPlayerLookupSubscriptionQueries,
      () => {
        this.playersSubscribed = true;
        this.markSubscriptionApplied();
      },
    );
  }

  /**
   * Initialize the SpacetimeDB connection
   */
  async initialize(options?: SpacetimeInitOptions): Promise<void> {
    if (options?.syncPlayers) {
      this.initOptions.syncPlayers = true;
    }
    if (options?.syncTrialData) {
      this.initOptions.syncTrialData = true;
    }

    if (this.connectionPromise) {
      await this.connectionPromise;
      if (options?.syncPlayers && !this.playersSubscribed) {
        await this.subscribeToPlayers();
      }
      if (options?.syncTrialData && !this.trialDataSubscribed) {
        await this.subscribeToTrialData();
      }
      return;
    }

    if (this.isConnected && this.connection) {
      if (options?.syncPlayers && !this.playersSubscribed) {
        await this.subscribeToPlayers();
      }
      if (options?.syncTrialData && !this.trialDataSubscribed) {
        await this.subscribeToTrialData();
      }
      return;
    }

    this.connectionPromise = this._doInitialize();
    await this.connectionPromise;

    if (options?.syncPlayers && !this.playersSubscribed) {
      await this.subscribeToPlayers();
    }
    if (options?.syncTrialData && !this.trialDataSubscribed) {
      await this.subscribeToTrialData();
    }
  }

  private async _doInitialize(): Promise<void> {
    // Check if SpacetimeDB is configured (server or public env)
    const host = process.env.SPACETIME_HOST || process.env.NEXT_PUBLIC_SPACETIME_HOST;
    const moduleName = process.env.SPACETIME_MODULE || process.env.NEXT_PUBLIC_SPACETIME_MODULE;
    if (!host || !moduleName) {
      console.log('⚠️ SpacetimeDB not configured - using fallback mode');
      this.isConnected = false;
      return;
    }

    const serverToken =
      typeof window === 'undefined' ? process.env.SPACETIME_TOKEN?.trim() : undefined;
    const useServerCompressionNone = typeof window === 'undefined';
    const connectTimeoutMs = 25000;

    try {
      console.log('🚀 Initializing SpacetimeDB client...');
      console.log(`🔗 Connecting to: ${SPACETIME_CONFIG.host}`);
      console.log(`🔧 Module: ${SPACETIME_CONFIG.module}`);

      await this.connectWithOptionalTokenRetry(serverToken, {
        connectTimeoutMs,
        useServerCompressionNone,
      });

      console.log('✅ SpacetimeDB client initialized successfully');
    } catch (error) {
      console.warn(
        '⚠️ SpacetimeDB connection failed - using fallback mode:',
        formatSpacetimeConnectError(error).message,
      );
      this.isConnected = false;
      throw error;
    } finally {
      this.connectionPromise = null;
    }
  }

  private connectOnce(options: {
    token?: string;
    connectTimeoutMs: number;
    useServerCompressionNone: boolean;
  }): Promise<void> {
    const { token, connectTimeoutMs, useServerCompressionNone } = options;

    return new Promise<void>((resolve, reject) => {
      let connectionResolved = false;
      let pendingConnection: DbConnection | null = null;

      const abortPendingConnection = () => {
        if (!pendingConnection) {
          return;
        }

        try {
          pendingConnection.disconnect();
        } catch {
          // Best-effort cleanup after timeout or failed init.
        }
        pendingConnection = null;
      };

      const timeout = setTimeout(() => {
        if (connectionResolved) {
          return;
        }
        connectionResolved = true;
        abortPendingConnection();
        this.isConnected = false;
        this.connection = null;
        this.connectedIdentityHex = null;
        reject(new Error('SpaceTimeDB connection timeout'));
      }, connectTimeoutMs);

      const builder = DbConnection.builder()
        .withUri(SPACETIME_CONFIG.host)
        .withDatabaseName(SPACETIME_CONFIG.module)
        .onConnect((conn, identity, authToken) => {
          if (connectionResolved) {
            conn.disconnect();
            return;
          }
          connectionResolved = true;
          clearTimeout(timeout);
          pendingConnection = null;

          console.log('✅ Connected to SpacetimeDB');
          console.log(`   Identity: ${identity.toHexString()}`);
          console.log(`   Token: ${authToken ? '***' + authToken.slice(-8) : 'None'}`);
          this.connection = conn;
          this.connectedIdentityHex = identity.toHexString();
          this.isConnected = true;
          this.beginSyncWait();

          conn
            .subscriptionBuilder()
            .onApplied(() => {
              this.markSubscriptionApplied();
            })
            .subscribe((t) => {
              const tbl = t as unknown as AppSubscriptionTables;
              if (typeof window !== 'undefined') {
                this.playersSubscribed = true;
                return buildAppSubscriptionQueries(tbl);
              }
              return buildGameSessionOnlySubscriptionQueries(tbl);
            });

          resolve();
        })
        .onDisconnect((_ctx, error) => {
          console.log(
            '🔌 Disconnected from SpacetimeDB',
            error ? formatSpacetimeConnectError(error).message : '',
          );
          this.isConnected = false;
          this.connection = null;
          this.connectedIdentityHex = null;
          this.playersSubscribed = false;
          this.trialDataSubscribed = false;
          this.resetSyncState();
        })
        .onConnectError((_ctx, error) => {
          if (connectionResolved) {
            abortPendingConnection();
            return;
          }
          connectionResolved = true;
          clearTimeout(timeout);
          pendingConnection = null;
          const formatted = formatSpacetimeConnectError(error);
          console.error('❌ SpacetimeDB connection error:', formatted.message);
          this.isConnected = false;
          reject(formatted);
        });

      if (useServerCompressionNone) {
        builder.withCompression('none');
      }

      if (token) {
        builder.withToken(token);
      }

      pendingConnection = builder.build();
    });
  }

  private async connectWithOptionalTokenRetry(
    serverToken: string | undefined,
    options: { connectTimeoutMs: number; useServerCompressionNone: boolean },
  ): Promise<void> {
    if (!serverToken) {
      await this.connectOnce(options);
      return;
    }

    try {
      await this.connectOnce({ ...options, token: serverToken });
    } catch (error) {
      if (!isSpacetimeTokenVerificationError(error)) {
        throw error;
      }

      console.warn(
        '⚠️ SpacetimeDB token verification failed; retrying without SPACETIME_TOKEN',
      );
      await this.connectOnce(options);
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
  getConnection(): DbConnection | null {
    return this.connection;
  }

  getConnectedIdentityHex(): string | null {
    return this.connectedIdentityHex;
  }

  /**
   * Disconnect from SpacetimeDB
   */
  async disconnect(): Promise<void> {
    if (this.connection) {
      this.connection.disconnect();
      this.connection = null;
      this.isConnected = false;
      this.connectedIdentityHex = null;
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

    // @ts-expect-error Dynamic reducer call (2.x: single arg object)
    if (typeof this.connection.reducers[reducerName] === 'function') {
      // @ts-expect-error
      await this.connection.reducers[reducerName](args[0]);
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

    const sessions = Array.from(this.connection.db.anonymous_sessions.iter()) as AnonymousSession[];
    const filtered = sessions.filter((s: AnonymousSession) => s.sessionId === sessionId);

    return filtered.length > 0 ? filtered[0] : null;
  }

  /**
   * Get guest player by guest ID
   */
  getGuestPlayer(guestId: string): any | null {
    if (!this.connection) return null;

    const guests = Array.from(this.connection.db.guest_players.iter())
      .filter((g: any) => g.guestId === guestId);

    return guests.length > 0 ? guests[0] : null;
  }

  /**
   * Get guest game sessions by guest ID
   */
  getGuestGameSessions(guestId: string, limit: number = 10): any[] {
    if (!this.connection) return [];

    return Array.from(this.connection.db.guest_game_sessions.iter())
      .filter((g: any) => g.guestId === guestId)
      .sort((a: any, b: any) => Number(b.startedAt) - Number(a.startedAt))
      .slice(0, limit);
  }

  /**
   * Link current SpacetimeDB identity to wallet address for persistent stats
   */
  async linkWalletToIdentity(
    walletAddress: string,
    universalWalletAddress?: string | null,
  ): Promise<void> {
    if (!this.connection) {
      console.warn('⚠️ Not connected to SpacetimeDB');
      return;
    }

    try {
      const universal = universalWalletAddress?.trim().toLowerCase();
      this.connection.reducers.linkWalletToIdentity({
        walletAddress: walletAddress.trim().toLowerCase(),
        universalWalletAddress:
          universal && universal.startsWith('0x') ? universal : undefined,
      });
      console.log(`✅ Linked wallet ${walletAddress} to SpacetimeDB identity`);
    } catch (error) {
      console.error('❌ Failed to link wallet:', error);
      throw error;
    }
  }

  /**
   * Link Base Account addresses to SpacetimeDB identity for persistent stats
   */
  async linkBaseAccountToIdentity(universalAddress: string, subAccountAddress: string): Promise<void> {
    if (!this.connection) {
      console.warn('⚠️ Not connected to SpacetimeDB');
      return;
    }

    try {
      await this.linkWalletToIdentity(subAccountAddress, universalAddress);
      
      // Store both addresses in localStorage for reference
      localStorage.setItem('base_account_addresses', JSON.stringify({
        universal: universalAddress,
        subAccount: subAccountAddress,
        timestamp: Date.now(),
      }));
      
      console.log(`✅ Linked Base Account to SpacetimeDB identity`, {
        universal: universalAddress,
        subAccount: subAccountAddress
      });
    } catch (error) {
      console.error('❌ Failed to link Base Account:', error);
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
      await this.connection.reducers.createPlayer({
        walletAddress,
        username,
      });
      console.log(`✅ Created player: ${walletAddress}`);
    } catch (error) {
      console.error('❌ Failed to create player:', error);
      throw error;
    }
  }

  async recordPaidGameScore(
    walletAddress: string,
    gameScore: number,
    onChainSessionId: number | string,
    username?: string,
  ): Promise<void> {
    if (!this.connection) return;

    const sessionId =
      typeof onChainSessionId === 'string'
        ? BigInt(onChainSessionId || '0')
        : BigInt(onChainSessionId);

    try {
      await this.connection.reducers.recordPaidGameScore({
        walletAddress,
        gameScore,
        onChainSessionId: sessionId,
        username: username ?? undefined,
      });
      console.log(`✅ Recorded paid game score: ${walletAddress} (+${gameScore}) session ${sessionId}`);
    } catch (error) {
      console.error('❌ Failed to record paid game score:', error);
      throw error;
    }
  }

  async updatePlayerStats(
    walletAddress: string,
    totalScore: number,
    gamesPlayed: number,
    bestScore: number,
    totalEarnings: number,
    username?: string,
  ): Promise<void> {
    if (!this.connection) return;

    try {
      await this.connection.reducers.updatePlayerStats({
        walletAddress,
        totalScore,
        gamesPlayed,
        bestScore,
        totalEarnings,
        username: username ?? undefined,
      });
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
      await this.connection.reducers.updateTrialStatus({
        walletAddress,
        trialGamesRemaining,
        trialCompleted,
      });
      console.log(`✅ Updated trial status: ${walletAddress}`);
    } catch (error) {
      console.error('❌ Failed to update trial status:', error);
      throw error;
    }
  }

  getPlayerProfile(walletAddress: string): Player | null {
    if (!this.connection) return null;

    const normalized = walletAddress.toLowerCase();
    const players = (Array.from(this.connection.db.players.iter()) as Player[]).filter(
      (p: Player) => p.walletAddress.toLowerCase() === normalized
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
    gameId: string,              // NEW: Links to contract gameId
    difficulty: string,
    gameMode: string,
    playerType: 'paid' | 'trial' = 'trial',
    walletAddress?: string,  // NEW: Required for paid players
    guestId?: string         // NEW: Required for trial/guest
  ): Promise<void> {
    if (!this.connection) return;

    try {
      await this.connection.reducers.startGameSession({
        sessionId,
        gameId,
        difficulty,
        gameMode,
        playerType,
        walletAddress: walletAddress || undefined,
        guestId: guestId || undefined,
      });
      const playerId = walletAddress || guestId || 'unknown';
      console.log(`🎮 Started game session: ${sessionId} for game ${gameId} and player ${playerId} (${playerType})`);
    } catch (error) {
      console.error('❌ Failed to start game session:', error);
      throw error;
    }
  }

  async endGameSession(sessionId: string): Promise<void> {
    if (!this.connection) return;

    try {
      await this.connection.reducers.endGameSession({ sessionId });
      console.log(`🏁 Ended game session: ${sessionId}`);
    } catch (error) {
      console.error('❌ Failed to end game session:', error);
      throw error;
    }
  }

  /**
   * Runs server-side reconcile (lobby → active, expiry) then returns the current
   * Waiting | Lobby | Active row with the latest createdAt (matches module logic).
   */
  async getActiveGameSession(): Promise<ActiveGameSession | null> {
    if (!this.connection) return null;

    await this.connection.reducers.getActiveGameSession({});
    const rows = Array.from(this.connection.db.active_game_sessions.iter()) as ActiveGameSession[];
    return pickCurrentActiveGameSession(rows);
  }

  getPoolPlayersForSession(sessionId: string): PoolPlayer[] {
    if (!this.connection) return [];
    return Array.from(this.connection.db.pool_players.iter() as Iterable<PoolPlayer>).filter(
      (p) => p.sessionId === sessionId
    );
  }

  async joinMultiplayerPool(
    playerId: string,
    walletAddress: string | undefined,
    lobbyDurationSec: number
  ): Promise<void> {
    if (!this.connection) {
      throw new Error('Not connected to SpacetimeDB');
    }
    await this.connection.reducers.joinMultiplayerPool({
      playerId,
      walletAddress: walletAddress ?? undefined,
      lobbyDurationSec,
    });
  }

  async leaveMultiplayerPool(playerId: string): Promise<void> {
    if (!this.connection) {
      throw new Error('Not connected to SpacetimeDB');
    }
    await this.connection.reducers.leaveMultiplayerPool({ playerId });
  }

  async endMultiplayerLobby(): Promise<void> {
    if (!this.connection) {
      throw new Error('Not connected to SpacetimeDB');
    }
    await this.connection.reducers.endMultiplayerLobby({});
  }

  async syncMultiplayerLobbyEndsAfterSecs(durationSec: number): Promise<void> {
    if (!this.connection) {
      throw new Error('Not connected to SpacetimeDB');
    }
    await this.connection.reducers.syncMultiplayerLobbyEndsAfterSecs({ durationSec });
  }

  async joinActiveGameSession(playerType: 'paid' | 'trial' = 'paid'): Promise<void> {
    if (!this.connection) return;

    try {
      await this.connection.reducers.joinActiveGameSession({ playerType });
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
      await this.connection.reducers.recordQuestionAttempt({
        sessionId,
        audioFileName,
        selectedAnswer,
        correctAnswer,
        timeTaken,
        playerType,
      });
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
      .filter((p: Player) => p.totalEarnings >= 0 || p.weeklyBestScore > 0)
      .sort((a: Player, b: Player) => b.weeklyBestScore - a.weeklyBestScore)
      .slice(0, limit);
  }

  getTrialLeaderboard(limit: number = 10): any[] {
    if (!this.connection) return [];

    // Trial players tracked in guest_players table, sorted by best score
    return Array.from(this.connection.db.guest_players.iter())
      .sort((a: any, b: any) => b.bestScore - a.bestScore)
      .slice(0, limit);
  }

  getTopEarners(limit: number = 10): TopEarner[] {
    if (!this.connection) return [];

    return (Array.from(this.connection.db.players.iter()) as Player[])
      .filter((p: Player) => p.totalEarnings >= 0 || p.weeklyBestScore > 0)
      .sort((a: Player, b: Player) => b.weeklyBestScore - a.weeklyBestScore)
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

  /** Paid weekly leaderboard rows from local Spacetime cache (no chain merge). */
  getWeeklyPlayersFromCache(sessionCounter: number, limit: number = 10): Player[] {
    if (!this.connection) return [];
    const sessionId = BigInt(sessionCounter);
    return (Array.from(this.connection.db.players.iter()) as Player[])
      .filter(
        (p) => p.weeklySessionId === sessionId && p.weeklyBestScore > 0,
      )
      .sort((a, b) => b.weeklyBestScore - a.weeklyBestScore)
      .slice(0, limit);
  }

  getPlayerByWallet(walletAddress: string): Player | undefined {
    if (!this.connection) return undefined;
    const wallet = walletAddress.trim().toLowerCase();
    return (Array.from(this.connection.db.players.iter()) as Player[]).find(
      (p) => p.walletAddress.toLowerCase() === wallet,
    );
  }

  getUniversalWalletForSubAccount(walletAddress: string): string | null {
    if (!this.connection) return null;
    const wallet = walletAddress.trim().toLowerCase();
    const mapping = (
      Array.from(this.connection.db.identity_wallet_mapping.iter()) as Array<{
        walletAddress: string;
        universalWalletAddress?: string | null;
      }>
    ).find((row) => row.walletAddress.toLowerCase() === wallet);
    const universal = mapping?.universalWalletAddress?.trim().toLowerCase();
    return universal?.startsWith('0x') ? universal : null;
  }

  getActiveConnections(limit: number = 20): Array<{
    walletAddress: string | null;
    lastActivity: Date;
  }> {
    if (!this.connection) return [];

    return (Array.from(this.connection.db.active_connections.iter()) as Array<{
      walletAddress?: string | null;
      lastActivity: { toDate?: () => Date } | Date;
    }>)
      .map((row) => ({
        walletAddress: row.walletAddress ?? null,
        lastActivity:
          row.lastActivity instanceof Date
            ? row.lastActivity
            : (row.lastActivity?.toDate?.() ?? new Date()),
      }))
      .sort((a, b) => b.lastActivity.getTime() - a.lastActivity.getTime())
      .slice(0, limit);
  }

  getPoolPlayersForActiveSessions(): PoolPlayer[] {
    if (!this.connection) return [];
    return Array.from(this.connection.db.pool_players.iter()) as PoolPlayer[];
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
      await this.connection.reducers.addAudioFile({
        name,
        artistName,
        songTitle,
        ipfsCid,
        fileSize: BigInt(fileSize),
        duration: duration !== undefined && duration !== null ? duration : undefined,
      });
      console.log(`✅ Added audio file: ${artistName} - ${songTitle}`);
    } catch (error) {
      console.error('❌ Failed to add audio file:', error);
      throw error;
    }
  }

  getAllAudioFiles(): AudioFile[] {
    if (!this.connection) return [];
    return Array.from(this.connection.db.audio_files.iter());
  }

  // ============================================================================
  // PRIZE & CLAIMS MANAGEMENT
  // ============================================================================

  async createPrizePool(gameId: string, entryFee: number): Promise<void> {
    if (!this.connection) return;

    try {
      await this.connection.reducers.createPrizePool({ gameId, entryFee });
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
      await this.connection.reducers.recordPrizeDistribution({
        walletAddress,
        sessionId,
        prizeAmount,
        rank,
      });
      console.log(`💰 Recorded prize: ${prizeAmount} USDC for ${walletAddress}`);
    } catch (error) {
      console.error('❌ Failed to record prize distribution:', error);
      throw error;
    }
  }

  getPendingClaims(walletAddress?: string): PendingClaim[] {
    if (!this.connection) return [];

    const claims = (Array.from(this.connection.db.pending_claims.iter()) as PendingClaim[])
      .filter((claim: PendingClaim) => !claim.claimed);

    if (walletAddress) {
      return claims.filter((claim: PendingClaim) => claim.walletAddress === walletAddress);
    }

    return claims;
  }

  getPrizeHistory(walletAddress: string, limit: number = 20): PrizeHistory[] {
    if (!this.connection) return [];

    return (Array.from(this.connection.db.prize_history.iter()) as PrizeHistory[])
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
      await this.connection.reducers.createGameEntry({
        sessionId,
        walletAddress: walletAddress || undefined,
        anonId: anonId || undefined,
        isTrial,
        paidTxHash: paidTxHash || undefined,
      });
      console.log(`✅ Created game entry: ${sessionId}`);
    } catch (error) {
      console.error('❌ Failed to create game entry:', error);
      throw error;
    }
  }

  async markEntryConsumed(sessionId: string): Promise<void> {
    if (!this.connection) return;

    try {
      await this.connection.reducers.markEntryConsumed({ sessionId });
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
      await this.connection.reducers.createAnonymousSession({ sessionId });
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
      await this.connection.reducers.updateAnonymousSession({
        sessionId,
        gamesPlayed,
        totalScore,
        bestScore,
      });
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
      await this.connection.reducers.grantAdminPrivileges({
        targetIdentity: Identity.fromString(targetIdentity),
        adminLevel,
      });
      console.log(`✅ Granted ${adminLevel} privileges to ${targetIdentity}`);
    } catch (error) {
      console.error('❌ Failed to grant admin privileges:', error);
      throw error;
    }
  }

  async revokeAdminPrivileges(targetIdentity: string): Promise<void> {
    if (!this.connection) return;

    try {
      await this.connection.reducers.revokeAdminPrivileges({
        targetIdentity: Identity.fromString(targetIdentity),
      });
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
    return Array.from(this.connection.db.game_sessions.iter());
  }

  getAllPlayerStats(): PlayerStats[] {
    if (!this.connection) return [];
    return Array.from(this.connection.db.player_stats.iter());
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
