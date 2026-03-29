'use client';

import { useState } from 'react';
import { useBaseAccount } from '@/hooks/useBaseAccount';
import { useSponsoredTriviaContract } from '@/hooks/useSponsoredTriviaContract';
import SponsoredTransaction from './SponsoredTransaction';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { CheckCircle, XCircle, Loader2, Zap } from 'lucide-react';

export default function SponsoredTransactionExample() {
  const { address, isConnected } = useBaseAccount();
  const [sessionId] = useState('example-session-123');
  const [score] = useState(85);

  const {
    createApproveUSDCCall,
    createJoinBattleCall,
    createJoinTrialBattleCall,
    createSubmitScoreCall,
    createSubmitTrialScoreCall,
    handleTransactionSuccess,
    handleTransactionError,
    isSuccess,
    error,
    transactionHash
  } = useSponsoredTriviaContract();

  // Wrapper to handle the new callback signature
  const handleSuccessWrapper = (response: any) => {
    if (typeof response === 'string') {
      handleTransactionSuccess(response);
    } else if (response?.transactionHash) {
      handleTransactionSuccess(response.transactionHash);
    }
  };

  return (
    <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-white">
          <Zap className="h-5 w-5" />
          Sponsored Transaction Examples
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

        {/* Sponsored Transaction Examples */}
        <div className="space-y-2">
          <div className="text-sm text-gray-300 font-medium">Sponsored Transaction Examples:</div>
          
          {/* USDC Approval */}
          <SponsoredTransaction
            calls={[createApproveUSDCCall()]}
            onSuccess={handleSuccessWrapper}
            onError={handleTransactionError}
          >
            <Button
              className="w-full"
            >
              Approve USDC (Sponsored)
            </Button>
          </SponsoredTransaction>

          {/* Join Battle */}
          <SponsoredTransaction
            calls={[createJoinBattleCall()]}
            onSuccess={handleSuccessWrapper}
            onError={handleTransactionError}
          >
            <Button
              className="w-full"
              variant="secondary"
            >
              Join Battle (Sponsored)
            </Button>
          </SponsoredTransaction>

          {/* Join Trial Battle */}
          <SponsoredTransaction
            calls={[createJoinTrialBattleCall(sessionId)]}
            onSuccess={handleSuccessWrapper}
            onError={handleTransactionError}
          >
            <Button
              className="w-full"
              variant="outline"
            >
              Join Trial Battle (Sponsored)
            </Button>
          </SponsoredTransaction>

          {/* Submit Score */}
          <SponsoredTransaction
            calls={[createSubmitScoreCall(score)]}
            onSuccess={handleSuccessWrapper}
            onError={handleTransactionError}
          >
            <Button
              className="w-full"
              variant="outline"
            >
              Submit Score (Sponsored)
            </Button>
          </SponsoredTransaction>

          {/* Submit Trial Score */}
          <SponsoredTransaction
            calls={[createSubmitTrialScoreCall(sessionId, score)]}
            onSuccess={handleSuccessWrapper}
            onError={handleTransactionError}
          >
            <Button
              className="w-full"
              variant="outline"
            >
              Submit Trial Score (Sponsored)
            </Button>
          </SponsoredTransaction>
        </div>

        {/* Transaction Status */}
        {transactionHash && (
          <div className="p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
            <div className="text-blue-400 text-sm font-medium mb-1">
              Sponsored Transaction Sent
            </div>
            <div className="text-xs text-blue-300 break-all">
              Hash: {transactionHash}
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Mode: Sponsored (Gasless)
            </div>
          </div>
        )}

        {/* Success Status */}
        {isSuccess && (
          <div className="p-3 bg-green-900/20 border border-green-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-green-400 text-sm">
              <CheckCircle className="h-4 w-4" />
              Transaction Successful!
            </div>
            <div className="text-xs text-gray-400 mt-1">
              Gas was sponsored by the paymaster
            </div>
          </div>
        )}

        {/* Error Status */}
        {error && (
          <div className="p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
            <div className="flex items-center gap-2 text-red-400 text-sm">
              <XCircle className="h-4 w-4" />
              Transaction Failed
            </div>
            <div className="text-xs text-red-300 mt-1">
              {error}
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="text-xs text-gray-400 space-y-1">
          <div><strong>How to use:</strong></div>
          <div>1. Connect your wallet</div>
          <div>2. Click any sponsored transaction button</div>
          <div>3. The transaction will be gasless (sponsored)</div>
          <div>4. Check the transaction receipt for gas sponsorship</div>
        </div>
      </CardContent>
    </Card>
  );
}
