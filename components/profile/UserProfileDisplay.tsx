'use client';

import { Avatar, Name } from '@coinbase/onchainkit/identity';
import { base } from 'viem/chains';
import { useMiniAppProfile } from '@/hooks/useMiniAppProfile';
import Image from 'next/image';

interface UserProfileDisplayProps {
  /**
   * Ethereum address for OnchainKit fallback (Basename resolution)
   * Required when not in Mini App context
   */
  address?: `0x${string}`;
  
  /**
   * Size of the avatar
   */
  avatarSize?: 'sm' | 'md' | 'lg';
  
  /**
   * Whether to show the avatar
   */
  showAvatar?: boolean;
  
  /**
   * Whether to show the name
   */
  showName?: boolean;
  
  /**
   * Custom className for the container
   */
  className?: string;
  
  /**
   * Custom className for the avatar
   */
  avatarClassName?: string;
  
  /**
   * Custom className for the name
   */
  nameClassName?: string;
}

const sizeMap = {
  sm: 'h-6 w-6',
  md: 'h-8 w-8',
  lg: 'h-12 w-12',
};

/**
 * Reusable component for displaying user profile information
 * Prioritizes Mini App profile data (displayName, username, pfpUrl)
 * Falls back to OnchainKit Avatar and Name components for Basename resolution
 */
export default function UserProfileDisplay({
  address,
  avatarSize = 'md',
  showAvatar = true,
  showName = true,
  className = '',
  avatarClassName = '',
  nameClassName = '',
}: UserProfileDisplayProps) {
  const { user, isLoading, isInMiniApp } = useMiniAppProfile();

  // Determine display name - prioritize Mini App profile data
  const displayName = user?.displayName || user?.username || null;
  const pfpUrl = user?.pfpUrl;
  const hasMiniAppProfile = isInMiniApp && user;

  // Size classes
  const avatarSizeClass = sizeMap[avatarSize];

  return (
    <div className={`flex items-center gap-2 ${className}`}>
      {/* Avatar */}
      {showAvatar && (
        <>
          {hasMiniAppProfile && pfpUrl ? (
            // Use Mini App profile picture
            <div className={`relative ${avatarSizeClass} rounded-full overflow-hidden ${avatarClassName}`}>
              <Image
                src={pfpUrl}
                alt={displayName || 'User avatar'}
                fill
                className="object-cover"
                unoptimized // Farcaster CDN images
              />
            </div>
          ) : address ? (
            // Fallback to OnchainKit Avatar for Basename/ENS resolution
            <Avatar
              address={address}
              chain={base}
              className={`${avatarSizeClass} ${avatarClassName}`}
              defaultComponent={
                <div className={`${avatarSizeClass} bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-xs font-bold`}>
                  {displayName ? displayName.slice(0, 2).toUpperCase() : address.slice(2, 4).toUpperCase()}
                </div>
              }
            />
          ) : (
            // Fallback avatar when no address or profile
            <div className={`${avatarSizeClass} bg-gradient-to-br from-purple-400 to-pink-400 rounded-full flex items-center justify-center text-white text-xs font-bold ${avatarClassName}`}>
              {displayName ? displayName.slice(0, 2).toUpperCase() : '??'}
            </div>
          )}
        </>
      )}

      {/* Name */}
      {showName && (
        <>
          {hasMiniAppProfile && displayName ? (
            // Use Mini App display name or username
            <span className={nameClassName}>{displayName}</span>
          ) : address ? (
            // Fallback to OnchainKit Name for Basename resolution
            <Name
              address={address}
              chain={base}
              className={nameClassName}
            />
          ) : (
            // Fallback text
            <span className={nameClassName}>Anonymous</span>
          )}
        </>
      )}
    </div>
  );
}
