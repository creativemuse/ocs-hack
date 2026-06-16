'use client';

import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/lib/utils';

export const AvatarSkeleton = ({ className = '' }: { className?: string }) => (
  <Skeleton
    className={cn('rounded-full shrink-0', className)}
    aria-hidden
  />
);

export const DisplayNameSkeleton = ({ className = '' }: { className?: string }) => (
  <Skeleton
    className={cn('inline-block h-3.5 w-24 rounded-md', className)}
    aria-hidden
  />
);

export const StatValueSkeleton = ({ className = '' }: { className?: string }) => (
  <Skeleton
    className={cn('h-8 w-20 mx-auto rounded-md', className)}
    aria-hidden
  />
);
