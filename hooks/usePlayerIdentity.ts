'use client';

import { useQuery } from '@tanstack/react-query';
import type { ResolvedPlayerIdentity } from '@/lib/identity/playerIdentity';

export const usePlayerIdentity = (
  walletAddress?: string | null,
  cached?: { username?: string | null; avatarUrl?: string | null },
) => {
  const normalized = walletAddress?.trim().toLowerCase() ?? '';

  return useQuery<ResolvedPlayerIdentity | null>({
    queryKey: ['player-identity-full', normalized, cached?.username, cached?.avatarUrl],
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
    initialData: cached?.username
      ? {
          walletAddress: normalized,
          displayName: cached.username,
          avatarUrl: cached.avatarUrl ?? null,
          handle: cached.username.startsWith('@') ? cached.username.slice(1) : null,
          basename: null,
          source: 'spacetime' as const,
        }
      : undefined,
  });
};
