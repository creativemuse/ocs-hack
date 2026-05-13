'use client';

import { useEnsName } from 'wagmi';

interface BaseNameProps {
  address: `0x${string}`;
  className?: string;
}

export function BaseName({ address, className = '' }: BaseNameProps) {
  const { data: name } = useEnsName({ address });

  return (
    <span className={className}>
      {name ?? `${address.slice(0, 6)}...${address.slice(-4)}`}
    </span>
  );
}
