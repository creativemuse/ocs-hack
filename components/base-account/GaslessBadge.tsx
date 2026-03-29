'use client';

import { Badge } from '@/components/ui/badge';
import { Zap, CheckCircle } from 'lucide-react';

interface GaslessBadgeProps {
  isGasless?: boolean;
  className?: string;
}

export default function GaslessBadge({ 
  isGasless = true, 
  className = '' 
}: GaslessBadgeProps) {
  if (!isGasless) {
    return null;
  }

  return (
    <Badge 
      variant="secondary"
      className={`bg-blue-500/20 text-blue-400 border-blue-500/30 ${className}`}
    >
      <Zap className="h-3 w-3 mr-1" />
      Gasless
    </Badge>
  );
}
