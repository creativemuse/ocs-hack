'use client';

import { useQuery } from '@tanstack/react-query';
import type { ResolvedPlayerIdentity } from '@/lib/identity/playerIdentity';

export const usePlayerIdentity = (
  walletAddress?: string | null,
  cached?: { username?: string | null; avatarUrl?: string | null },
) => {
  const normalized = walletAddress?.trim().toLowerCase() ?? '';
  const cachedUsername = cached?.username?.trim();

  return useQuery<ResolvedPlayerIdentity | null>({
    queryKey: ['player-identity-full', normalized, cachedUsername, cached?.avatarUrl],
    queryFn: async () => {
      if (!normalized.startsWith('0x')) {
        return null;
      }
      const params = new URLSearchParams({ wallets: normalized });
      const response = await fetch(`/api/player-identities?${params.toString()}`);
      if (!response.ok) {
        return null;
      }
      const json = (await response.json()) as {
        identities?: Record<string, ResolvedPlayerIdentity>;
      };
      return json.identities?.[normalized] ?? null;
    },
    enabled: normalized.startsWith('0x'),
    staleTime: 5 * 60 * 1000,
    initialData: cachedUsername
      ? {
          walletAddress: normalized,
          displayName: cachedUsername,
          avatarUrl: cached?.avatarUrl ?? null,
          handle: cachedUsername.startsWith('@') ? cachedUsername.slice(1) : null,
          basename: null,
          source: 'spacetime' as const,
        }
      : undefined,
  });
};
