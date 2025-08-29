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
    source: 'musicbrainz' | 'billboard' | 'supabase' | 'lighthouse' | 'storacha' | 'local';
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
  isTrialPlayer: boolean; // New field to track trial players
  sessionId?: string; // For trial players without wallet
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
  isTrialPlayer: boolean; // New field to track trial players
}

export interface GameState {
  currentQuestion: number;
  questions: TriviaQuestion[];
  allQuestions?: TriviaQuestion[];
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
  isTrialPlayer: boolean; // New field to track trial players
  sessionId?: string; // For trial players without wallet
  // Rounds configuration
  currentRound?: number;
  totalRounds?: number;
  questionsPerRound?: number;
}

export interface PrizePool {
  totalAmount: number;
  entryFee: number;
  participants: number;
  trialParticipants: number; // New field to track trial participants
  distribution: {
    first: number;
    second: number;
    third: number;
    participation: number;
  };
  contractAddress: string;
  isEqualOpportunity: boolean; // New field to indicate equal opportunity for trial players
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
  isTrialPlayer: boolean; // New field to track trial players
  trialGamesRemaining: number; // New field for trial game count
}