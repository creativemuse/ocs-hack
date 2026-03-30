'use client';

import { useState, useEffect } from 'react';
import { Trophy, ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Confetti } from '@neoconfetti/react';
import HighScoreDisplay from './HighScoreDisplay';

interface GameScoreCardProps {
  finalScore: number;
  totalQuestions: number;
  correctAnswers: number;
  accuracy: number;
  playerName: string;
  isGuest?: boolean;
  guestId?: string;
  isTrialGame: boolean;
  onPlayAgain?: () => void;
  onBackToEntry: () => void;
  className?: string;
}

export default function GameScoreCard({
  finalScore,
  totalQuestions,
  correctAnswers,
  accuracy,
  playerName,
  isGuest = false,
  guestId,
  isTrialGame,
  onPlayAgain,
  onBackToEntry,
  className = '',
}: GameScoreCardProps) {
  const [showConfetti, setShowConfetti] = useState(false);

  // Show confetti when component mounts
  useEffect(() => {
    setShowConfetti(true);
    // Auto-hide confetti after animation completes
    const confettiTimer = setTimeout(() => setShowConfetti(false), 4000);
    return () => clearTimeout(confettiTimer);
  }, []);

  return (
    <div className={`bg-[#000000] min-h-screen w-full flex items-center justify-center px-4 py-4 relative ${className}`}>
      {/* Confetti Effect */}
      {showConfetti && (
        <div className="fixed inset-0 z-50 pointer-events-none flex items-center justify-center">
          <Confetti
            particleCount={200}
            force={0.6}
            duration={3500}
            colors={['#FFC700', '#FFD700', '#FF0000', '#2E3191', '#41BBC7', '#10B981']}
            particleShape="mix"
            stageHeight={600}
            stageWidth={800}
          />
        </div>
      )}

      <div className="w-full max-w-[390px] md:max-w-[428px] text-center relative z-10">
        {/* Header Section */}
        <div className="text-white mb-8">
          <div className="mx-auto w-20 h-20 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex items-center justify-center mb-4">
            <Trophy className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-3xl font-bold mb-4">Game Complete!</h1>
          <div className="text-2xl mb-2 font-bold text-yellow-400">Final Score: {finalScore.toLocaleString()}</div>
          <div className="text-gray-400 mb-4">
            {isTrialGame ? (isGuest ? `Trial Player: ${playerName}` : 'Trial Player') : 'Paid Player'}
          </div>
        </div>

        {/* Statistics Card */}
        <div className="bg-white/10 border border-white/20 rounded-lg p-6 mb-6 backdrop-blur-sm">
          <h2 className="text-xl font-semibold text-white mb-4">Your Stats</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-gray-400 text-sm mb-1">Correct</div>
              <div className="text-2xl font-bold text-green-400">{correctAnswers}/{totalQuestions}</div>
            </div>
            <div>
              <div className="text-gray-400 text-sm mb-1">Accuracy</div>
              <div className="text-2xl font-bold text-blue-400">{accuracy.toFixed(1)}%</div>
            </div>
          </div>
        </div>

        {/* Trial Player Notice */}
        {isTrialGame && (
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-4 mb-6">
            <div className="text-amber-300 text-sm">
              <p className="font-medium mb-2">🎮 Practice Game Results</p>
              <p className="text-amber-200/80">
                This was a practice game. Your score won't qualify for prizes from the prize pool.
                Connect your wallet to play for real money and compete for prizes!
              </p>
            </div>
          </div>
        )}

        {/* Paid Player Success */}
        {!isTrialGame && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-4 mb-6">
            <div className="text-green-300 text-sm">
              <p className="font-medium mb-2">🏆 Prize Pool Entry</p>
              <p className="text-green-200/80">
                Your score qualifies for prizes! You'll be entered into the prize pool distribution.
              </p>
            </div>
          </div>
        )}

        {/* High Score Display */}
        <div className="mb-6">
          <HighScoreDisplay
            currentScore={finalScore}
            playerName={playerName}
            isGuest={isGuest}
            guestId={guestId}
            isTrialGame={isTrialGame}
            className="w-full"
          />
        </div>

        {/* Action Buttons */}
        <div className="space-y-3">
          {/* Play Again button - only for paid players */}
          {!isTrialGame && onPlayAgain && (
            <Button
              onClick={onPlayAgain}
              className="w-full bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white px-6 py-3 rounded-lg text-lg font-semibold"
              size="lg"
            >
              Play Again
            </Button>
          )}

          {/* Back to Game Entry button - for all players */}
          <Button
            onClick={onBackToEntry}
            variant="outline"
            className="w-full bg-gray-800 hover:bg-gray-700 text-white border-gray-600 px-6 py-3 rounded-lg text-lg font-medium"
            size="lg"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Game Entry
          </Button>
        </div>
      </div>
    </div>
  );
}
