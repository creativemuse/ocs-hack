interface GuestPlayer {
  id: string;
  name: string;
  gamesPlayed: number;
  totalScore: number;
  bestScore: number;
  achievements: string[];
  createdAt: number;
  lastPlayed: number;
}

interface GuestAchievement {
  id: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: number;
}

const GUEST_STORAGE_KEY = 'beatme_guest_player';
const GUEST_ACHIEVEMENTS_KEY = 'beatme_guest_achievements';

// Predefined achievements for guest players
const GUEST_ACHIEVEMENTS: Record<string, GuestAchievement> = {
  first_game: {
    id: 'first_game',
    name: 'First Steps',
    description: 'Play your first game',
    icon: '🎮'
  },
  score_100: {
    id: 'score_100',
    name: 'Century Club',
    description: 'Score 100+ points in a single game',
    icon: '💯'
  },
  score_500: {
    id: 'score_500',
    name: 'High Roller',
    description: 'Score 500+ points in a single game',
    icon: '🎯'
  },
  games_5: {
    id: 'games_5',
    name: 'Regular Player',
    description: 'Play 5 games',
    icon: '🏆'
  },
  games_10: {
    id: 'games_10',
    name: 'Veteran',
    description: 'Play 10 games',
    icon: '👑'
  },
  perfect_round: {
    id: 'perfect_round',
    name: 'Perfect Round',
    description: 'Get all questions correct in a round',
    icon: '⭐'
  },
  speed_demon: {
    id: 'speed_demon',
    name: 'Speed Demon',
    description: 'Answer 3 questions in under 30 seconds',
    icon: '⚡'
  }
};

export class GuestSessionManager {
  static getGuestPlayer(): GuestPlayer | null {
    if (typeof window === 'undefined') return null;
    
    try {
      const stored = localStorage.getItem(GUEST_STORAGE_KEY);
      return stored ? JSON.parse(stored) : null;
    } catch {
      return null;
    }
  }

  static async createGuestPlayer(name: string): Promise<GuestPlayer> {
    const guestPlayer: GuestPlayer = {
      id: `guest_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name,
      gamesPlayed: 0,
      totalScore: 0,
      bestScore: 0,
      achievements: [],
      createdAt: Date.now(),
      lastPlayed: Date.now()
    };

    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(guestPlayer));

    // Sync to SpacetimeDB
    try {
      await fetch('/api/guest-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create_guest',
          guestData: {
            guest_id: guestPlayer.id,
            name: guestPlayer.name
          }
        })
      });
    } catch (error) {
      console.error('Failed to sync guest player to SpacetimeDB:', error);
    }

    return guestPlayer;
  }

  static updateGuestPlayer(updates: Partial<GuestPlayer>): GuestPlayer | null {
    const player = this.getGuestPlayer();
    if (!player) return null;

    const updatedPlayer = {
      ...player,
      ...updates,
      lastPlayed: Date.now()
    };

    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(updatedPlayer));
    return updatedPlayer;
  }

  static async recordGameResult(score: number, gameData?: any): Promise<GuestPlayer | null> {
    const player = this.getGuestPlayer();
    if (!player) return null;

    const updates: Partial<GuestPlayer> = {
      gamesPlayed: player.gamesPlayed + 1,
      totalScore: player.totalScore + score,
      bestScore: Math.max(player.bestScore, score)
    };

    const updatedPlayer = this.updateGuestPlayer(updates);
    
    // Check for achievements
    this.checkAchievements(updatedPlayer!);

    // Sync to SpacetimeDB
    try {
      await fetch('/api/guest-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'record_game',
          guestData: {
            session_id: `session_${Date.now()}`,
            guest_id: player.id,
            score,
            questions_answered: gameData?.questionsAnswered || 0,
            correct_answers: gameData?.correctAnswers || 0,
            game_data: gameData || {}
          }
        })
      });

      // Also update player stats
      await fetch('/api/guest-sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'update_guest',
          guestData: {
            guest_id: player.id,
            games_played: updatedPlayer!.gamesPlayed,
            total_score: updatedPlayer!.totalScore,
            best_score: updatedPlayer!.bestScore,
            achievements: updatedPlayer!.achievements
          }
        })
      });
    } catch (error) {
      console.error('Failed to sync game result to SpacetimeDB:', error);
    }
    
    return updatedPlayer;
  }

  static getAchievements(): GuestAchievement[] {
    if (typeof window === 'undefined') return [];
    
    try {
      const stored = localStorage.getItem(GUEST_ACHIEVEMENTS_KEY);
      const unlocked = stored ? JSON.parse(stored) : {};
      
      return Object.values(GUEST_ACHIEVEMENTS).map(achievement => ({
        ...achievement,
        unlockedAt: unlocked[achievement.id] || undefined
      }));
    } catch {
      return Object.values(GUEST_ACHIEVEMENTS);
    }
  }

  static unlockAchievement(achievementId: string): boolean {
    const player = this.getGuestPlayer();
    if (!player) return false;

    const achievement = GUEST_ACHIEVEMENTS[achievementId];
    if (!achievement) return false;

    // Check if already unlocked
    if (player.achievements.includes(achievementId)) return false;

    // Unlock achievement
    const updatedPlayer = this.updateGuestPlayer({
      achievements: [...player.achievements, achievementId]
    });

    if (updatedPlayer) {
      // Store unlock timestamp
      try {
        const stored = localStorage.getItem(GUEST_ACHIEVEMENTS_KEY);
        const unlocked = stored ? JSON.parse(stored) : {};
        unlocked[achievementId] = Date.now();
        localStorage.setItem(GUEST_ACHIEVEMENTS_KEY, JSON.stringify(unlocked));
      } catch {
        // Ignore storage errors
      }

      return true;
    }

    return false;
  }

  private static checkAchievements(player: GuestPlayer): void {
    // Check for first game
    if (player.gamesPlayed === 1) {
      this.unlockAchievement('first_game');
    }

    // Check for score achievements
    if (player.bestScore >= 100) {
      this.unlockAchievement('score_100');
    }
    if (player.bestScore >= 500) {
      this.unlockAchievement('score_500');
    }

    // Check for game count achievements
    if (player.gamesPlayed >= 5) {
      this.unlockAchievement('games_5');
    }
    if (player.gamesPlayed >= 10) {
      this.unlockAchievement('games_10');
    }
  }

  static getPlayerStats() {
    const player = this.getGuestPlayer();
    if (!player) return null;

    return {
      name: player.name,
      gamesPlayed: player.gamesPlayed,
      totalScore: player.totalScore,
      bestScore: player.bestScore,
      averageScore: player.gamesPlayed > 0 ? Math.round(player.totalScore / player.gamesPlayed) : 0,
      achievements: player.achievements.length,
      totalAchievements: Object.keys(GUEST_ACHIEVEMENTS).length,
      daysSinceCreated: Math.floor((Date.now() - player.createdAt) / (1000 * 60 * 60 * 24))
    };
  }

  static clearGuestData(): void {
    if (typeof window === 'undefined') return;
    
    localStorage.removeItem(GUEST_STORAGE_KEY);
    localStorage.removeItem(GUEST_ACHIEVEMENTS_KEY);
  }

  static exportGuestData(): string {
    const player = this.getGuestPlayer();
    const achievements = this.getAchievements();
    
    return JSON.stringify({
      player,
      achievements,
      exportDate: new Date().toISOString()
    });
  }
}
