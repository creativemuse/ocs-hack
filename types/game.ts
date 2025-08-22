export type QuestionType = 'name-that-tune' | 'artist-match' | 'release-year' | 'chart-position' | 'genre-classification';

export type DifficultyLevel = 'easy' | 'medium' | 'hard' | 'expert';

export interface TriviaQuestion {
  id: string;
  type: QuestionType;
  question: string;
  options: string[];
  correctAnswer: number;
  audioUrl?: string;
  imageUrl?: string;
  difficulty: DifficultyLevel;
  timeLimit: number;
  metadata: {
    trackId?: string;
    artistName: string;
    songTitle: string;
    releaseYear?: string;
    genre?: string;
    chartPosition?: number;
    source: 'spotify' | 'musicbrainz' | 'billboard' | 'supabase';
  };
}

export interface GameSession {
  id: string;
  playerId: string;
  playerAddress: string;
  startTime: number;
  endTime?: number;
  questions: TriviaQuestion[];
  answers: Array<{
    questionId: string;
    selectedAnswer: number;
    isCorrect: boolean;
    timeSpent: number;
    pointsEarned: number;
  }>;
  totalScore: number;
  entryFee: number;
  status: 'waiting' | 'playing' | 'completed';
}

export interface LeaderboardEntry {
  rank: number;
  playerAddress: string;
  playerName?: string;
  totalScore: number;
  gamesPlayed: number;
  averageScore: number;
  totalEarnings: number;
  lastPlayed: number;
}

export interface GameState {
  currentQuestion: number;
  questions: TriviaQuestion[];
  answers: Array<{
    questionId: string;
    selectedAnswer: number;
    isCorrect: boolean;
    timeSpent: number;
    pointsEarned: number;
  }>;
  score: number;
  timeRemaining: number;
  gameStatus: 'waiting' | 'playing' | 'completed';
  prizePool: number;
  entryFee: number;
}

export interface PrizePool {
  totalAmount: number;
  entryFee: number;
  participants: number;
  distribution: {
    first: number;
    second: number;
    third: number;
    participation: number;
  };
  contractAddress: string;
}

export interface PlayerStats {
  gamesPlayed: number;
  totalScore: number;
  averageScore: number;
  bestScore: number;
  totalEarnings: number;
  currentStreak: number;
  bestStreak: number;
  favoriteGenre?: string;
  achievementBadges: string[];
}