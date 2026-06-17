'use client';

import { useQuery } from '@tanstack/react-query';

const fetchBasename = async (
  address: `0x${string}`,
  universalFallback?: `0x${string}`,
): Promise<string | null> => {
  const params = new URLSearchParams({ address });
  if (universalFallback) {
    params.set('universal', universalFallback);
  }

  const response = await fetch(`/api/basename?${params.toString()}`);
  if (!response.ok) {
    return null;
  }

  const data = (await response.json()) as { basename?: string | null };
  return data.basename ?? null;
};

export const useBasename = (
  address?: `0x${string}` | string | null,
  universalFallback?: `0x${string}` | string | null,
) => {
  const normalizedAddress = address as `0x${string}` | undefined;
  const normalizedFallback = universalFallback as `0x${string}` | undefined;

  return useQuery({
    queryKey: ['basename', normalizedAddress, normalizedFallback],
    queryFn: () => {
      if (!normalizedAddress) {
        return null;
      }
      return fetchBasename(normalizedAddress, normalizedFallback);
    },
    enabled: !!normalizedAddress,
    staleTime: 5 * 60 * 1000,
  });
};
