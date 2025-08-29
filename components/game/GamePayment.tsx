'use client';

import { useState, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Transaction } from '@coinbase/onchainkit/transaction';
import { Wallet, ConnectWallet } from '@coinbase/onchainkit/wallet';
import { useAccount } from 'wagmi';
import { Coins, Gamepad2, AlertCircle } from 'lucide-react';
import { ENTRY_FEE_USDC, TRIAL_ENTRY_FEE_USDC } from '@/lib/blockchain/contracts';
import type { LifecycleStatus } from '@coinbase/onchainkit/transaction';

interface GamePaymentProps {
  onPaymentSuccess?: () => void;
  onPaymentError?: (error: string) => void;
  className?: string;
}

const BASE_SEPOLIA_CHAIN_ID = 84532;

// Contract calls for game entry
const createGameEntryCalls = (isTrialPlayer: boolean) => {
  const entryFee = isTrialPlayer ? TRIAL_ENTRY_FEE_USDC : ENTRY_FEE_USDC;
  
  return [
    {
      to: '0x0000000000000000000000000000000000000001' as `0x${string}`, // TRIVIA_CONTRACT_ADDRESS
      abi: [
        {
          type: 'function',
          name: isTrialPlayer ? 'joinTrialBattle' : 'joinBattle',
          inputs: [],
          outputs: [],
          stateMutability: 'nonpayable',
        },
      ] as const,
      functionName: isTrialPlayer ? 'joinTrialBattle' : 'joinBattle',
      args: [],
    },
  ];
};

export default function GamePayment({ onPaymentSuccess, onPaymentError, className = '' }: GamePaymentProps) {
  const { address } = useAccount();
  const [isProcessing, setIsProcessing] = useState(false);

  const handleStatus = useCallback((status: LifecycleStatus) => {
    console.log('Transaction status:', status);
    
    if (status.statusName === 'success') {
      setIsProcessing(false);
      onPaymentSuccess?.();
    } else if (status.statusName === 'error') {
      setIsProcessing(false);
      onPaymentError?.(status.statusData.message || 'Transaction failed');
    } else if (status.statusName === 'transactionPending') {
      setIsProcessing(true);
    }
  }, [onPaymentSuccess, onPaymentError]);

  const handleTrialGame = () => {
    // For trial games, we don't need a transaction
    onPaymentSuccess?.();
  };

  if (!address) {
    return (
      <Card className={`bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30 ${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-white">
            <Wallet className="h-5 w-5 text-blue-400" />
            Connect Wallet to Play
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-300 text-center">
            Connect your wallet to play for prizes and earn USDC rewards!
          </div>
          <ConnectWallet>
            <Button className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white">
              Connect Wallet
            </Button>
          </ConnectWallet>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-white">
          <Coins className="h-5 w-5 text-yellow-400" />
          Player Game Entry
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Entry Fee:</span>
            <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
              1 USDC
            </Badge>
          </div>
          
          {/* <div className="flex items-center justify-between">
            <span className="text-sm text-gray-300">Prize Pool:</span>
            <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
              Up to 100 USDC
            </Badge>
          </div> */}
        </div>

        <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
          <div className="flex items-start gap-2">
            <AlertCircle className="h-4 w-4 text-blue-400 mt-0.5 flex-shrink-0" />
            <div className="text-xs text-blue-300">
              <p className="font-medium mb-1">How it works:</p>
              <ul className="space-y-1 text-blue-200/80">
                <li>• Pay 1 USDC entry fee</li>
                <li>• Compete against other players</li>
                <li>• Win prizes based on your score</li>
                <li>• Prizes paid in USDC to your wallet</li>
              </ul>
            </div>
          </div>
        </div>

        <Transaction
          chainId={BASE_SEPOLIA_CHAIN_ID}
          calls={createGameEntryCalls(false)} // false = not trial player
          onStatus={handleStatus}
          isSponsored={true}
        >
          <Button 
            className="w-full bg-gradient-to-r from-yellow-500 to-orange-500 hover:from-yellow-400 hover:to-orange-400 text-white"
            disabled={isProcessing}
          >
            {isProcessing ? (
              <div className="flex items-center gap-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Processing...
              </div>
            ) : (
              <div className="flex items-center gap-2">
                <Gamepad2 className="h-4 w-4" />
                Pay 1 USDC & Play
              </div>
            )}
          </Button>
        </Transaction>
      </CardContent>
    </Card>
  );
}
