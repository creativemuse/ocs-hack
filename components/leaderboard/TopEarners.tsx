'use client';

import { useWeeklyLeaderboard } from '@/hooks/useWeeklyLeaderboard';
import Image from 'next/image';
import { ASSETS } from '@/lib/config/assets';
import { Skeleton } from '@/components/ui/skeleton';
import { BaseName } from '@/components/identity/BaseName';

interface TopEarnersProps {
  limit?: number;
  className?: string;
  currentWalletAddress?: string;
}

export default function TopEarners({
  limit = 10,
  className = '',
  currentWalletAddress,
}: TopEarnersProps) {
  const { entries, sessionCounter, isLoading, isRefreshing, error } = useWeeklyLeaderboard(limit);

  const formatScore = (score: number) => score.toLocaleString();

  const PlayerDisplayName = ({ walletAddress, username }: { walletAddress: string; username?: string }) => {
    if (username && !username.includes('...')) {
      return <span className="text-[#ffffff] text-[12px]">{username}</span>;
    }

    return (
      <BaseName
        address={walletAddress as `0x${string}`}
        className="text-[#ffffff] text-[12px]"
      />
    );
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🏆';
    return `#${rank}`;
  };

  const avatarImages = [
    ASSETS.ellipse7, ASSETS.ellipse4, ASSETS.ellipse5,
    ASSETS.ellipse6, ASSETS.ellipse8, ASSETS.ellipse9,
    ASSETS.ellipse10,
  ];

  if (error) {
    return (
      <div className="text-gray-400 text-sm text-center p-4">
        Failed to load leaderboard
      </div>
    );
  }

  if (isLoading && entries.length === 0) {
    return (
      <div className={`w-full space-y-3 p-2 ${className}`}>
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={`top-earner-skeleton-${index}`} className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Skeleton className="h-4 w-5 bg-white/20" />
              <Skeleton className="h-9 w-9 rounded-full bg-white/20" />
              <Skeleton className="h-4 w-28 bg-white/20" />
            </div>
            <Skeleton className="h-4 w-16 bg-white/20" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {sessionCounter > 0 && (
        <p className="text-gray-500 text-[10px] font-['Audiowide:Regular',_sans-serif] mb-2 text-center">
          Week {sessionCounter} — resets after payout
          {isRefreshing && entries.length > 0 && (
            <span className="ml-1 text-purple-300">· updating</span>
          )}
        </p>
      )}
      {entries.map((earner, index) => {
        const isCurrentPlayer =
          currentWalletAddress &&
          earner.walletAddress.toLowerCase() === currentWalletAddress.toLowerCase();
        return (
          <div
            key={earner.walletAddress}
            className={`content-stretch flex items-center justify-between relative shrink-0 w-full mb-3 ${
              isCurrentPlayer ? 'rounded-lg bg-white/10 px-2 py-1 -mx-2' : ''
            }`}
          >
            <div className="content-stretch flex gap-4 items-center justify-start relative shrink-0">
              <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] w-5">
                <p className="leading-[normal]">{getRankIcon(index + 1)}</p>
              </div>
              <div className="content-stretch flex gap-3 items-center justify-start relative shrink-0">
                <div className="relative shrink-0 size-9">
                  <Image
                    alt="player avatar"
                    className="block max-w-none size-full"
                    height="36"
                    src={earner.avatarUrl || avatarImages[index % avatarImages.length]}
                    width="36"
                  />
                </div>
                <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] text-nowrap">
                  <p className="leading-[normal] whitespace-pre">
                    <PlayerDisplayName
                      walletAddress={earner.walletAddress}
                      username={earner.username}
                    />
                    {isCurrentPlayer && (
                      <span className="text-[10px] text-purple-300 ml-1">(You)</span>
                    )}
                  </p>
                </div>
              </div>
            </div>
            <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] text-nowrap">
              <p className="leading-[normal] whitespace-pre">
                {`${formatScore(earner.bestScore)} pts`}
              </p>
            </div>
          </div>
        );
      })}
      {entries.length === 0 && (
        <div className="text-gray-400 text-sm text-center p-4">
          No scores yet this week. Be the first!
        </div>
      )}
    </div>
  );
}
