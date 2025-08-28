'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import TriviaQuestion from '@/components/game/TriviaQuestion';
import GameStats from '@/components/game/GameStats';
import Timer from '@/components/game/Timer';
import type { GameState, DifficultyLevel, QuestionType, TriviaQuestion as TQ } from '@/types/game';
import { Music, Trophy, Clock, Target, Play } from 'lucide-react';
import { ScoringSystem } from '@/lib/game/scoring';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { SessionManager } from '@/lib/utils/sessionManager';

export default function SupabaseTriviaGame({ className = '' }: { className?: string }) {
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
    isTrialPlayer: true, // Default to trial player for Supabase game
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
  
  // Add trial status hook (walletAddress will be null for anonymous users)
  const { trialStatus, isLoading: _trialLoading, incrementTrialGame } = useTrialStatus(undefined);

  const DEFAULT_TOTAL_ROUNDS = 3;
  const DEFAULT_QUESTIONS_PER_ROUND = 10;

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

  const startGame = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('🎮 Starting Supabase trivia game...');
      setGameState(prev => ({
        ...prev,
        answers: [],
        score: 0,
        isTrialPlayer: true,
        sessionId: undefined,
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
  }, [startRound]);

  const handleAnswer = useCallback((selectedAnswer: number, timeSpent: number) => {
    const currentQ = gameState.questions[gameState.currentQuestion];
    if (!currentQ) return;

    const isCorrect = selectedAnswer === currentQ.correctAnswer;

    let streak = 0;
    for (let i = gameState.answers.length - 1; i >= 0; i--) {
      if (gameState.answers[i]!.isCorrect) streak++;
      else break;
    }

    const pointsEarned = ScoringSystem.calculateQuestionScore(
      isCorrect,
      timeSpent,
      currentQ.timeLimit,
      currentQ.difficulty,
      streak
    );

    const newAnswer = {
      questionId: currentQ.id,
      selectedAnswer,
      isCorrect,
      timeSpent,
      pointsEarned,
    };

    const newAnswers = [...gameState.answers, newAnswer];
    const newScore = gameState.score + pointsEarned;
    const nextQuestionIndex = gameState.currentQuestion + 1;

    if (nextQuestionIndex >= gameState.questions.length) {
      // Round completed: either next round or finish game and save
      const nextRound = (gameState.currentRound || 1) + 1;
      if (nextRound <= (gameState.totalRounds || DEFAULT_TOTAL_ROUNDS)) {
        setGameState(prev => ({
          ...prev,
          answers: newAnswers,
          score: newScore,
        }));
        void startRound(nextRound);
      } else {
        const finalScore = newScore;
        const sessionId = SessionManager.getSessionId();
        fetch('/api/save-anonymous-game', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            score: finalScore,
            questions: gameState.questions,
            answers: newAnswers
          })
        }).catch(console.error);
        incrementTrialGame();
        setGameState(prev => ({
          ...prev,
          answers: newAnswers,
          score: newScore,
          gameStatus: 'completed',
          timeRemaining: 0,
          isTrialPlayer: true,
          sessionId: undefined,
        }));
      }
    } else {
      const nextQuestion = gameState.questions[nextQuestionIndex];
      setGameState(prev => ({
        ...prev,
        answers: newAnswers,
        score: newScore,
        currentQuestion: nextQuestionIndex,
        timeRemaining: nextQuestion?.timeLimit || 15,
      }));
    }
  }, [gameState, incrementTrialGame, startRound]);

  const handleTimeUp = useCallback(() => {
    const tl = gameState.questions[gameState.currentQuestion]?.timeLimit || 15;
    const nextIndex = gameState.currentQuestion + 1;
    const newAnswers = [...gameState.answers, {
      questionId: gameState.questions[gameState.currentQuestion]?.id || `q_${Date.now()}`,
      selectedAnswer: -1,
      isCorrect: false,
      timeSpent: tl,
      pointsEarned: 0,
    }];

    if (nextIndex >= gameState.questions.length) {
      // End of round due to time
      const nextRound = (gameState.currentRound || 1) + 1;
      if (nextRound <= (gameState.totalRounds || DEFAULT_TOTAL_ROUNDS)) {
        setGameState(prev => ({
          ...prev,
          answers: newAnswers,
        }));
        void startRound(nextRound);
      } else {
        const finalScore = gameState.score;
        const sessionId = SessionManager.getSessionId();
        fetch('/api/save-anonymous-game', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            sessionId,
            score: finalScore,
            questions: gameState.questions,
            answers: newAnswers
          })
        }).catch(console.error);
        incrementTrialGame();
        setGameState(prev => ({
          ...prev,
          answers: newAnswers,
          gameStatus: 'completed',
          timeRemaining: 0,
        }));
      }
    } else {
      setGameState(prev => ({
        ...prev,
        answers: newAnswers,
        currentQuestion: nextIndex,
        timeRemaining: gameState.questions[nextIndex]?.timeLimit || 15,
      }));
    }
  }, [gameState, incrementTrialGame, startRound]);

  const resetGame = useCallback(() => {
    setGameState({
      currentQuestion: 0,
      questions: [],
      answers: [],
      score: 0,
      timeRemaining: 0,
      gameStatus: 'waiting',
      prizePool: 0,
      entryFee: 0,
      isTrialPlayer: true,
      sessionId: undefined,
    });
    setError(null);
  }, []);

  const getGameStats = () => {
    const totalQuestions = gameState.questions.length;
    const correctAnswers = gameState.answers.filter(a => a.isCorrect).length;
    const averageTime = gameState.answers.length > 0 
      ? gameState.answers.reduce((sum, a) => sum + a.timeSpent, 0) / gameState.answers.length 
      : 0;

    return {
      totalQuestions,
      correctAnswers,
      accuracy: totalQuestions > 0 ? (correctAnswers / totalQuestions) * 100 : 0,
      averageTime: Math.round(averageTime),
      totalScore: gameState.score,
    };
  };

  // Show trial completion screen if user has used all free games
  if (trialStatus.requiresWallet) {
    return (
      <div className={`max-w-4xl mx-auto ${className}`}>
        <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mb-4">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-2xl font-bold text-gray-800 mb-2">
              Trial Games Complete!
            </CardTitle>
            <p className="text-gray-600 text-lg mb-4">
              You&apos;ve played {trialStatus.gamesPlayed} free games. Connect your wallet to continue playing and earn rewards!
            </p>
          </CardHeader>
          <CardContent className="text-center">
            <Button
              onClick={() => {/* TODO: Trigger wallet connection */}}
              size="lg"
              className="bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-8 py-3"
            >
              Connect Wallet to Continue
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gameState.gameStatus === 'waiting') {
    return (
      <div className={`max-w-4xl mx-auto ${className}`}>
        <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center mb-4">
              <Music className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold text-gray-800 mb-2">
              Global Top 100 Trivia
            </CardTitle>
            <p className="text-gray-600 text-lg">
              Guess the track or artist from the Global Top 100 hits!
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Trial games counter - only show if trial is active */}
            {trialStatus.isTrialActive && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
                <p className="text-sm text-blue-700">
                  🎮 Free Trial: {trialStatus.gamesRemaining} games remaining
                </p>
                <p className="text-xs text-blue-600 mt-1">
                  Game {trialStatus.gamesPlayed + 1} of 3
                </p>
              </div>
            )}
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Question Type
                </label>
                <select
                  value={questionType}
                  onChange={(e) => setQuestionType(e.target.value as QuestionType)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="name-that-tune">Name That Tune</option>
                  <option value="artist-match">Artist Match</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Questions
                </label>
                <select
                  value={questionCount}
                  onChange={(e) => setQuestionCount(parseInt(e.target.value))}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value={5}>5 Questions</option>
                  <option value={10}>10 Questions</option>
                  <option value={15}>15 Questions</option>
                  <option value={20}>20 Questions</option>
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Difficulty Level
                </label>
                <select
                  value={difficulty}
                  onChange={(e) => setDifficulty(e.target.value as DifficultyLevel)}
                  className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="easy">Easy</option>
                  <option value="medium">Medium</option>
                  <option value="hard">Hard</option>
                  <option value="expert">Expert</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
              <div className="p-4 bg-blue-50 rounded-lg">
                <Clock className="w-6 h-6 text-blue-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">Time Limit</p>
                <p className="text-lg font-bold text-blue-600">
                  {difficulty === 'easy' ? '20s' : difficulty === 'medium' ? '15s' : difficulty === 'hard' ? '10s' : '8s'}
                </p>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <Target className="w-6 h-6 text-green-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">Questions</p>
                <p className="text-lg font-bold text-green-600">{questionCount}</p>
              </div>
              
              <div className="p-4 bg-purple-50 rounded-lg">
                <Trophy className="w-6 h-6 text-purple-500 mx-auto mb-2" />
                <p className="text-sm font-medium text-gray-700">Max Score</p>
                <p className="text-lg font-bold text-purple-600">{questionCount * 100}</p>
                <p className="text-xs text-purple-500 mt-1">Speed = More Points!</p>
              </div>
            </div>

            <div className="text-center">
              <Button
                onClick={startGame}
                disabled={isLoading}
                size="lg"
                className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white px-8 py-3"
              >
                {isLoading ? (
                  <div className="flex items-center space-x-2">
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                    <span>Loading Questions...</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-2">
                    <Play className="w-5 h-5" />
                    <span>Start Game</span>
                  </div>
                )}
              </Button>
              {error && <p className="text-sm text-red-600 mt-2">{error}</p>}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gameState.gameStatus === 'playing') {
    const currentQuestion = gameState.questions[gameState.currentQuestion];
    
    return (
      <div className={`max-w-4xl mx-auto ${className}`}>
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <Music className="w-3 h-3 mr-1" />
                Global Top 100
              </Badge>
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                Round {gameState.currentRound || 1} of {gameState.totalRounds || DEFAULT_TOTAL_ROUNDS}
              </Badge>
              <span className="text-sm text-gray-600">
                Question {gameState.currentQuestion + 1} of {gameState.questionsPerRound || DEFAULT_QUESTIONS_PER_ROUND}
              </span>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm text-gray-600">Score</p>
                <p className="text-lg font-bold text-blue-600">{gameState.score}</p>
              </div>
              <Timer
                key={currentQuestion?.id}
                initialTime={gameState.timeRemaining}
                onTimeUp={handleTimeUp}
                isActive={true}
              />
            </div>
          </div>
        </div>

        {currentQuestion && (
          <TriviaQuestion
            question={currentQuestion}
            questionNumber={gameState.currentQuestion + 1}
            totalQuestions={gameState.questions.length}
            onAnswer={handleAnswer}
          />
        )}
      </div>
    );
  }

  if (gameState.gameStatus === 'completed') {
    const stats = getGameStats();
    
    return (
      <div className={`max-w-4xl mx-auto ${className}`}>
        <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mb-4">
              <Trophy className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold text-gray-800 mb-2">
              Game Complete!
            </CardTitle>
            <p className="text-gray-600 text-lg">
              Great job! Here&apos;s how you performed:
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            <GameStats
              totalQuestions={stats.totalQuestions}
              correctAnswers={stats.correctAnswers}
              accuracy={stats.accuracy}
              averageTime={stats.averageTime}
              totalScore={stats.totalScore}
              maxScore={stats.totalQuestions * 100}
            />
            <div className="text-center">
              <Button onClick={resetGame} size="lg" variant="outline">
                Play Again
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
