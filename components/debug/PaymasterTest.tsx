'use client';

import { useState, useEffect } from 'react';
import { useBaseAccount } from '@/hooks/useBaseAccount';
import { useTriviaContract } from '@/hooks/useTriviaContract';
import { useSponsoredTriviaContract } from '@/hooks/useSponsoredTriviaContract';
import { usePlayerWinnings } from '@/hooks/usePlayerWinnings';
import SponsoredTransaction from '@/components/transaction/SponsoredTransaction';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2, Zap, Trophy, Gift } from 'lucide-react';

export default function PaymasterTest() {
  const { address, isConnected } = useBaseAccount();
  const [useGasless, setUseGasless] = useState(true);
  const [approvalCalls, setApprovalCalls] = useState<any[]>([]);
  const [joinBattleCalls, setJoinBattleCalls] = useState<any[]>([]);
  
  // Regular transactions
  const { 
    approveUSDC, 
    joinBattle, 
    claimWinnings,
    isApproving, 
    isJoining, 
    isClaiming,
    isSuccess, 
    error, 
    resetState,
    transactionHash,
    isPending
  } = useTriviaContract(false); // Always use regular transactions for the old hook

  // Sponsored transactions
  const {
    createApproveUSDCCall,
    createJoinBattleCall,
    createJoinTrialBattleCall,
    createSubmitScoreCall,
    createSubmitTrialScoreCall,
    handleTransactionSuccess,
    handleTransactionError,
    resetState: resetSponsoredState,
    isSuccess: sponsoredSuccess,
    error: sponsoredError,
    transactionHash: sponsoredHash
  } = useSponsoredTriviaContract();

  const { winnings, isLoading: winningsLoading } = usePlayerWinnings();
  
  // Wrapper to handle the new callback signature
  const handleSuccessWrapper = (response: any) => {
    if (typeof response === 'string') {
      handleTransactionSuccess(response);
    } else if (response?.transactionHash) {
      handleTransactionSuccess(response.transactionHash);
    }
  };

  // Generate calls when wallet is connected
  useEffect(() => {
    if (address && isConnected) {
      const approvalCall = createApproveUSDCCall();
      const joinBattleCall = createJoinBattleCall();
      
      setApprovalCalls(approvalCall ? [approvalCall] : []);
      setJoinBattleCalls(joinBattleCall ? [joinBattleCall] : []);
    } else {
      setApprovalCalls([]);
      setJoinBattleCalls([]);
    }
  }, [address, isConnected, createApproveUSDCCall, createJoinBattleCall]);

  const handleTestApproval = async () => {
    if (!address || !isConnected) {
      alert('Please connect your wallet first');
      return;
    }
    
    resetState();
    await approveUSDC();
  };


  const handleTestJoinBattle = async () => {
    if (!address || !isConnected) {
      alert('Please connect your wallet first');
      return;
    }
    
    resetState();
    await joinBattle();
  };

  const handleTestClaimWinnings = async () => {
    if (!address || !isConnected) {
      alert('Please connect your wallet first');
      return;
    }

    if (!winnings.hasWinnings || !winnings.isPaidPlayer) {
      alert('No winnings to claim or not a paid player');
      return;
    }
    
    resetState();
    await claimWinnings(winnings.winningAmount);
  };

  return (
    <Card className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Zap className="h-5 w-5" />
          Paymaster Test
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Connection Status */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-300">Wallet Status:</span>
          <Badge variant={isConnected ? "default" : "destructive"}>
            {isConnected ? (
              <>
                <CheckCircle className="h-3 w-3 mr-1" />
                Connected
              </>
            ) : (
              <>
                <XCircle className="h-3 w-3 mr-1" />
                Disconnected
              </>
            )}
          </Badge>
        </div>

        {/* Address Display */}
        {address && (
          <div className="text-xs text-gray-400 break-all">
            Address: {address}
          </div>
        )}

        {/* Transaction Mode Toggle */}
        <div className="flex items-center justify-between">
          <span className="text-sm text-gray-300">Transaction Mode:</span>
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={useGasless ? "default" : "outline"}
              onClick={() => setUseGasless(true)}
            >
              Gasless
            </Button>
            <Button
              size="sm"
              variant={!useGasless ? "default" : "outline"}
              onClick={() => setUseGasless(false)}
            >
              Regular
            </Button>
          </div>
        </div>

        {/* Winnings Status */}
        {!winningsLoading && (
          <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-300">Winnings Status:</span>
              <Badge variant={winnings.isPaidPlayer ? "default" : "secondary"}>
                {winnings.isPaidPlayer ? (
                  <>
                    <Trophy className="h-3 w-3 mr-1" />
                    Paid Player
                  </>
                ) : (
                  'Not Paid Player'
                )}
              </Badge>
            </div>
            {winnings.hasWinnings && (
              <div className="text-xs text-green-400">
                Winnings: {Number(winnings.winningAmount) / 1000000} USDC
              </div>
            )}
          </div>
        )}

        {/* Test Buttons */}
        <div className="space-y-2">
          {/* Regular Transaction Buttons */}
          <div className="space-y-2">
            <div className="text-sm text-gray-300 font-medium">Regular Transactions (User pays gas):</div>
            <Button
              onClick={handleTestApproval}
              disabled={!isConnected || isApproving || isJoining || isClaiming || isPending}
              className="w-full"
            >
              {isApproving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Approving USDC...
                </>
              ) : (
                'Test USDC Approval (Regular)'
              )}
            </Button>

            <Button
              onClick={handleTestJoinBattle}
              disabled={!isConnected || isApproving || isJoining || isClaiming || isPending}
              className="w-full"
              variant="secondary"
            >
              {isJoining ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Joining Battle...
                </>
              ) : (
                'Test Join Battle (Regular)'
              )}
            </Button>
          </div>

          {/* Sponsored Transaction Buttons */}
          <div className="space-y-2">
            <div className="text-sm text-gray-300 font-medium">Sponsored Transactions (Gasless):</div>
            
            <SponsoredTransaction
              calls={approvalCalls}
              onSuccess={handleSuccessWrapper}
              onError={handleTransactionError}
            >
              <Button
                className="w-full"
              >
                Test USDC Approval (Sponsored)
              </Button>
            </SponsoredTransaction>

            <SponsoredTransaction
              calls={joinBattleCalls}
              onSuccess={handleSuccessWrapper}
              onError={handleTransactionError}
            >
              <Button
                className="w-full"
                variant="secondary"
              >
                Test Join Battle (Sponsored)
              </Button>
            </SponsoredTransaction>
          </div>

          {/* Claim Winnings Button */}
          <Button
            onClick={handleTestClaimWinnings}
            disabled={!isConnected || isApproving || isJoining || isClaiming || isPending || !winnings.hasWinnings || !winnings.isPaidPlayer}
            className="w-full"
            variant="outline"
          >
            {isClaiming ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Claiming Winnings...
              </>
            ) : (
              <>
                <Gift className="h-4 w-4 mr-2" />
                Test Claim Winnings
              </>
            )}
          </Button>
        </div>

        {/* Regular Transaction Status */}
        {transactionHash && (
          <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
            <div className="text-green-400 text-sm font-medium mb-1">
              Regular Transaction Sent
            </div>
            <div className="text-xs text-green-300 break-all">
              Hash: {transactionHash}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Mode: Regular (User pays gas)
            </div>
          </div>
        )}

        {/* Sponsored Transaction Status */}
        {sponsoredHash && (
          <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <div className="text-blue-400 text-sm font-medium mb-1">
              Sponsored Transaction Sent
            </div>
            <div className="text-xs text-blue-300 break-all">
              Hash: {sponsoredHash}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Mode: Sponsored (Gasless)
            </div>
          </div>
        )}

        {/* Success Status */}
        {(isSuccess || sponsoredSuccess) && (
          <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-blue-400 text-sm">
              <CheckCircle className="h-4 w-4" />
              Transaction Successful!
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Check your wallet for the transaction receipt
            </div>
          </div>
        )}

        {/* Error Status */}
        {(error || sponsoredError) && (
          <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <XCircle className="h-4 w-4" />
              Transaction Failed
            </div>
            <div className="text-xs text-red-300 mt-1">
              {error || sponsoredError}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-gray-400 space-y-1">
          <div><strong>Instructions:</strong></div>
          <div>1. Connect your wallet</div>
          <div>2. Test regular transactions (user pays gas)</div>
          <div>3. Test sponsored transactions (gasless)</div>
          <div>4. Compare gas costs in transaction receipts</div>
          <div>5. Sponsored transactions use OnchainKit Transaction component</div>
        </div>
      </CardContent>
    </Card>
  );
}
