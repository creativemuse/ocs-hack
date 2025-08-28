'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { QuestionGenerator } from '@/lib/game/questionGenerator';
import { SpotifyAPI } from '@/lib/apis/spotify';
import SpotifyAuth from '@/components/spotify/SpotifyAuth';
import SpotifyPlayer from '@/components/spotify/SpotifyPlayer';
import TriviaQuestion from './TriviaQuestion';
import GameStats from './GameStats';
import Timer from './Timer';
import type { GameState, DifficultyLevel } from '@/types/game';
import type { SpotifyTrack } from '@/types/spotify';
import { Music, Trophy, Clock, Target, Play } from 'lucide-react';

interface SpotifyTriviaGameProps {
  className?: string;
}

export default function SpotifyTriviaGame({ className = '' }: SpotifyTriviaGameProps) {
  const [gameState, setGameState] = useState<GameState>({
    currentQuestion: 0,
    questions: [],
    answers: [],
    score: 0,
    timeRemaining: 0,
    gameStatus: 'waiting',
    prizePool: 0,
    entryFee: 0,
    isTrialPlayer: true, // Default to trial player for Spotify game
    sessionId: undefined,
    currentRound: 0,
    totalRounds: 3,
    questionsPerRound: 10,
  });
  
  const [isLoading, setIsLoading] = useState(false);
  const [difficulty, setDifficulty] = useState<DifficultyLevel>('medium');
  const [questionCount, setQuestionCount] = useState(10);
  const [isSpotifyConnected, setIsSpotifyConnected] = useState(false);
  const [_currentTrack, setCurrentTrack] = useState<SpotifyTrack | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleSpotifyAuthSuccess = useCallback((token: string) => {
    SpotifyAPI.setUserAccessToken(token);
    setIsSpotifyConnected(true);
    setError(null);
  }, []);

  const handleSpotifyAuthError = useCallback((errorMessage: string) => {
    setError(errorMessage);
    setIsSpotifyConnected(false);
  }, []);

  const DEFAULT_TOTAL_ROUNDS = 3;
  const DEFAULT_QUESTIONS_PER_ROUND = 10;

  const startRound = useCallback(async (roundNumber: number) => {
    setIsLoading(true);
    try {
      const perRound = gameState.questionsPerRound || DEFAULT_QUESTIONS_PER_ROUND;
      const qs = await QuestionGenerator.generateTopGlobalQuestionSet(
        perRound,
        difficulty
      );

      if (!qs.length) throw new Error('Failed to generate questions. Please try again.');

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
    } catch (err) {
      console.error('Error starting round:', err);
      setError(err instanceof Error ? err.message : 'Failed to start round');
    } finally {
      setIsLoading(false);
    }
  }, [difficulty, gameState.questionsPerRound]);

  const startGame = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      console.log('Starting Spotify trivia game...');
      // Initialize rounds config and load first round
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
    } catch (error) {
      console.error('Error starting game:', error);
      setError(error instanceof Error ? error.message : 'Failed to start game');
    } finally {
      setIsLoading(false);
    }
  }, [difficulty, startRound]);

  const handleAnswer = useCallback((selectedAnswer: number, timeSpent: number) => {
    const currentQ = gameState.questions[gameState.currentQuestion];
    if (!currentQ) return;

    const isCorrect = selectedAnswer === currentQ.correctAnswer;
    const pointsEarned = isCorrect ? Math.max(1, Math.floor(10 - timeSpent / 2)) : 0;

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
      // Round completed - either start next round or finish game
      const nextRound = (gameState.currentRound || 1) + 1;
      if (nextRound <= (gameState.totalRounds || DEFAULT_TOTAL_ROUNDS)) {
        setGameState(prev => ({
          ...prev,
          answers: newAnswers,
          score: newScore,
        }));
        void startRound(nextRound);
      } else {
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
      // Move to next question
      const nextQuestion = gameState.questions[nextQuestionIndex];
      setGameState(prev => ({
        ...prev,
        answers: newAnswers,
        score: newScore,
        currentQuestion: nextQuestionIndex,
        timeRemaining: nextQuestion?.timeLimit || 15,
        isTrialPlayer: true,
        sessionId: undefined,
      }));
    }
  }, [gameState]);

  const handleTimeUp = useCallback(() => {
    handleAnswer(-1, gameState.questions[gameState.currentQuestion]?.timeLimit || 15);
  }, [handleAnswer, gameState.questions, gameState.currentQuestion]);

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
      isTrialPlayer: true, // Default to trial player
      sessionId: undefined,
    });
    setCurrentTrack(null);
    setError(null);
  }, []);

  const getCurrentQuestion = () => {
    return gameState.questions[gameState.currentQuestion];
  };

  const getGameStats = () => {
    const totalQuestions = gameState.answers.length;
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

  if (gameState.gameStatus === 'waiting') {
    return (
      <div className={`max-w-4xl mx-auto ${className}`}>
        <Card className="shadow-lg border-0 bg-gradient-to-br from-white to-gray-50">
          <CardHeader className="text-center">
            <div className="mx-auto w-16 h-16 bg-gradient-to-r from-green-400 to-blue-500 rounded-full flex items-center justify-center mb-4">
              <Music className="w-8 h-8 text-white" />
            </div>
            <CardTitle className="text-3xl font-bold text-gray-800 mb-2">
              Spotify Music Trivia
            </CardTitle>
            <p className="text-gray-600 text-lg">
              Test your knowledge of the Top Global hits on Spotify!
            </p>
          </CardHeader>

          <CardContent className="space-y-6">
            {/* Spotify Authentication */}
            <div className="mb-6">
              <SpotifyAuth
                onAuthSuccess={handleSpotifyAuthSuccess}
                onAuthError={handleSpotifyAuthError}
                className="mb-4"
              />
              
              {error && (
                <div className="text-center p-4 bg-red-50 border border-red-200 rounded-lg">
                  <p className="text-red-600 text-sm">{error}</p>
                </div>
              )}
            </div>

            {/* Game Configuration */}
            <Tabs defaultValue="settings" className="w-full">
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="settings">Game Settings</TabsTrigger>
                <TabsTrigger value="preview">Preview</TabsTrigger>
              </TabsList>
              
              <TabsContent value="settings" className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                    <p className="text-lg font-bold text-purple-600">{questionCount * 10}</p>
                  </div>
                </div>
              </TabsContent>
              
              <TabsContent value="preview">
                <div className="text-center p-6 bg-gray-50 rounded-lg">
                  <h3 className="text-lg font-semibold mb-2">Top Global Playlist</h3>
                  <p className="text-gray-600 text-sm mb-4">
                    Questions will be generated from Spotify&apos;s Top Global playlist featuring the most popular songs worldwide.
                  </p>
                  <div className="flex items-center justify-center space-x-2 text-green-600">
                    <Music className="w-4 h-4" />
                    <span className="text-sm font-medium">Real-time music data</span>
                  </div>
                </div>
              </TabsContent>
            </Tabs>

            {/* Start Game Button */}
            <div className="text-center">
              <Button
                onClick={startGame}
                disabled={isLoading || !isSpotifyConnected}
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
              
              {!isSpotifyConnected && (
                <p className="text-sm text-gray-500 mt-2">
                  Connect your Spotify account to start playing
                </p>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (gameState.gameStatus === 'playing') {
    const currentQuestion = getCurrentQuestion();
    
    return (
      <div className={`max-w-4xl mx-auto ${className}`}>
        {/* Game Header */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center space-x-4">
              <Badge variant="outline" className="bg-green-50 text-green-700 border-green-200">
                <Music className="w-3 h-3 mr-1" />
                Top Global
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

        {/* Question */}
        {currentQuestion && (
          <TriviaQuestion
            question={currentQuestion}
            questionNumber={gameState.currentQuestion + 1}
            totalQuestions={gameState.questions.length}
            onAnswer={handleAnswer}
          />
        )}

        {/* Spotify Player */}
        <div className="mt-6">
          <SpotifyPlayer
            track={currentQuestion ? {
              id: currentQuestion.metadata.trackId || '',
              name: currentQuestion.metadata.songTitle,
              artists: [{ id: '', name: currentQuestion.metadata.artistName }],
              album: {
                id: '',
                name: '',
                release_date: currentQuestion.metadata.releaseYear || '',
                images: currentQuestion.imageUrl ? [{ url: currentQuestion.imageUrl, height: 300, width: 300 }] : []
              },
              preview_url: currentQuestion.audioUrl || null,
              duration_ms: 0,
              popularity: 0,
              external_urls: { spotify: '' },
              uri: `spotify:track:${currentQuestion.metadata.trackId}`
            } : undefined}
            autoPlay={false}
            className="mt-4"
          />
        </div>
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
            {/* Game Stats */}
            <GameStats
              totalQuestions={stats.totalQuestions}
              correctAnswers={stats.correctAnswers}
              accuracy={stats.accuracy}
              averageTime={stats.averageTime}
              totalScore={stats.totalScore}
              maxScore={stats.totalQuestions * 10}
            />

            {/* Performance Breakdown */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-4 bg-blue-50 rounded-lg">
                <h3 className="font-semibold text-blue-800 mb-2">Question Types</h3>
                <div className="space-y-1 text-sm">
                  {gameState.questions.map((q, index) => (
                    <div key={q.id} className="flex justify-between">
                      <span className="text-gray-600">
                        Q{index + 1}: {q.type.replace('-', ' ')}
                      </span>
                      <span className={gameState.answers[index]?.isCorrect ? 'text-green-600' : 'text-red-600'}>
                        {gameState.answers[index]?.isCorrect ? '✓' : '✗'}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="p-4 bg-green-50 rounded-lg">
                <h3 className="font-semibold text-green-800 mb-2">Performance</h3>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Accuracy:</span>
                    <span className="font-medium">{stats.accuracy.toFixed(1)}%</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Avg. Time:</span>
                    <span className="font-medium">{stats.averageTime}s</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Score:</span>
                    <span className="font-medium">{stats.totalScore}/{stats.totalQuestions * 10}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={resetGame}
                variant="outline"
                size="lg"
                className="flex items-center space-x-2"
              >
                <Music className="w-4 h-4" />
                <span>Play Again</span>
              </Button>
              
              <Button
                onClick={() => window.location.href = '/'}
                size="lg"
                className="bg-gradient-to-r from-green-500 to-blue-500 hover:from-green-600 hover:to-blue-600 text-white"
              >
                <span>Back to Menu</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return null;
}
