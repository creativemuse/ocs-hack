'use client';

import { useQuery } from '@tanstack/react-query';
import type { ResolvedPlayerIdentity } from '@/lib/identity/playerIdentity';

const MAX_BATCH = 20;

export const usePlayerIdentities = (walletAddresses: string[]) => {
  const normalized = [
    ...new Set(
      walletAddresses
        .map((w) => w.trim().toLowerCase())
        .filter((w) => w.startsWith('0x')),
    ),
  ].slice(0, MAX_BATCH);

  return useQuery<Record<string, ResolvedPlayerIdentity>>({
    queryKey: ['player-identities-batch', normalized.join(',')],
    queryFn: async () => {
      if (normalized.length === 0) {
        return {};
      }
      const params = new URLSearchParams({ wallets: normalized.join(',') });
      const response = await fetch(`/api/player-identities?${params.toString()}`);
      if (!response.ok) {
        return {};
      }
      const json = (await response.json()) as {
        identities?: Record<string, ResolvedPlayerIdentity>;
      };
      return json.identities ?? {};
    },
    enabled: normalized.length > 0,
    staleTime: 5 * 60 * 1000,
  });
};
