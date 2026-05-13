export class SessionManager {
  private static readonly SESSION_KEY = 'beatme_session_id';
  private static readonly TRIAL_GAMES_KEY = 'beatme_trial_games';
  private static readonly TRIAL_COMPLETED_KEY = 'beatme_trial_completed';
  private static readonly LAST_SYNC_KEY = 'beatme_last_sync';

  private static generateUUID(): string {
    if (typeof window !== 'undefined' && window.crypto && window.crypto.randomUUID) {
      return window.crypto.randomUUID();
    }
    // Fallback for browsers without crypto.randomUUID
    return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
      const r = Math.random() * 16 | 0;
      const v = c == 'x' ? r : (r & 0x3 | 0x8);
      return v.toString(16);
    });
  }

  static getSessionId(): string {
    if (typeof window === 'undefined') return '';
    
    let sessionId = localStorage.getItem(this.SESSION_KEY);
    if (!sessionId) {
      sessionId = this.generateUUID();
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

  static isTrialCompleted(): boolean {
    if (typeof window === 'undefined') return false;
    return localStorage.getItem(this.TRIAL_COMPLETED_KEY) === 'true';
  }

  static setTrialCompleted(): void {
    if (typeof window === 'undefined') return;
    localStorage.setItem(this.TRIAL_COMPLETED_KEY, 'true');
  }

  static resetTrialGames(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.TRIAL_GAMES_KEY);
    localStorage.removeItem(this.TRIAL_COMPLETED_KEY);
    localStorage.removeItem(this.LAST_SYNC_KEY);
  }

  static clearSession(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.SESSION_KEY);
    localStorage.removeItem(this.TRIAL_GAMES_KEY);
    localStorage.removeItem(this.TRIAL_COMPLETED_KEY);
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
