'use client';

import { useState, useCallback } from 'react';
import { generateOneClickBuyUrl } from '@/lib/utils/funding';
import type { OneClickBuyOptions, BuyQuoteResponse } from '@/types/onramp';

interface UseOneClickBuyReturn {
  generateBuyUrl: (walletAddress: string, options?: OneClickBuyOptions) => Promise<{ url: string; quoteId: string } | null>;
  openOnramp: (url: string) => void;
  isLoading: boolean;
  error: string | null;
  quoteData: BuyQuoteResponse | null;
  clearError: () => void;
}

export function useOneClickBuy(): UseOneClickBuyReturn {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [quoteData, setQuoteData] = useState<BuyQuoteResponse | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const generateBuyUrl = useCallback(async (
    walletAddress: string,
    options?: OneClickBuyOptions
  ): Promise<{ url: string; quoteId: string } | null> => {
    setIsLoading(true);
    setError(null);
    setQuoteData(null);

    try {
      // Add a small delay to ensure any previous requests are fully cleared
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const result = await generateOneClickBuyUrl(walletAddress, options);
      
      if (result.quote) {
        setQuoteData(result.quote as BuyQuoteResponse);
      }

      return {
        url: result.url,
        quoteId: result.quoteId,
      };
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to generate buy URL';
      setError(errorMessage);
      console.error('Error generating One-Click-Buy URL:', err);
      return null;
    } finally {
      setIsLoading(false);
    }
  }, []);

  const openOnramp = useCallback((url: string) => {
    try {
      // Clear any existing error before opening
      setError(null);
      
      // Open in new window with specific features for security
      const width = 500;
      const height = 700;
      const left = window.screen.width / 2 - width / 2;
      const top = window.screen.height / 2 - height / 2;

      const popup = window.open(
        url,
        'CoinbaseOnramp',
        `width=${width},height=${height},left=${left},top=${top},toolbar=no,menubar=no,scrollbars=yes,resizable=yes,status=no`
      );

      if (!popup) {
        setError('Failed to open onramp window. Please allow popups for this site and try again.');
        return;
      }

      // Check if popup was blocked after a short delay
      setTimeout(() => {
        if (popup.closed) {
          setError('Popup was blocked. Please allow popups for this site and try again.');
        }
      }, 1000);

    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to open onramp window';
      setError(errorMessage);
      console.error('Error opening onramp window:', err);
    }
  }, []);

  return {
    generateBuyUrl,
    openOnramp,
    isLoading,
    error,
    quoteData,
    clearError,
  };
}

