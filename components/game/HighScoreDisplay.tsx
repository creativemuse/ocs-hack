'use client';

import { useState, useEffect } from 'react';
import { Trophy, Medal, Award, Crown, Coins, CheckCircle } from 'lucide-react';
import { useHighScores } from '@/hooks/useHighScores';
import { usePlayerWinnings } from '@/hooks/usePlayerWinnings';
import { Badge } from '@/components/ui/badge';
import { useBaseAccount } from '@/hooks/useBaseAccount';
import ClaimWinningsButton from '@/components/game/ClaimWinningsButton';
import { BaseName } from '@/components/identity/BaseName';
import { Confetti } from '@neoconfetti/react';

interface HighScoreDisplayProps {
  currentScore: number;
  playerName: string;
  isGuest: boolean;
  guestId?: string;
  isTrialGame?: boolean;
  /** Paid games only: ties score to wallet for high-scores API (not used for trial). */
  walletAddress?: string;
  className?: string;
}

export default function HighScoreDisplay({ 
  currentScore, 
  playerName, 
  isGuest, 
  guestId,
  isTrialGame = false,
  walletAddress,
  className = '' 
}: HighScoreDisplayProps) {
  const { highScores, getCurrentHighScore, getPlayerRank, submitScore } = useHighScores();
  const { address, isConnected } = useBaseAccount();
  const { winnings, markAsClaimed, refreshWinnings } = usePlayerWinnings();
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [submissionResult, setSubmissionResult] = useState<{
    isNewHighScore: boolean;
    rank: number;
  } | null>(null);
  const [showConfetti, setShowConfetti] = useState(false);

  const currentHighScore = getCurrentHighScore();
  const playerRank = getPlayerRank(currentScore);
  const isHighestScore = currentScore >= currentHighScore;

  const handleClaimSuccess = () => {
    markAsClaimed();
    refreshWinnings();
  };

  // Paid games only: submit to high-scores API. Trial/practice never hits the leaderboard.
  useEffect(() => {
    if (currentScore <= 0 || hasSubmitted) return;

    if (isTrialGame) {
      setHasSubmitted(true);
      return;
    }

    const submitCurrentScore = async () => {
      const result = await submitScore(
        playerName,
        currentScore,
        isGuest,
        guestId,
        walletAddress
      );
      if (result) {
        setHasSubmitted(true);
        setSubmissionResult({
          isNewHighScore: result.isNewHighScore,
          rank: result.rank,
        });

        if (result.isNewHighScore) {
          setShowConfetti(true);
          setTimeout(() => setShowConfetti(false), 4000);
        }
      }
    };
    submitCurrentScore();
  }, [
    currentScore,
    playerName,
    isGuest,
    guestId,
    walletAddress,
    isTrialGame,
    hasSubmitted,
    submitScore,
  ]);

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="h-4 w-4 text-yellow-500" />;
      case 2:
        return <Trophy className="h-4 w-4 text-gray-400" />;
      case 3:
        return <Medal className="h-4 w-4 text-amber-600" />;
      default:
        return <Award className="h-4 w-4 text-blue-500" />;
    }
  };

  const formatScore = (score: number) => {
    return score.toLocaleString();
  };

  // Component to display player name with fallback priority:
  // 1. Username (if set)
  // 2. Basename (if available)  
  // 3. Shortened wallet address
  const PlayerDisplayName = ({ walletAddress, username, isGuest }: { walletAddress?: string; username?: string; isGuest?: boolean }) => {
    if (isGuest) {
      return <span>{username || 'Guest'}</span>;
    }
    
    if (username) {
      return <span>{username}</span>;
    }
    
    if (walletAddress) {
      return (
        <BaseName
          address={walletAddress as `0x${string}`}
        />
      );
    }
    
    return <span>Unknown Player</span>;
  };

  return (
    <div className={`bg-white rounded-lg p-4 shadow-lg border ${className} relative`}>
      {/* Confetti Effect - Centered at top of container */}
      {showConfetti && (
        <div className="absolute top-0 left-1/2 -translate-x-1/2 z-50 pointer-events-none">
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

      <div className="mb-4">
        <h3 className="text-lg font-bold text-gray-800 mb-2">High Scores</h3>

        {isTrialGame && currentScore > 0 && (
          <p className="text-xs text-amber-800 bg-amber-50 border border-amber-200 rounded-md px-2 py-1.5 mb-3">
            Practice run — this score is not added to the paid leaderboard.
          </p>
        )}
        
        {/* Current Player Status */}
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">
                {playerName} {isGuest && '(Guest)'}
              </p>
              <p className="text-lg font-bold text-blue-900">
                {formatScore(currentScore)}
              </p>
            </div>
            <div className="text-right">
              {!isTrialGame && isHighestScore && currentScore > 0 && (
                <div className="flex items-center text-yellow-600 mb-1">
                  <Crown className="h-4 w-4 mr-1" />
                  <span className="text-xs font-bold">HIGHEST SCORE!</span>
                </div>
              )}
              <p className="text-sm text-blue-600">
                {isTrialGame ? 'Rank: — (practice)' : `Rank: #${playerRank}`}
              </p>
            </div>
          </div>
        </div>

        {/* Submission Result */}
        {submissionResult && (
          <div className={`mb-3 p-3 rounded-lg ${
            submissionResult.isNewHighScore 
              ? 'bg-yellow-50 border border-yellow-200' 
              : 'bg-green-50 border border-green-200'
          }`}>
            <div className="flex items-center">
              {submissionResult.isNewHighScore ? (
                <>
                  <Crown className="h-5 w-5 text-yellow-600 mr-2" />
                  <span className="text-sm font-bold text-yellow-800">
                    🎉 NEW HIGH SCORE! Rank #{submissionResult.rank}
                  </span>
                </>
              ) : (
                <>
                  <Award className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-sm font-bold text-green-800">
                    Score submitted! Rank #{submissionResult.rank}
                  </span>
                </>
              )}
            </div>
          </div>
        )}

        {/* Claim Winnings Section - Only for connected paid players */}
        {isConnected && !isGuest && (
          <div className="mb-3">
            {!isTrialGame ? (
              <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-3">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-yellow-600" />
                    <span className="text-sm font-medium text-yellow-800">Prize Winnings</span>
                  </div>
                  <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700 border-yellow-500/30">
                    <Crown className="h-3 w-3 mr-1" />
                    {isTrialGame ? 'Trial Player' : 'Paid Player'}
                  </Badge>
                </div>
                
                {!isTrialGame && winnings.hasWinnings && !winnings.hasClaimed ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Your Winnings:</span>
                      <span className="text-lg font-bold text-green-600">
                        {Number(winnings.winningAmount) / 1000000} USDC
                      </span>
                    </div>
                    {winnings.rank && (
                      <div className="text-xs text-gray-500">
                        Prize Rank: #{winnings.rank}
                      </div>
                    )}
                    <ClaimWinningsButton
                      winningAmount={winnings.winningAmount}
                      onClaimSuccess={handleClaimSuccess}
                      disabled={winnings.hasClaimed}
                    />
                  </div>
                ) : !isTrialGame && winnings.hasClaimed ? (
                  <div className="flex items-center gap-2 text-green-600 justify-center p-3">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Winnings Claimed: {Number(winnings.winningAmount) / 1000000} USDC
                    </span>
                  </div>
                ) : !isTrialGame ? (
                  <div className="text-sm text-gray-600">
                    {winnings.sessionActive ? 'Session still active - winnings will be calculated after completion' : 'No winnings to claim for this session'}
                  </div>
                ) : (
                  <div className="text-sm text-gray-600">
                    Trial players are not eligible for prize distribution
                  </div>
                )}
              </div>
            ) : (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-3">
                <div className="flex items-center gap-2 text-gray-600">
                  <Coins className="h-4 w-4" />
                  <span className="text-sm">Only paid players can claim winnings</span>
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Trial players are not eligible for prize distribution
                </div>
              </div>
            )}
          </div>
        )}

        {/* Current High Score */}
        {currentHighScore > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Crown className="h-5 w-5 text-yellow-600 mr-2" />
                <span className="text-sm font-medium text-yellow-800">Current High Score</span>
              </div>
              <span className="text-lg font-bold text-yellow-900">
                {formatScore(currentHighScore)}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Top Scores List */}
      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">Top Scores</h4>
        <div className="space-y-2">
          {highScores.slice(0, 5).map((score, index) => (
            <div 
              key={score.id}
              className={`flex items-center justify-between p-2 rounded ${
                score.playerName === playerName && score.score === currentScore
                  ? 'bg-blue-100 border border-blue-300'
                  : 'bg-gray-50'
              }`}
            >
              <div className="flex items-center">
                {getRankIcon(index + 1)}
                <span className="ml-2 text-sm font-medium text-gray-700">
                  <PlayerDisplayName 
                    walletAddress={score.walletAddress}
                    username={score.playerName}
                    isGuest={score.isGuest}
                  />
                  {score.isGuest && <span className="text-xs text-gray-500 ml-1">(Guest)</span>}
                </span>
              </div>
              <span className="text-sm font-bold text-gray-900">
                {formatScore(score.score)}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
