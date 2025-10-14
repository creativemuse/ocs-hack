'use client';

import { ReactNode } from 'react';
import { Transaction, TransactionButton, TransactionSponsor, TransactionStatus, TransactionStatusLabel, TransactionStatusAction } from '@coinbase/onchainkit/transaction';
import type { LifecycleStatus, TransactionResponseType } from '@coinbase/onchainkit/transaction';

interface SponsoredTransactionProps {
  children: ReactNode;
  calls: any[];
  onSuccess?: (response: TransactionResponseType) => void;
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
  return (
    <Transaction
      isSponsored
      calls={calls}
      onSuccess={onSuccess}
      onError={onError}
      className={className}
    >
      {/* TransactionSponsor enables gas sponsorship via CDP Paymaster */}
      <TransactionSponsor />
      {children}
      <TransactionStatus>
        <TransactionStatusLabel />
        <TransactionStatusAction />
      </TransactionStatus>
    </Transaction>
  );
}
