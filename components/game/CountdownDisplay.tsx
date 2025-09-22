'use client';

import { useState, useEffect } from 'react';

interface CountdownDisplayProps {
  timeRemaining: number;
  className?: string;
}

export default function CountdownDisplay({ 
  timeRemaining, 
  className = '' 
}: CountdownDisplayProps) {
  const [isFlashing, setIsFlashing] = useState(false);

  // Flash effect for 5 seconds and below
  useEffect(() => {
    if (timeRemaining <= 5 && timeRemaining > 0) {
      setIsFlashing(true);
    } else {
      setIsFlashing(false);
    }
  }, [timeRemaining]);

  // Show "TIME'S UP" when time runs out
  if (timeRemaining <= 0) {
    return (
      <div className={`flex justify-center items-center ${className}`}>
        <div className="text-4xl sm:text-5xl md:text-6xl font-bold font-mono text-red-500 animate-pulse bg-black/20 rounded-full px-6 sm:px-8 py-4 sm:py-6">
          TIME'S UP
        </div>
      </div>
    );
  }

  return (
    <div className={`flex justify-center items-center ${className}`}>
      <div 
        className={`text-6xl sm:text-7xl md:text-8xl lg:text-9xl font-bold font-mono drop-shadow-lg ${
          isFlashing 
            ? 'text-red-500 animate-pulse' 
            : 'text-red-400'
        } transition-all duration-300 ${
          isFlashing ? 'bg-black/20 rounded-full px-4 sm:px-8 py-2 sm:py-4' : ''
        }`}
        style={{
          textShadow: isFlashing 
            ? '0 0 20px rgba(239, 68, 68, 0.8), 0 0 40px rgba(239, 68, 68, 0.4)' 
            : '0 0 10px rgba(239, 68, 68, 0.5)'
        }}
      >
        {Math.max(0, Math.floor(timeRemaining))}
      </div>
    </div>
  );
}
