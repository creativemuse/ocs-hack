'use client';

import { Clock } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { useSessionCountdown } from '@/hooks/useSessionCountdown';
import { useContractUSDCBalance } from '@/hooks/useContractUSDCBalance';

export default function SessionCountdown() {
  const { isSessionActive, lastSessionTime, sessionInterval } = useContractUSDCBalance();

  // Convert to bigint for useSessionCountdown (expects bigint | undefined)
  const lastSessionTimeBigInt = lastSessionTime > 0 ? BigInt(lastSessionTime) : undefined;
  const sessionIntervalBigInt = sessionInterval > 0 ? BigInt(sessionInterval) : undefined;

  const countdown = useSessionCountdown(lastSessionTimeBigInt, sessionIntervalBigInt);

  if (isSessionActive || !countdown || countdown.isExpired) {
    return null;
  }

  const formatTime = (value: number): string => {
    return value.toString().padStart(2, '0');
  };

  return (
    <Card className="bg-gradient-to-br from-yellow-900/20 to-orange-900/20 border-yellow-500/30">
      <CardContent className="p-4">
        <div className="flex items-center gap-3">
          <Clock className="h-5 w-5 text-yellow-400" />
          <div className="flex-1">
            <div className="text-sm text-gray-300 mb-1">Next session starts in:</div>
            <div className="flex items-center gap-2 text-lg font-bold text-yellow-400">
              {countdown.days > 0 && (
                <>
                  <span className="bg-yellow-500/20 px-2 py-1 rounded">
                    {countdown.days}d
                  </span>
                  <span className="text-gray-400">:</span>
                </>
              )}
              <span className="bg-yellow-500/20 px-2 py-1 rounded">
                {formatTime(countdown.hours)}
              </span>
              <span className="text-gray-400">:</span>
              <span className="bg-yellow-500/20 px-2 py-1 rounded">
                {formatTime(countdown.minutes)}
              </span>
              <span className="text-gray-400">:</span>
              <span className="bg-yellow-500/20 px-2 py-1 rounded">
                {formatTime(countdown.seconds)}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
