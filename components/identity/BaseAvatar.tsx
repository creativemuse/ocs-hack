'use client';

import { useEnsName, useEnsAvatar } from 'wagmi';
import { normalize } from 'viem/ens';

interface BaseAvatarProps {
  address?: `0x${string}`;
  className?: string;
  defaultComponent?: React.ReactNode;
}

export function BaseAvatar({ address, className = '', defaultComponent }: BaseAvatarProps) {
  const { data: ensName } = useEnsName({
    address,
    query: { enabled: !!address },
  });

  const { data: avatarUrl } = useEnsAvatar({
    name: ensName ? normalize(ensName) : undefined,
    query: { enabled: !!ensName },
  });

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt="avatar"
        className={`rounded-full object-cover ${className}`}
      />
    );
  }

  return <>{defaultComponent ?? null}</>;
}
