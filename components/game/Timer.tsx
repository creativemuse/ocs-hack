'use client';

import { useState, useEffect } from 'react';
import { Progress } from '@/components/ui/progress';
import { Clock } from 'lucide-react';

interface TimerProps {
  initialTime: number;
  onTimeUp: () => void;
  isActive: boolean;
  onTick?: (timeRemaining: number) => void;
  className?: string;
}

export default function Timer({ 
  initialTime, 
  onTimeUp, 
  isActive, 
  onTick, 
  className = '' 
}: TimerProps) {
  const [timeRemaining, setTimeRemaining] = useState(initialTime);

  useEffect(() => {
    setTimeRemaining(initialTime);
  }, [initialTime]);

  // Interval: only decrement time. Do not call parent updaters here to avoid
  // "setState while rendering a different component" warnings.
  useEffect(() => {
    if (!isActive || timeRemaining <= 0) return;

    const interval = setInterval(() => {
      setTimeRemaining((prev) => Math.max(0, prev - 1));
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive]); // Removed timeRemaining from dependencies to prevent infinite loop

  // Notify tick listeners when time changes
  useEffect(() => {
    if (typeof onTick === 'function') {
      onTick(timeRemaining);
    }
  }, [timeRemaining, onTick]);

  // Fire time up callback when time reaches 0
  useEffect(() => {
    if (isActive && timeRemaining === 0) {
      onTimeUp();
    }
  }, [isActive, timeRemaining, onTimeUp]);

  const percentage = initialTime > 0 ? (timeRemaining / initialTime) * 100 : 0;
  const isUrgent = timeRemaining <= 5;
  const isCritical = timeRemaining <= 3;

  // kept for potential styling tweaks
  const _getProgressColor = (): string => {
    if (isCritical) return 'bg-red-500';
    if (isUrgent) return 'bg-orange-500';
    return 'bg-green-500';
  };

  const getTextColor = (): string => {
    if (isCritical) return 'text-red-600';
    if (isUrgent) return 'text-orange-600';
    return 'text-gray-700';
  };

  return (
    <div className={`bg-white rounded-lg p-4 shadow-lg border ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Clock className={`h-5 w-5 ${getTextColor()}`} />
          <span className="text-sm font-medium text-gray-600">Time Remaining</span>
        </div>
        <span 
          className={`text-2xl font-bold ${getTextColor()} ${
            isCritical ? 'animate-pulse' : ''
          }`}
        >
          {timeRemaining}s
        </span>
      </div>
      
      <Progress 
        value={percentage}
        className={`w-full h-3 ${
          isCritical ? 'animate-pulse' : ''
        }`}
      />
      
      {/* Visual warning indicators */}
      {isUrgent && (
        <div className="flex justify-center mt-2">
          <div className={`px-3 py-1 rounded-full text-xs font-medium ${
            isCritical 
              ? 'bg-red-100 text-red-800 animate-bounce' 
              : 'bg-orange-100 text-orange-800'
          }`}>
            {isCritical ? 'Time\'s Up!' : 'Hurry Up!'}
          </div>
        </div>
      )}

      {/* Progress indicator dots */}
      <div className="flex justify-center mt-3 space-x-1">
        {Array.from({ length: Math.min(initialTime, 10) }, (_, i) => {
          const dotIndex = i + 1;
          const isActive = timeRemaining >= (initialTime - dotIndex + 1);
          
          return (
            <div
              key={i}
              className={`w-2 h-2 rounded-full transition-all duration-300 ${
                isActive 
                  ? isCritical 
                    ? 'bg-red-500' 
                    : isUrgent 
                    ? 'bg-orange-500' 
                    : 'bg-green-500'
                  : 'bg-gray-200'
              }`}
            />
          );
        })}
      </div>
    </div>
  );
}