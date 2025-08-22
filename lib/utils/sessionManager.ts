import { v4 as uuidv4 } from 'uuid';

export class SessionManager {
  private static readonly SESSION_KEY = 'beatme_session_id';
  private static readonly TRIAL_GAMES_KEY = 'beatme_trial_games';

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
    return newCount;
  }

  static resetTrialGames(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.TRIAL_GAMES_KEY);
  }

  static clearSession(): void {
    if (typeof window === 'undefined') return;
    localStorage.removeItem(this.SESSION_KEY);
    localStorage.removeItem(this.TRIAL_GAMES_KEY);
  }
}
