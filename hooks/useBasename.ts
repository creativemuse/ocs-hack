'use client';

import { useQuery } from '@tanstack/react-query';
import { getBasename } from '@/lib/base-account/basename';

export const useBasename = (address?: `0x${string}` | string | null) => {
  const normalizedAddress = address as `0x${string}` | undefined;

  return useQuery({
    queryKey: ['basename', normalizedAddress],
    queryFn: () => {
      if (!normalizedAddress) {
        return null;
      }
      return getBasename(normalizedAddress);
    },
    enabled: !!normalizedAddress,
    staleTime: 5 * 60 * 1000,
  });
};
