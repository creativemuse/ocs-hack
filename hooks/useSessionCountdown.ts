'use client';

import { useState, useEffect, useMemo } from 'react';

export interface CountdownTime {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  totalSeconds: number;
  isExpired: boolean;
}

export const useSessionCountdown = (
  lastSessionTime: bigint | undefined,
  sessionInterval: bigint | undefined
): CountdownTime | null => {
  const [currentTime, setCurrentTime] = useState<number>(Math.floor(Date.now() / 1000));

  useEffect(() => {
    if (!lastSessionTime || !sessionInterval) return;

    const interval = setInterval(() => {
      setCurrentTime(Math.floor(Date.now() / 1000));
    }, 1000);

    return () => clearInterval(interval);
  }, [lastSessionTime, sessionInterval]);

  return useMemo(() => {
    if (!lastSessionTime || !sessionInterval) return null;

    const lastSession = Number(lastSessionTime);
    const interval = Number(sessionInterval);
    const nextSessionTime = lastSession + interval;
    const timeRemaining = nextSessionTime - currentTime;

    if (timeRemaining <= 0) {
      return {
        days: 0,
        hours: 0,
        minutes: 0,
        seconds: 0,
        totalSeconds: 0,
        isExpired: true,
      };
    }

    const days = Math.floor(timeRemaining / 86400);
    const hours = Math.floor((timeRemaining % 86400) / 3600);
    const minutes = Math.floor((timeRemaining % 3600) / 60);
    const seconds = timeRemaining % 60;

    return {
      days,
      hours,
      minutes,
      seconds,
      totalSeconds: timeRemaining,
      isExpired: false,
    };
  }, [lastSessionTime, sessionInterval, currentTime]);
};
