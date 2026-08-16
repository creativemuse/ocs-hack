'use client';

import { useBasename } from '@/hooks/useBasename';
import { DisplayNameSkeleton } from '@/components/identity/IdentitySkeleton';

interface BaseNameProps {
  address: `0x${string}`;
  universalAddress?: `0x${string}` | string | null;
  className?: string;
}

export const BaseName = ({
  address,
  universalAddress,
  className = '',
}: BaseNameProps) => {
  const { data: name, isLoading } = useBasename(address, universalAddress);

  if (isLoading && !name) {
    return <DisplayNameSkeleton className={className} />;
  }

  const displayName =
    name ?? `${address.slice(0, 6)}...${address.slice(-4)}`;

  return (
    <span className={className} title={address}>
      {displayName}
    </span>
  );
};
