'use client';

import { useState } from 'react';
import { Gift, CheckCircle, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import BaseAccountTransaction from '@/components/base-account/BaseAccountTransaction';
import { TRIVIA_CONTRACT_ADDRESS, TRIVIA_ABI } from '@/lib/blockchain/contracts';
import { base } from 'viem/chains';
import { encodeFunctionData } from 'viem';

interface ClaimWinningsButtonProps {
  winningAmount: string;
  /** Reserved for future session-scoped claims; contract uses executeWithdrawal() */
  sessionId?: bigint;
  onClaimSuccess?: () => void;
  disabled?: boolean;
}

export default function ClaimWinningsButton({
  winningAmount,
  onClaimSuccess,
  disabled = false,
}: ClaimWinningsButtonProps) {
  const [hasClaimed, setHasClaimed] = useState(false);

  const handleOnStatus = (status: 'pending' | 'success' | 'error', message?: string) => {
    console.log('Claim transaction status:', status, message);
    
    if (status === 'success') {
      console.log('✅ Claim successful!');
      setHasClaimed(true);
      if (onClaimSuccess) {
        onClaimSuccess();
      }
    }
    
    if (status === 'error') {
      console.error('❌ Claim failed:', message);
    }
  };

  const calls = [
    {
      to: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
      value: '0x0' as `0x${string}`,
      data: encodeFunctionData({
        abi: TRIVIA_ABI,
        functionName: 'executeWithdrawal',
        args: [],
      }),
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
    <BaseAccountTransaction
      calls={calls}
      onStatus={handleOnStatus}
      className="w-full"
    >
      <div className="flex items-center justify-center gap-2">
        <Gift className="h-4 w-4" />
        Claim Winnings (Gasless)
      </div>
    </BaseAccountTransaction>
  );
}

