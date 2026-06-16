'use client';

import { useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useBasename } from '@/hooks/useBasename';
import { resolveLensMediaUrl } from '@/lib/identity/resolveLensMedia';
import {
  getInitials,
  gradientClassForWallet,
  type PlayerIdentityCache,
} from '@/lib/identity/playerIdentity';

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

  const { data: basename } = useBasename(
    isWallet ? (normalizedWallet as `0x${string}`) : undefined,
    universalWalletAddress ?? undefined,
  );

  const resolvedAvatar = useMemo(() => {
    if (avatarUrl) {
      return resolveLensMediaUrl(avatarUrl) ?? avatarUrl;
    }
    return null;
  }, [avatarUrl]);

  const displayLabel = username ?? basename ?? (normalizedWallet ? normalizedWallet.slice(0, 8) : '?');
  const initials = getInitials(displayLabel);
  const gradient = normalizedWallet
    ? gradientClassForWallet(normalizedWallet)
    : 'from-purple-400 to-pink-400';

  if (resolvedAvatar) {
    return (
      <img
        src={resolvedAvatar}
        alt={alt ?? displayLabel}
        className={`rounded-full object-cover ${className}`}
      />
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
  const shouldFetch =
    fetchIfMissing &&
    !!normalizedWallet?.startsWith('0x') &&
    !rest.avatarUrl;

  const { data } = useQuery({
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

  return (
    <PlayerAvatar
      walletAddress={normalizedWallet}
      username={rest.username ?? data?.username ?? data?.displayName}
      avatarUrl={rest.avatarUrl ?? data?.avatarUrl ?? undefined}
      className={rest.className}
      alt={rest.alt}
    />
  );
};
