'use client';

import { Badge } from '@/components/ui/badge';
import { Zap } from 'lucide-react';

interface GaslessBadgeProps {
  /** When false, badge is hidden (e.g. paymaster not configured). */
  isGasless?: boolean;
  className?: string;
}

export default function GaslessBadge({
  isGasless = true,
  className = '',
}: GaslessBadgeProps) {
  if (!isGasless) {
    return null;
  }

  return (
    <Badge
      variant="secondary"
      className={`bg-blue-500/20 text-blue-400 border-blue-500/30 ${className}`}
      title="Eligible Coinbase One members may get sponsored gas. Others pay a small ETH fee."
    >
      <Zap className="h-3 w-3 mr-1" />
      Gasless*
    </Badge>
  );
}
