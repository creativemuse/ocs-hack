'use client';

import { PlayerAvatarWithFetch } from '@/components/identity/PlayerAvatar';

interface BaseAvatarProps {
  address?: `0x${string}`;
  className?: string;
  defaultComponent?: React.ReactNode;
  avatarUrl?: string | null;
  username?: string | null;
}

export function BaseAvatar({
  address,
  className = '',
  defaultComponent,
  avatarUrl,
  username,
}: BaseAvatarProps) {
  if (!address) {
    return <>{defaultComponent ?? null}</>;
  }

  return (
    <PlayerAvatarWithFetch
      walletAddress={address}
      username={username}
      avatarUrl={avatarUrl}
      className={className}
      fetchIfMissing={!avatarUrl}
    />
  );
}
