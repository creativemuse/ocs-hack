'use client';

import { useCallback, useState } from 'react';
import type { PaymentOptions } from '@base-org/account';
import { executeBasePay } from '@/lib/base-account/pay';

export const useBasePay = () => {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleBasePay = useCallback(
    async (
      paymentOptions: PaymentOptions,
      onComplete?: (success: boolean) => void
    ) => {
      setIsProcessing(true);
      setError(null);

      const result = await executeBasePay(paymentOptions);

      if (!result.success) {
        setError(result.error);
        onComplete?.(false);
      } else {
        onComplete?.(true);
      }

      setIsProcessing(false);
      return result;
    },
    []
  );

  return {
    handleBasePay,
    isProcessing,
    error,
  };
};
