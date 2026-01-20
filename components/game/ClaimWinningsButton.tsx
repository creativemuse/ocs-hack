'use client';

import { CheckCircle, Info } from 'lucide-react';

interface ClaimWinningsButtonProps {
  winningAmount: string;
  onClaimSuccess?: () => void;
  disabled?: boolean;
  sessionId?: bigint; // Optional: session ID (renamed from gameId)
}

/**
 * NOTE: TriviaBattle.sol automatically distributes prizes when distributePrizes() is called.
 * There is no claimPrize() function. Prizes are sent directly to winners' wallets.
 * This component now just displays information about prize distribution.
 */
export default function ClaimWinningsButton({
  winningAmount,
  onClaimSuccess,
  disabled = false,
  sessionId,
}: ClaimWinningsButtonProps) {
  const amount = Number(winningAmount) / 1000000; // USDC has 6 decimals

  // Show info message that prizes are auto-distributed
  return (
    <div className="flex flex-col items-center gap-2 text-center p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
      <Info className="h-5 w-5 text-blue-600 dark:text-blue-400" />
      <div className="space-y-1">
        <p className="text-sm font-medium text-blue-900 dark:text-blue-100">
          Prizes Auto-Distributed
        </p>
        <p className="text-xs text-blue-700 dark:text-blue-300">
          {amount > 0 
            ? `If you won, ${amount.toFixed(2)} USDC will be automatically sent to your wallet when prizes are distributed.`
            : 'Prizes are automatically distributed to winners when the session ends. Check your wallet for USDC transfers.'}
        </p>
        {sessionId && (
          <p className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            Session ID: {sessionId.toString()}
          </p>
        )}
      </div>
    </div>
  );
}

