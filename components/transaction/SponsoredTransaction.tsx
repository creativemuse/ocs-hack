'use client';

import { ReactNode } from 'react';
import BaseAccountTransaction from '@/components/base-account/BaseAccountTransaction';

interface SponsoredTransactionProps {
  children: ReactNode;
  calls: any[];
  onSuccess?: (response: any) => void;
  onError?: (error: any) => void;
  className?: string;
}

export default function SponsoredTransaction({ 
  children, 
  calls, 
  onSuccess, 
  onError, 
  className = ''
}: SponsoredTransactionProps) {
  const handleStatus = (status: 'pending' | 'success' | 'error', message?: string) => {
    if (status === 'success') {
      onSuccess?.({ status: 'success', message });
    } else if (status === 'error') {
      onError?.(new Error(message || 'Transaction failed'));
    }
  };

  return (
    <BaseAccountTransaction
      calls={calls}
      onStatus={handleStatus}
      className={className}
    >
      {children}
    </BaseAccountTransaction>
  );
}
