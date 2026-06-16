'use client';

import { useQuery } from '@tanstack/react-query';
import { getBasenameWithFallback } from '@/lib/base-account/basename';

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
      return getBasenameWithFallback(normalizedAddress, normalizedFallback);
    },
    enabled: !!normalizedAddress,
    staleTime: 5 * 60 * 1000,
  });
};
