'use client';

import { useTopEarners } from '@/hooks/useTopEarners';
import Image from 'next/image';
import { ASSETS } from '@/lib/config/assets';
import { Loader2 } from 'lucide-react';
import { Name } from '@coinbase/onchainkit/identity';
import { base } from 'viem/chains';

interface TopEarnersProps {
  limit?: number;
  className?: string;
}

export default function TopEarners({ limit = 10, className = '' }: TopEarnersProps) {
  const { topEarners, isLoading, error } = useTopEarners(limit);

  const formatEarnings = (earnings: number) => {
    return earnings.toFixed(2);
  };

  // Component to display player name with fallback priority:
  // 1. Username (if set)
  // 2. Basename (if available)
  // 3. Shortened wallet address
  const PlayerDisplayName = ({ walletAddress, username }: { walletAddress: string; username?: string }) => {
    if (username) {
      return <span className="text-[#ffffff] text-[12px]">{username.toUpperCase()}</span>;
    }
    
    return (
      <Name 
        address={walletAddress as `0x${string}`}
        chain={base}
        className="text-[#ffffff] text-[12px]"
      />
    );
  };

  const getRankIcon = (rank: number) => {
    if (rank === 1) return '🏆';
    return `#${rank}`;
  };

  // Avatar mapping - rotate through available avatars
  const avatarImages = [
    ASSETS.ellipse7, ASSETS.ellipse4, ASSETS.ellipse5,
    ASSETS.ellipse6, ASSETS.ellipse8, ASSETS.ellipse9,
    ASSETS.ellipse10
  ];

  if (error) {
    return (
      <div className="text-red-400 text-sm text-center p-4">
        Failed to load top earners
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="flex justify-center items-center p-8">
        <Loader2 className="h-6 w-6 text-white animate-spin" />
      </div>
    );
  }

  return (
    <div className={`w-full ${className}`}>
      {topEarners.map((earner, index) => (
        <div 
          key={earner.walletAddress}
          className="content-stretch flex items-center justify-between relative shrink-0 w-full mb-3"
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
                </p>
              </div>
            </div>
          </div>
          <div className="font-['Audiowide:Regular',_sans-serif] leading-[0] not-italic relative shrink-0 text-[#ffffff] text-[12px] text-nowrap">
            <p className="leading-[normal] whitespace-pre">
              {formatEarnings(earner.totalEarnings)} USDC
            </p>
          </div>
        </div>
      ))}
      {topEarners.length === 0 && (
        <div className="text-gray-400 text-sm text-center p-4">
          No winners yet. Be the first!
        </div>
      )}
    </div>
  );
}

