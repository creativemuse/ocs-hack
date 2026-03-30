import { useState, useEffect, useCallback, useRef } from 'react';
import {
  initializeCDP,
  getRecentEvents,
  fetchPlayerJoinedEvents,
  fetchScoreSubmittedEvents,
  fetchPrizesDistributedEvents,
  fetchSessionStartedEvents,
  fetchSessionEndedEvents,
  fetchTrialPlayerJoinedEvents,
  fetchTrialScoreSubmittedEvents,
  type PlayerJoinedEvent,
  type ScoreSubmittedEvent,
  type PrizesDistributedEvent,
  type SessionStartedEvent,
  type SessionEndedEvent,
  type TrialPlayerJoinedEvent,
  type TrialScoreSubmittedEvent
} from '@/lib/apis/cdp';
import { CDP_CONFIG, validateCDPConfig } from '@/lib/config/cdp';

export interface CDPEventsData {
  playerJoined: PlayerJoinedEvent[];
  scoreSubmitted: ScoreSubmittedEvent[];
  prizesDistributed: PrizesDistributedEvent[];
  sessionStarted: SessionStartedEvent[];
  sessionEnded: SessionEndedEvent[];
  trialPlayerJoined: TrialPlayerJoinedEvent[];
  trialScoreSubmitted: TrialScoreSubmittedEvent[];
}

export interface UseCDPEventsReturn {
  events: CDPEventsData;
  loading: boolean;
  error: string | null;
  isInitialized: boolean;
  refreshEvents: () => Promise<void>;
  lastUpdateTime: Date | null;
}

export const useCDPEvents = (pollInterval: number = 30000): UseCDPEventsReturn => {
  const [events, setEvents] = useState<CDPEventsData>({
    playerJoined: [],
    scoreSubmitted: [],
    prizesDistributed: [],
    sessionStarted: [],
    sessionEnded: [],
    trialPlayerJoined: [],
    trialScoreSubmitted: []
  });
  
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date | null>(null);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);
  const isInitializingRef = useRef(false);

  const initializeCDPIfNeeded = useCallback(async () => {
    if (isInitializingRef.current || isInitialized) return;
    
    isInitializingRef.current = true;
    
    try {
      // Validate configuration first
      if (!validateCDPConfig()) {
        setError("CDP configuration is invalid. Please check your environment variables.");
        return;
      }

      const success = await initializeCDP();
      if (success) {
        setIsInitialized(true);
        setError(null);
      } else {
        setError("Failed to initialize CDP. Please check your API key configuration.");
      }
    } catch (err) {
      setError(`CDP initialization error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      isInitializingRef.current = false;
    }
  }, [isInitialized]);

  const refreshEvents = useCallback(async () => {
    if (!isInitialized) {
      await initializeCDPIfNeeded();
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const recentEvents = await getRecentEvents();
      setEvents(recentEvents);
      setLastUpdateTime(new Date());
    } catch (err) {
      setError(`Failed to fetch events: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [isInitialized, initializeCDPIfNeeded]);

  // Initialize CDP on mount
  useEffect(() => {
    initializeCDPIfNeeded();
  }, [initializeCDPIfNeeded]);

  // Set up polling
  useEffect(() => {
    if (isInitialized && pollInterval > 0) {
      // Initial fetch
      refreshEvents();
      
      // Set up interval
      intervalRef.current = setInterval(refreshEvents, pollInterval);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [isInitialized, pollInterval, refreshEvents]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    events,
    loading,
    error,
    isInitialized,
    refreshEvents,
    lastUpdateTime
  };
};

// Hook for specific event types
export const usePlayerJoinedEvents = (pollInterval: number = 30000) => {
  const [events, setEvents] = useState<PlayerJoinedEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!isInitialized) {
      const success = await initializeCDP();
      if (success) {
        setIsInitialized(true);
      } else {
        setError("Failed to initialize CDP");
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const playerEvents = await fetchPlayerJoinedEvents();
      setEvents(playerEvents);
    } catch (err) {
      setError(`Failed to fetch player joined events: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [isInitialized]);

  useEffect(() => {
    fetchEvents();
    
    if (pollInterval > 0) {
      intervalRef.current = setInterval(fetchEvents, pollInterval);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [fetchEvents, pollInterval]);

  return { events, loading, error, refresh: fetchEvents };
};

export const useScoreSubmittedEvents = (pollInterval: number = 30000) => {
  const [events, setEvents] = useState<ScoreSubmittedEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!isInitialized) {
      const success = await initializeCDP();
      if (success) {
        setIsInitialized(true);
      } else {
        setError("Failed to initialize CDP");
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const scoreEvents = await fetchScoreSubmittedEvents();
      setEvents(scoreEvents);
    } catch (err) {
      setError(`Failed to fetch score submitted events: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [isInitialized]);

  useEffect(() => {
    fetchEvents();
    
    if (pollInterval > 0) {
      intervalRef.current = setInterval(fetchEvents, pollInterval);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [fetchEvents, pollInterval]);

  return { events, loading, error, refresh: fetchEvents };
};

export const useSessionEvents = (pollInterval: number = 30000) => {
  const [sessionStarted, setSessionStarted] = useState<SessionStartedEvent[]>([]);
  const [sessionEnded, setSessionEnded] = useState<SessionEndedEvent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const fetchEvents = useCallback(async () => {
    if (!isInitialized) {
      const success = await initializeCDP();
      if (success) {
        setIsInitialized(true);
      } else {
        setError("Failed to initialize CDP");
        return;
      }
    }

    setLoading(true);
    setError(null);

    try {
      const [started, ended] = await Promise.all([
        fetchSessionStartedEvents(),
        fetchSessionEndedEvents()
      ]);
      setSessionStarted(started);
      setSessionEnded(ended);
    } catch (err) {
      setError(`Failed to fetch session events: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setLoading(false);
    }
  }, [isInitialized]);

  useEffect(() => {
    fetchEvents();
    
    if (pollInterval > 0) {
      intervalRef.current = setInterval(fetchEvents, pollInterval);
      
      return () => {
        if (intervalRef.current) {
          clearInterval(intervalRef.current);
        }
      };
    }
  }, [fetchEvents, pollInterval]);

  return { 
    sessionStarted, 
    sessionEnded, 
    loading, 
    error, 
    refresh: fetchEvents 
  };
};
