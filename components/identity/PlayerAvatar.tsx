'use client';

import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBasename } from '@/hooks/useBasename';
import {
  getInitials,
  gradientClassForWallet,
  type PlayerIdentityCache,
} from '@/lib/identity/playerIdentity';
import { AvatarSkeleton } from '@/components/identity/IdentitySkeleton';
import { cn } from '@/lib/utils';

export type PlayerAvatarProps = {
  walletAddress?: string | null;
  /** Universal Base Account address when `walletAddress` is a sub-account */
  universalWalletAddress?: string | null;
  username?: string | null;
  avatarUrl?: string | null;
  className?: string;
  alt?: string;
};

export const PlayerAvatar = ({
  walletAddress,
  universalWalletAddress,
  username,
  avatarUrl,
  className = '',
  alt,
}: PlayerAvatarProps) => {
  const normalizedWallet = walletAddress?.trim().toLowerCase();
  const isWallet = !!normalizedWallet?.startsWith('0x');
  const [imageLoaded, setImageLoaded] = useState(false);
  const [imageError, setImageError] = useState(false);

  const { data: basename, isLoading: basenameLoading } = useBasename(
    isWallet ? (normalizedWallet as `0x${string}`) : undefined,
    universalWalletAddress ?? undefined,
  );

  const resolvedAvatar = avatarUrl ?? null;

  const displayLabel = username ?? basename ?? (normalizedWallet ? normalizedWallet.slice(0, 8) : '?');
  const initials = getInitials(displayLabel);
  const gradient = normalizedWallet
    ? gradientClassForWallet(normalizedWallet)
    : 'from-purple-400 to-pink-400';

  const isResolvingIdentity =
    isWallet && !username && !resolvedAvatar && basenameLoading;

  if (isResolvingIdentity) {
    return <AvatarSkeleton className={className} />;
  }

  if (resolvedAvatar && !imageError) {
    return (
      <div className={cn('relative shrink-0', className)}>
        {!imageLoaded && (
          <AvatarSkeleton className="absolute inset-0 h-full w-full" />
        )}
        <img
          src={resolvedAvatar}
          alt={alt ?? displayLabel}
          className={cn(
            'rounded-full object-cover h-full w-full',
            !imageLoaded && 'opacity-0',
          )}
          onLoad={() => setImageLoaded(true)}
          onError={() => setImageError(true)}
        />
      </div>
    );
  }

  return (
    <div
      className={`rounded-full flex items-center justify-center text-white font-bold bg-gradient-to-br ${gradient} ${className}`}
      aria-label={alt ?? displayLabel}
    >
      <span className="text-[0.55em] leading-none">{initials}</span>
    </div>
  );
};

export type PlayerAvatarWithFetchProps = PlayerAvatarProps & {
  fetchIfMissing?: boolean;
};

export const PlayerAvatarWithFetch = ({
  walletAddress,
  fetchIfMissing = true,
  ...rest
}: PlayerAvatarWithFetchProps) => {
  const normalizedWallet = walletAddress?.trim().toLowerCase();
  const hasKnownIdentity = !!(rest.username || rest.avatarUrl);
  const shouldFetch =
    fetchIfMissing &&
    !!normalizedWallet?.startsWith('0x') &&
    !hasKnownIdentity;

  const { data, isPending, isFetching } = useQuery({
    queryKey: ['player-identity', normalizedWallet],
    queryFn: async () => {
      const response = await fetch(
        `/api/player-identities?wallets=${encodeURIComponent(normalizedWallet!)}`,
      );
      if (!response.ok) {
        return null;
      }
      const json = (await response.json()) as {
        identities?: Record<string, PlayerIdentityCache & { displayName?: string }>;
      };
      return json.identities?.[normalizedWallet!] ?? null;
    },
    enabled: shouldFetch,
    staleTime: 5 * 60 * 1000,
  });

  const isResolving = shouldFetch && (isPending || isFetching) && !data;

  if (isResolving) {
    return <AvatarSkeleton className={rest.className} />;
  }

  return (
    <PlayerAvatar
      walletAddress={normalizedWallet}
      universalWalletAddress={rest.universalWalletAddress}
      username={rest.username ?? data?.username ?? data?.displayName}
      avatarUrl={rest.avatarUrl ?? data?.avatarUrl ?? undefined}
      className={rest.className}
      alt={rest.alt}
    />
  );
};
