'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTriviaContract } from '@/hooks/useTriviaContract';
import BlockchainGameEntry from './BlockchainGameEntry';
import TriviaQuestion from './TriviaQuestion';
import GameStats from './GameStats';
import Timer from './Timer';
import type { GameState, DifficultyLevel, QuestionType, TriviaQuestion as TQ } from '@/types/game';
import { Music, Trophy, Clock, Target, Play, Upload, DollarSign } from 'lucide-react';
import { ScoringSystem } from '@/lib/game/scoring';

interface BlockchainTriviaGameProps {
  walletAddress?: string;
  className?: string;
}

export default function BlockchainTriviaGame({ 
  walletAddress, 
  className = '' 
}: BlockchainTriviaGameProps) {
  const [gameState, setGameState] = useState<GameState>({
    currentQuestion: 0,
    questions: [],
    allQuestions: [],
    answers: [],
    score: 0,
    timeRemaining: 0,
    gameStatus: 'waiting',
    prizePool: 0,
    entryFee: 0,
    isTrialPlayer: false,
    sessionId: undefined,
    currentRound: 0,
    totalRounds: 3,
    questionsPerRound: 10,
  });

  const [isLoading, setIsLoading] = useState(false);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium');
  const [questionCount, setQuestionCount] = useState(10);
  const [questionType, setQuestionType] = useState<QuestionType>('name-that-tune');
  const [error, setError] = useState<string | null>(null);
  const [trialSessionId, setTrialSessionId] = useState<string>('');

  const {
    sessionInfo,
    playerScore,
    trialPlayerScore,
    entryFee,
    isLoading: contractLoading,
    error: contractError,
    submitScore,
    submitTrialScore,
    refreshSessionInfo,
    formatUSDC,
    formatTimeRemaining,
  } = useTriviaContract(walletAddress, trialSessionId);

  const DEFAULT_TOTAL_ROUNDS = 3;
  const DEFAULT_QUESTIONS_PER_ROUND = 10;

  // Load questions from Supabase
  const loadRoundQuestions = useCallback(async (perRound: number) => {
    const params = new URLSearchParams({
      bucket: 'Songs',
      folder: 'Global_Top_100',
      mode: questionType,
      count: String(perRound),
      difficulty,
      choices: '4',
    });
    const res = await fetch(`/api/supabase-questions?${params.toString()}`, { cache: 'no-store' });
    if (!res.ok) {
      const errorData = await res.json();
      throw new Error(errorData.error || 'Failed to load questions');
    }
    const data: { questions: TQ[] } = await res.json();
    if (!data.questions?.length) throw new Error('No questions generated from Supabase bucket');
    return data.questions;
  }, [difficulty, questionType]);

  // Start a round
  const startRound = useCallback(async (roundNumber: number) => {
    setIsLoading(true);
    try {
      const perRound = gameState.questionsPerRound || DEFAULT_QUESTIONS_PER_ROUND;
      const qs = await loadRoundQuestions(perRound);
      setGameState(prev => ({
        ...prev,
        questions: qs,
        currentQuestion: 0,
        gameStatus: 'playing',
        timeRemaining: qs[0]?.timeLimit || 15,
        currentRound: roundNumber,
        totalRounds: prev.totalRounds || DEFAULT_TOTAL_ROUNDS,
        questionsPerRound: perRound,
      }));
    } catch (e) {
      console.error('❌ Error starting round:', e);
      setError(e instanceof Error ? e.message : 'Failed to start round');
    } finally {
      setIsLoading(false);
    }
  }, [gameState.questionsPerRound, loadRoundQuestions]);

  // Start the game
  const startGame = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🎮 Starting blockchain trivia game...');
      setGameState(prev => ({
        ...prev,
        answers: [],
        score: 0,
        isTrialPlayer: !walletAddress, // Trial player if no wallet
        sessionId: trialSessionId,
        totalRounds: DEFAULT_TOTAL_ROUNDS,
        questionsPerRound: DEFAULT_QUESTIONS_PER_ROUND,
      }));

      await startRound(1);
    } catch (e) {
      console.error('❌ Error starting game:', e);
      setError(e instanceof Error ? e.message : 'Failed to start game');
    } finally {
      setIsLoading(false);
    }
  }, [walletAddress, trialSessionId, startRound]);

  // Handle round completion
  const handleRoundComplete = useCallback(async (finalScore: number) => {
    setGameState(prev => ({
      ...prev,
      gameStatus: 'completed',
      score: finalScore,
    }));

    // Submit score to blockchain
    try {
      if (walletAddress) {
        // Paid player
        await submitScore(finalScore);
      } else if (trialSessionId) {
        // Trial player
        await submitTrialScore(trialSessionId, finalScore);
      }
    } catch (error) {
      console.error('Error submitting score to blockchain:', error);
      setError('Failed to submit score to blockchain');
    }
  }, [walletAddress, trialSessionId, submitScore, submitTrialScore]);

  // Handle answer submission
  const handleAnswerSubmit = useCallback(async (answer: number) => {
    const currentQ = gameState.questions[gameState.currentQuestion];
    if (!currentQ) return;

    const isCorrect = answer === currentQ.correctAnswer;
    const points = isCorrect ? ScoringSystem.calculateQuestionScore(
      true,
      15 - gameState.timeRemaining, // timeSpent
      15, // timeLimit
      currentQ.difficulty,
      0 // currentStreak - could be calculated from previous answers
    ) : 0;

    const newScore = gameState.score + points;
    const newAnswers = [...gameState.answers, {
      questionId: currentQ.id,
      selectedAnswer: answer,
      isCorrect,
      timeSpent: 15 - gameState.timeRemaining,
      pointsEarned: points
    }];

    setGameState(prev => ({
      ...prev,
      score: newScore,
      answers: newAnswers,
      currentQuestion: prev.currentQuestion + 1,
      timeRemaining: prev.questions[prev.currentQuestion + 1]?.timeLimit || 15,
    }));

    // Check if round is complete
    if (gameState.currentQuestion + 1 >= gameState.questions.length) {
      await handleRoundComplete(newScore);
    }
  }, [gameState, handleRoundComplete]);

  // Handle game entry
  const handleGameEntry = useCallback((sessionId?: string) => {
    if (sessionId) {
      setTrialSessionId(sessionId);
    }
    startGame();
  }, [startGame]);

  // Auto-refresh session info
  useEffect(() => {
    const interval = setInterval(() => {
      refreshSessionInfo();
    }, 10000); // Refresh every 10 seconds

    return () => clearInterval(interval);
  }, [refreshSessionInfo]);

  // Render game entry if not started
  if (gameState.gameStatus === 'waiting') {
    return (
      <div className={className}>
        <BlockchainGameEntry
          walletAddress={walletAddress}
          onGameStart={handleGameEntry}
          className="max-w-2xl mx-auto"
        />
      </div>
    );
  }

  // Render game interface
  return (
    <div className={`space-y-6 ${className}`}>
      {/* Game Header */}
      <Card className="bg-gradient-to-r from-purple-500/10 to-blue-500/10 border-purple-500/20">
        <CardHeader>
          <CardTitle className="flex items-center justify-between text-purple-400">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              Blockchain Trivia Battle
            </div>
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-1">
                <Clock className="w-4 h-4" />
                <span>{formatTimeRemaining(sessionInfo?.endTime || BigInt(0))}</span>
              </div>
              <div className="flex items-center gap-1">
                <DollarSign className="w-4 h-4" />
                <span>{formatUSDC(sessionInfo?.prizePool || BigInt(0))} USDC</span>
              </div>
            </div>
          </CardTitle>
        </CardHeader>
      </Card>

      {/* Error Display */}
      {(error || contractError) && (
        <Alert className="border-red-500/20 bg-red-500/10">
          <AlertDescription className="text-red-300">
            {error || contractError}
          </AlertDescription>
        </Alert>
      )}

      {/* Game Stats */}
      <GameStats
        totalQuestions={gameState.questions.length}
        correctAnswers={gameState.answers.filter(a => a.isCorrect).length}
        accuracy={gameState.answers.length > 0 ? (gameState.answers.filter(a => a.isCorrect).length / gameState.answers.length) * 100 : 0}
        averageTime={gameState.answers.length > 0 ? gameState.answers.reduce((sum, a) => sum + a.timeSpent, 0) / gameState.answers.length : 0}
        totalScore={gameState.score}
        maxScore={gameState.questions.length * 100}
      />

      {/* Current Question */}
      {gameState.gameStatus === 'playing' && gameState.questions[gameState.currentQuestion] && (
        <TriviaQuestion
          question={gameState.questions[gameState.currentQuestion]}
          onAnswer={handleAnswerSubmit}
          questionNumber={gameState.currentQuestion + 1}
          totalQuestions={gameState.questions.length}
        />
      )}

      {/* Round Complete */}
              {gameState.gameStatus === 'completed' && (
        <Card className="bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20">
          <CardHeader>
            <CardTitle className="text-green-400">Round Complete!</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-green-300 mb-2">
                Final Score: {gameState.score}
              </p>
              <p className="text-gray-300 mb-4">
                Your score has been submitted to the blockchain!
              </p>
              
              {gameState.currentRound && gameState.totalRounds && gameState.currentRound < gameState.totalRounds ? (
                <Button
                  onClick={() => startRound((gameState.currentRound || 0) + 1)}
                  disabled={isLoading}
                  className="bg-green-600 hover:bg-green-500 text-white"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Next Round
                </Button>
              ) : (
                <div className="space-y-2">
                  <p className="text-yellow-300">Game Complete!</p>
                  <p className="text-sm text-gray-400">
                    Wait for the session to end to see if you won prizes.
                  </p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading State */}
      {(isLoading || contractLoading) && (
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-400 mx-auto"></div>
          <p className="text-gray-400 mt-4">
            {contractLoading ? 'Processing blockchain transaction...' : 'Loading game...'}
          </p>
        </div>
      )}
    </div>
  );
}
