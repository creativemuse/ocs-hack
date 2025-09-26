'use client';

import { useState, useCallback } from 'react';

interface SessionTokenResponse {
  sessionToken: string;
}

interface UseSessionTokenReturn {
  getSessionToken: (walletAddress: string) => Promise<string>;
  isLoading: boolean;
  error: string | null;
}

export const useSessionToken = (): UseSessionTokenReturn => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const getSessionToken = useCallback(async (walletAddress: string): Promise<string> => {
    setIsLoading(true);
    setError(null);

    try {
      const response = await fetch('/api/session-token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ walletAddress }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate session token');
      }

      const data: SessionTokenResponse = await response.json();
      return data.sessionToken;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      throw err;
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    getSessionToken,
    isLoading,
    error,
  };
};
