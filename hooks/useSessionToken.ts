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
      // Generate a truly unique request ID with timestamp and random component
      const timestamp = Date.now();
      const randomId = Math.random().toString(36).substr(2, 9);
      const walletSuffix = walletAddress.slice(-6);
      const uniqueRequestId = `payment_${timestamp}_${randomId}_${walletSuffix}`;
      
      // Add cache-busting to ensure fresh token generation
      const cacheBuster = Date.now();
      const response = await fetch(`/api/session-token?t=${cacheBuster}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Cache-Control': 'no-cache',
          'Pragma': 'no-cache',
        },
        body: JSON.stringify({ 
          walletAddress,
          requestId: uniqueRequestId,
          component: 'GamePayment'
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate session token');
      }

      const data: SessionTokenResponse = await response.json();
      
      // Validate that we received a non-empty session token
      if (!data.sessionToken || data.sessionToken.trim() === '') {
        throw new Error('Received empty session token from server');
      }
      
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
