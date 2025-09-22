import { v4 as uuidv4 } from 'uuid';

export class SessionManager {
  private static readonly SESSION_KEY = 'beatme_session_id';
  private static readonly TRIAL_GAMES_KEY = 'beatme_trial_games';
  private static readonly LAST_SYNC_KEY = 'beatme_last_sync';

  static getSessionId(): string {
    if (typeof window === 'undefined') return '';
    
    let sessionId = localStorage.getItem(this.SESSION_KEY);
    if (!sessionId) {
      sessionId = uuidv4();
      localStorage.setItem(this.SESSION_KEY, sessionId);
    }
    return sessionId;
  }

  static getTrialGamesPlayed(): number {
    if (typeof window === 'undefined') return 0;
    return parseInt(localStorage.getItem(this.TRIAL_GAMES_KEY) || '0', 10);
  }

  static incrementTrialGames(): number {
    if (typeof window === 'undefined') return 0;
    const current = this.getTrialGamesPlayed();
    const newCount = current + 1;
    localStorage.setItem(this.TRIAL_GAMES_KEY, newCount.toString());
    this.setLastSyncTime();
    return newCount;
  }

  static setTrialGamesPlayed(count: number): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.TRIAL_GAMES_KEY, count.toString());
    this.setLastSyncTime();
  }

  static getLastSyncTime(): number {
    if (typeof window === 'undefined') return 0;
    return parseInt(localStorage.getItem(this.LAST_SYNC_KEY) || '0', 10);
  }

  static setLastSyncTime(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.LAST_SYNC_KEY, Date.now().toString());
  }

  static needsSync(): boolean {
    if (typeof window === 'undefined') return false;
    const lastSync = this.getLastSyncTime();
    const now = Date.now();
    // Consider sync needed if more than 5 minutes have passed
    return (now - lastSync) > 5 * 60 * 1000;
  }

  static resetTrialGames(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.TRIAL_GAMES_KEY);
    localStorage.removeItem(this.LAST_SYNC_KEY);
  }

  static clearSession(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.SESSION_KEY);
    localStorage.removeItem(this.TRIAL_GAMES_KEY);
    localStorage.removeItem(this.LAST_SYNC_KEY);
  }

  // Sync local state with SpaceTimeDB data
  static syncWithServerData(serverGamesPlayed: number): void {
    if (typeof window === 'undefined') return;
    const localGamesPlayed = this.getTrialGamesPlayed();
    
    // Use the higher count to prevent users from bypassing trial limits
    const finalCount = Math.max(localGamesPlayed, serverGamesPlayed);
    this.setTrialGamesPlayed(finalCount);
    
    console.log(`🔄 Synced trial games: local=${localGamesPlayed}, server=${serverGamesPlayed}, final=${finalCount}`);
  }
}
