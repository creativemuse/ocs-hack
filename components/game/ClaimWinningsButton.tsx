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
import { useReadContract } from 'wagmi';
import type { LifecycleStatus } from '@coinbase/onchainkit/transaction';

interface ClaimWinningsButtonProps {
  winningAmount: string;
  onClaimSuccess?: () => void;
  disabled?: boolean;
  gameId?: bigint; // Optional: if provided, use this gameId instead of currentGameId
}

export default function ClaimWinningsButton({
  winningAmount,
  onClaimSuccess,
  disabled = false,
  gameId: providedGameId,
}: ClaimWinningsButtonProps) {
  const [hasClaimed, setHasClaimed] = useState(false);

  // Fetch current game ID from the contract (only if not provided)
  const { data: currentGameId } = useReadContract({
    address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
    abi: TRIVIA_ABI,
    functionName: 'currentGameId',
    query: {
      enabled: !providedGameId, // Only fetch if gameId not provided
    },
  });

  // Use provided gameId or fall back to currentGameId
  const gameIdToUse = providedGameId || currentGameId;

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

  // Prepare contract call - claimPrize requires gameId parameter
  const contracts = gameIdToUse !== undefined
    ? [
        {
          address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
          abi: TRIVIA_ABI,
          functionName: 'claimPrize' as const,
          args: [gameIdToUse] as const,
        },
      ]
    : [];

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

  // Don't render if gameId is not available yet
  if (gameIdToUse === undefined) {
    return (
      <div className="flex items-center gap-2 text-gray-500 justify-center p-3">
        <Loader2 className="h-4 w-4 animate-spin" />
        <span className="text-sm font-medium">Loading game info...</span>
      </div>
    );
  }

  return (
    <Transaction
      chainId={base.id}
      calls={contracts}
      onStatus={handleOnStatus}
      isSponsored
    >
      {/* @ts-ignore - OnchainKit TransactionButton type issue */}
      <TransactionButton
        text={disabled ? "Waiting for Game to End..." : "Claim Winnings (Gasless)"}
        disabled={disabled || contracts.length === 0}
        className={`w-full font-semibold ${
          disabled || contracts.length === 0
            ? 'bg-gray-400 text-gray-600 cursor-not-allowed' 
            : 'bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 text-white'
        }`}
      />
      <TransactionSponsor />
      <TransactionStatus>
        <TransactionStatusLabel />
        <TransactionStatusAction />
      </TransactionStatus>
    </Transaction>
  );
}

