'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { Trophy, Medal, Award, Crown, Coins, CheckCircle } from 'lucide-react';
import { useHighScores } from '@/hooks/useHighScores';
import { useWeeklyLeaderboard } from '@/hooks/useWeeklyLeaderboard';
import { usePlayerWinnings } from '@/hooks/usePlayerWinnings';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { useBaseAccount } from '@/hooks/useBaseAccount';
import ClaimWinningsButton from '@/components/game/ClaimWinningsButton';
import { BaseName } from '@/components/identity/BaseName';
import { PlayerAvatarWithFetch } from '@/components/identity/PlayerAvatar';
import ComposeCastButton from '@/components/social/ComposeCastButton';
import { Confetti } from '@neoconfetti/react';
import {
  computeRankForScore,
  isNewWeeklyLeader,
  type WeeklyLeaderboardEntry,
} from '@/lib/game/weeklyLeaderboard';

const LEADERBOARD_LIMIT = 10;
const CONFETTI_DURATION_MS = 8000;

interface HighScoreDisplayProps {
  currentScore: number;
  playerName: string;
  isGuest: boolean;
  guestId?: string;
  isTrialGame?: boolean;
  /** Paid games only: ties score to wallet for high-scores API (not used for trial). */
  walletAddress?: string;
  /** Set when /api/save-paid-score has completed so rank lookup uses fresh data. */
  scoreSaved?: boolean;
  className?: string;
}

const mergeLatestPlayerScore = (
  entries: WeeklyLeaderboardEntry[],
  wallet: string,
  latestScore: number,
  playerName?: string,
): WeeklyLeaderboardEntry[] => {
  const normalized = wallet.toLowerCase();
  const existingIdx = entries.findIndex(
    (e) => e.walletAddress.toLowerCase() === normalized,
  );

  if (existingIdx >= 0) {
    const updated = [...entries];
    updated[existingIdx] = {
      ...updated[existingIdx],
      bestScore: latestScore,
      username: playerName || updated[existingIdx].username,
    };
    return updated.sort((a, b) => b.bestScore - a.bestScore).slice(0, LEADERBOARD_LIMIT);
  }

  return [
    ...entries,
    {
      walletAddress: normalized,
      username: playerName?.includes('...') ? undefined : playerName,
      bestScore: latestScore,
      sessionCounter: entries[0]?.sessionCounter ?? 0,
    },
  ]
    .sort((a, b) => b.bestScore - a.bestScore)
    .slice(0, LEADERBOARD_LIMIT);
};

export default function HighScoreDisplay({
  currentScore,
  playerName,
  isGuest,
  guestId,
  isTrialGame = false,
  walletAddress,
  scoreSaved = false,
  className = '',
}: HighScoreDisplayProps) {
  const { submitScore } = useHighScores();
  const {
    entries: topEarners,
    isLoading: leaderboardLoading,
    isRefreshing,
    refresh,
  } = useWeeklyLeaderboard(LEADERBOARD_LIMIT);
  const { address, isConnected } = useBaseAccount();
  const { winnings, markAsClaimed, refreshWinnings } = usePlayerWinnings();
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [backendRank, setBackendRank] = useState<number | null>(null);
  const [backendIsNewLeader, setBackendIsNewLeader] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const confettiLockedRef = useRef(false);

  const normalizedWallet = walletAddress?.toLowerCase();

  const leaderboardEntries = useMemo(() => {
    if (isTrialGame) return [];

    if (!normalizedWallet || currentScore <= 0) {
      return topEarners.slice(0, LEADERBOARD_LIMIT);
    }

    return mergeLatestPlayerScore(topEarners, normalizedWallet, currentScore, playerName);
  }, [isTrialGame, topEarners, normalizedWallet, currentScore, playerName]);

  const playerRank = useMemo(() => {
    if (isTrialGame || currentScore <= 0 || !normalizedWallet) return null;
    return computeRankForScore(topEarners, normalizedWallet, currentScore);
  }, [isTrialGame, currentScore, normalizedWallet, topEarners]);

  const isOnLeaderboard =
    !leaderboardLoading && playerRank !== null && playerRank <= LEADERBOARD_LIMIT;
  const leadingScore = leaderboardEntries[0]?.bestScore ?? 0;
  const isWeeklyLeader =
    !isTrialGame &&
    !leaderboardLoading &&
    playerRank === 1 &&
    currentScore >= leadingScore;
  const isNewLeader =
    !isTrialGame &&
    currentScore > 0 &&
    normalizedWallet &&
    isNewWeeklyLeader(topEarners, normalizedWallet, currentScore);
  const rankReady = !isTrialGame && (scoreSaved || hasSubmitted) && !leaderboardLoading;

  const handleClaimSuccess = () => {
    markAsClaimed();
    refreshWinnings();
  };

  useEffect(() => {
    if (!scoreSaved) return;
    void refresh();
  }, [scoreSaved, refresh]);

  useEffect(() => {
    if (currentScore <= 0 || hasSubmitted || isTrialGame) {
      if (isTrialGame && !hasSubmitted) setHasSubmitted(true);
      return;
    }

    if (!scoreSaved) return;

    const submitCurrentScore = async () => {
      const result = await submitScore(
        playerName,
        currentScore,
        isGuest,
        guestId,
        walletAddress,
      );
      if (result) {
        setBackendRank(result.rank);
        setBackendIsNewLeader(result.isNewHighScore);
        setHasSubmitted(true);
        void refresh();
      }
    };

    void submitCurrentScore();
  }, [
    currentScore,
    playerName,
    isGuest,
    guestId,
    walletAddress,
    isTrialGame,
    hasSubmitted,
    scoreSaved,
    submitScore,
    refresh,
  ]);

  useEffect(() => {
    if (!rankReady || confettiLockedRef.current) return;
    if (!isNewLeader && !backendIsNewLeader) return;

    confettiLockedRef.current = true;
    const startDelay = setTimeout(() => {
      setShowConfetti(true);
    }, 400);

    const hideTimer = setTimeout(() => {
      setShowConfetti(false);
    }, CONFETTI_DURATION_MS);

    return () => {
      clearTimeout(startDelay);
      clearTimeout(hideTimer);
    };
  }, [rankReady, isNewLeader, backendIsNewLeader]);

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

  const formatScore = (score: number) => score.toLocaleString();

  const PlayerDisplayName = ({
    walletAddress: entryWallet,
    username,
    isGuest: entryIsGuest,
  }: {
    walletAddress?: string;
    username?: string;
    isGuest?: boolean;
  }) => {
    if (entryIsGuest) {
      return <span>{username || 'Guest'}</span>;
    }

    if (username) {
      return <span>{username}</span>;
    }
    if (entryWallet) {
      return <BaseName address={entryWallet as `0x${string}`} />;
    }

    return <span>Unknown Player</span>;
  };

  const displayRank = rankReady ? (playerRank ?? backendRank) : null;
  const showNewLeaderBanner =
    rankReady && (backendIsNewLeader || isNewLeader) && displayRank === 1;
  const showLeaderboardSkeleton =
    (leaderboardLoading || isRefreshing) && leaderboardEntries.length === 0;

  return (
    <div className={`bg-white rounded-lg p-4 shadow-lg border ${className} relative overflow-visible`}>
      {showConfetti && (
        <div
          className="fixed inset-0 z-[100] pointer-events-none flex items-start justify-center"
          aria-hidden="true"
        >
          <Confetti
            particleCount={400}
            force={0.75}
            duration={CONFETTI_DURATION_MS - 500}
            colors={['#FFC700', '#FFD700', '#FF0000', '#A855F7', '#EC4899', '#10B981', '#FFFFFF']}
            particleShape="mix"
            stageHeight={900}
            stageWidth={1200}
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

        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-3">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-blue-800">
                {playerName} {isGuest && '(Guest)'}
              </p>
              <p className="text-lg font-bold text-blue-900">{formatScore(currentScore)}</p>
            </div>
            <div className="text-right">
              {isWeeklyLeader && currentScore > 0 && (
                <div className="flex items-center text-yellow-600 mb-1">
                  <Crown className="h-4 w-4 mr-1" />
                  <span className="text-xs font-bold">#1 THIS WEEK</span>
                </div>
              )}
              <p className="text-sm text-blue-600">
                {isTrialGame
                  ? 'Rank: — (practice)'
                  : !rankReady
                    ? 'Rank: updating...'
                    : displayRank
                      ? `Rank: #${displayRank}${isOnLeaderboard ? ' · Top 10' : ''}`
                      : 'Rank: —'}
              </p>
            </div>
          </div>
        </div>

        {rankReady && (
          <div
            className={`mb-3 p-3 rounded-lg ${
              showNewLeaderBanner
                ? 'bg-yellow-50 border border-yellow-200'
                : 'bg-green-50 border border-green-200'
            }`}
          >
            <div className="flex items-center">
              {showNewLeaderBanner ? (
                <>
                  <Crown className="h-5 w-5 text-yellow-600 mr-2" />
                  <span className="text-sm font-bold text-yellow-800">
                    🎉 NEW #1 ON THE WEEKLY BOARD! Rank #{displayRank}
                  </span>
                </>
              ) : (
                <>
                  <Award className="h-5 w-5 text-green-600 mr-2" />
                  <span className="text-sm font-bold text-green-800">
                    Score submitted! Rank #{displayRank ?? '—'}
                  </span>
                </>
              )}
            </div>
          </div>
        )}

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
                    Paid Player
                  </Badge>
                </div>

                {winnings.hasWinnings && !winnings.hasClaimed ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-sm text-gray-600">Your Winnings:</span>
                      <span className="text-lg font-bold text-green-600">
                        {Number(winnings.winningAmount) / 1000000} USDC
                      </span>
                    </div>
                    {winnings.rank && (
                      <div className="text-xs text-gray-500">Prize Rank: #{winnings.rank}</div>
                    )}
                    <ClaimWinningsButton
                      winningAmount={winnings.winningAmount}
                      onClaimSuccess={handleClaimSuccess}
                      disabled={winnings.hasClaimed}
                    />
                  </div>
                ) : winnings.hasClaimed ? (
                  <div className="flex items-center gap-2 text-green-600 justify-center p-3">
                    <CheckCircle className="h-4 w-4" />
                    <span className="text-sm font-medium">
                      Winnings Claimed: {Number(winnings.winningAmount) / 1000000} USDC
                    </span>
                  </div>
                ) : (
                  <div className="text-sm text-gray-600">
                    {winnings.sessionActive
                      ? 'Session still active - winnings will be calculated after completion'
                      : 'No winnings to claim for this session'}
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

        {isOnLeaderboard && !isTrialGame && currentScore > 0 && rankReady && (
          <div className="mb-3 flex justify-center">
            <ComposeCastButton
              achievementType={showNewLeaderBanner ? 'high-score' : 'game-complete'}
              score={currentScore}
              rank={displayRank ?? undefined}
              className="w-full"
            />
          </div>
        )}

        {leadingScore > 0 && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center">
                <Crown className="h-5 w-5 text-yellow-600 mr-2" />
                <span className="text-sm font-medium text-yellow-800">Leading Score</span>
              </div>
              <span className="text-lg font-bold text-yellow-900">
                {formatScore(leadingScore)}
              </span>
            </div>
          </div>
        )}
      </div>

      <div>
        <h4 className="text-sm font-semibold text-gray-700 mb-2">
          Top {LEADERBOARD_LIMIT} (Paid)
          {isRefreshing && leaderboardEntries.length > 0 && (
            <span className="ml-2 text-xs font-normal text-gray-400">Updating…</span>
          )}
        </h4>
        <div className="space-y-2">
          {showLeaderboardSkeleton ? (
            Array.from({ length: 3 }).map((_, index) => (
              <div key={`skeleton-${index}`} className="flex items-center justify-between p-2">
                <div className="flex items-center gap-2 flex-1">
                  <Skeleton className="h-4 w-4 rounded-full" />
                  <Skeleton className="h-4 w-32" />
                </div>
                <Skeleton className="h-4 w-12" />
              </div>
            ))
          ) : leaderboardEntries.length === 0 ? (
            <p className="text-sm text-gray-500 text-center py-2">No scores yet — be the first!</p>
          ) : (
            leaderboardEntries.map((entry, index) => {
              const isCurrentPlayer =
                normalizedWallet &&
                entry.walletAddress.toLowerCase() === normalizedWallet;
              return (
                <div
                  key={`${entry.walletAddress}-${index}`}
                  className={`flex items-center justify-between p-2 rounded ${
                    isCurrentPlayer ? 'bg-blue-100 border border-blue-300' : 'bg-gray-50'
                  }`}
                >
                  <div className="flex items-center">
                    {getRankIcon(index + 1)}
                    <PlayerAvatarWithFetch
                      walletAddress={entry.walletAddress}
                      username={entry.username}
                      avatarUrl={entry.avatarUrl}
                      className="w-6 h-6 ml-1"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      <PlayerDisplayName
                        walletAddress={entry.walletAddress}
                        username={entry.username}
                      />
                      {isCurrentPlayer && (
                        <span className="text-xs text-blue-600 ml-1">(You)</span>
                      )}
                    </span>
                  </div>
                  <span className="text-sm font-bold text-gray-900">
                    {formatScore(entry.bestScore)}
                  </span>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
