'use client';

import { useState } from 'react';
import { Gift, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Transaction,
  TransactionButton,
  TransactionSponsor,
  TransactionStatus,
  TransactionStatusLabel,
  TransactionStatusAction,
} from '@coinbase/onchainkit/transaction';
import { TRIVIA_CONTRACT_ADDRESS, TRIVIA_ABI } from '@/lib/blockchain/contracts';
import { base } from 'wagmi/chains';
import type { LifecycleStatus } from '@coinbase/onchainkit/transaction';

interface ClaimWinningsButtonProps {
  winningAmount: string;
  onClaimSuccess?: () => void;
  disabled?: boolean;
}

export default function ClaimWinningsButton({
  winningAmount,
  onClaimSuccess,
  disabled = false,
}: ClaimWinningsButtonProps) {
  const [hasClaimed, setHasClaimed] = useState(false);

  const handleOnStatus = (status: LifecycleStatus) => {
    console.log('Claim transaction status:', status);
    
    if (status.statusName === 'success') {
      console.log('✅ Claim successful!');
      setHasClaimed(true);
      if (onClaimSuccess) {
        onClaimSuccess();
      }
    }
    
    if (status.statusName === 'error') {
      console.error('❌ Claim failed:', status.statusData);
    }
  };

  const contracts = [
    {
      address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
      abi: TRIVIA_ABI,
      functionName: 'claimWinnings',
      args: [],
    },
  ];

  if (hasClaimed) {
    return (
      <div className="flex items-center gap-2 text-green-600 justify-center p-3">
        <CheckCircle className="h-4 w-4" />
        <span className="text-sm font-medium">
          Winnings Claimed: {Number(winningAmount) / 1000000} USDC
        </span>
      </div>
    );
  }

  return (
    <Transaction
      chainId={base.id}
      calls={contracts}
      onStatus={handleOnStatus}
    >
      {/* @ts-ignore - OnchainKit TransactionButton type issue */}
      <TransactionButton
        text="Claim Winnings (Gasless)"
        disabled={disabled}
        className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white font-semibold"
      />
      <TransactionSponsor />
      <TransactionStatus>
        <TransactionStatusLabel />
        <TransactionStatusAction />
      </TransactionStatus>
    </Transaction>
  );
}

