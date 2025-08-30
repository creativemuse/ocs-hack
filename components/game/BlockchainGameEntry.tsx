'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTriviaContract } from '@/hooks/useTriviaContract';
import { Trophy, Clock, Users, DollarSign, Play, Zap } from 'lucide-react';

interface BlockchainGameEntryProps {
  walletAddress?: string;
  onGameStart: () => void;
  className?: string;
}

export default function BlockchainGameEntry({ 
  walletAddress, 
  onGameStart, 
  className = '' 
}: BlockchainGameEntryProps) {
  const [trialSessionId, setTrialSessionId] = useState<string>('');
  const [usdcBalance, setUsdcBalance] = useState<bigint>(BigInt(0));
  const [usdcAllowance, setUsdcAllowance] = useState<bigint>(BigInt(0));
  const [isCheckingBalance, setIsCheckingBalance] = useState(false);

  const {
    sessionInfo,
    playerScore,
    trialPlayerScore,
    entryFee,
    isLoading,
    error,
    joinBattle,
    joinTrialBattle,
    submitScore,
    submitTrialScore,
    approveUSDC,
    getUSDCBalance,
    getUSDCAllowance,
    refreshSessionInfo,
    formatUSDC,
    formatTimeRemaining,
  } = useTriviaContract(walletAddress, trialSessionId);

  // Check USDC balance and allowance
  useEffect(() => {
    const checkUSDCStatus = async () => {
      if (!walletAddress) return;
      
      setIsCheckingBalance(true);
      try {
        const [balance, allowance] = await Promise.all([
          getUSDCBalance(walletAddress),
          getUSDCAllowance(walletAddress, '0x08e4e701a311c3c2F1EB24AF2E49A7281ec74ee6'),
        ]);
        setUsdcBalance(balance);
        setUsdcAllowance(allowance);
      } catch (error) {
        console.error('Error checking USDC status:', error);
      } finally {
        setIsCheckingBalance(false);
      }
    };

    checkUSDCStatus();
  }, [walletAddress, getUSDCBalance, getUSDCAllowance]);

  // Generate trial session ID
  const generateTrialSessionId = () => {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 15);
    return `trial_${timestamp}_${random}`;
  };

  // Handle paid player join
  const handleJoinBattle = async () => {
    try {
      // Check if approval is needed
      if (usdcAllowance < entryFee) {
        await approveUSDC();
      }
      
      await joinBattle();
      onGameStart();
    } catch (error) {
      console.error('Error joining battle:', error);
    }
  };

  // Handle trial player join
  const handleJoinTrialBattle = async () => {
    try {
      const sessionId = generateTrialSessionId();
      setTrialSessionId(sessionId);
      await joinTrialBattle(sessionId);
      onGameStart();
    } catch (error) {
      console.error('Error joining trial battle:', error);
    }
  };

  // Check if player can join
  const canJoinPaid = sessionInfo?.isActive && !playerScore?.hasSubmitted && usdcBalance >= entryFee;
  const canJoinTrial = sessionInfo?.isActive && !trialPlayerScore?.hasSubmitted;
  const hasJoined = playerScore?.hasSubmitted || trialPlayerScore?.hasSubmitted;

  if (hasJoined) {
    return (
      <Card className={`bg-gradient-to-br from-green-500/10 to-emerald-500/10 border-green-500/20 ${className}`}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-green-400">
            <Trophy className="w-5 h-5" />
            Already Joined Battle
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-center">
            <p className="text-green-300 mb-4">
              You're already registered in this battle!
            </p>
            <Button 
              onClick={onGameStart}
              className="bg-green-600 hover:bg-green-500 text-white"
            >
              <Play className="w-4 h-4 mr-2" />
              Continue Game
            </Button>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/20 ${className}`}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-purple-400">
          <Trophy className="w-5 h-5" />
          Join Trivia Battle
        </CardTitle>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Session Status */}
        {sessionInfo && (
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-blue-400" />
              <span>Time Left: {formatTimeRemaining(sessionInfo.endTime)}</span>
            </div>
            <div className="flex items-center gap-2">
              <DollarSign className="w-4 h-4 text-green-400" />
              <span>Prize Pool: {formatUSDC(sessionInfo.prizePool)} USDC</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-purple-400" />
              <span>Players: {Number(sessionInfo.paidPlayerCount) + Number(sessionInfo.trialPlayerCount)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Trophy className="w-4 h-4 text-yellow-400" />
              <span>Status: {sessionInfo.isActive ? 'Active' : 'Inactive'}</span>
            </div>
          </div>
        )}

        {/* Error Display */}
        {error && (
          <Alert className="border-red-500/20 bg-red-500/10">
            <AlertDescription className="text-red-300">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* No Active Session */}
        {sessionInfo && !sessionInfo.isActive && (
          <Alert className="border-yellow-500/20 bg-yellow-500/10">
            <AlertDescription className="text-yellow-300">
              No active session. Please wait for the next battle to begin.
            </AlertDescription>
          </Alert>
        )}

        {/* Join Options */}
        {sessionInfo?.isActive && (
          <div className="space-y-4">
            {/* Paid Player Option */}
            <div className="border border-purple-500/20 rounded-lg p-4 bg-purple-500/5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-purple-300">Paid Player</h3>
                <Badge variant="secondary" className="bg-purple-500/20 text-purple-300">
                  {formatUSDC(entryFee)} USDC
                </Badge>
              </div>
              
              <div className="space-y-2 text-sm text-gray-300 mb-4">
                <p>• Compete for real prizes</p>
                <p>• Full blockchain integration</p>
                <p>• USDC balance: {formatUSDC(usdcBalance)}</p>
                {usdcAllowance > 0 && (
                  <p>• Approved: {formatUSDC(usdcAllowance)}</p>
                )}
              </div>

              <div className="flex gap-2">
                {usdcAllowance < entryFee && (
                  <Button
                    onClick={approveUSDC}
                    disabled={isLoading || isCheckingBalance}
                    variant="outline"
                    className="flex-1 border-purple-500/30 text-purple-300 hover:bg-purple-500/20"
                  >
                    <Zap className="w-4 h-4 mr-2" />
                    Approve USDC
                  </Button>
                )}
                
                <Button
                  onClick={handleJoinBattle}
                  disabled={isLoading || !canJoinPaid || isCheckingBalance}
                  className="flex-1 bg-purple-600 hover:bg-purple-500 text-white"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Join Battle
                </Button>
              </div>
            </div>

            {/* Trial Player Option */}
            <div className="border border-blue-500/20 rounded-lg p-4 bg-blue-500/5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-blue-300">Trial Player</h3>
                <Badge variant="secondary" className="bg-blue-500/20 text-blue-300">
                  Free
                </Badge>
              </div>
              
              <div className="space-y-2 text-sm text-gray-300 mb-4">
                <p>• Play for free</p>
                <p>• No wallet required</p>
                <p>• Practice mode</p>
              </div>

              <Button
                onClick={handleJoinTrialBattle}
                disabled={isLoading || !canJoinTrial}
                className="w-full bg-blue-600 hover:bg-blue-500 text-white"
              >
                <Play className="w-4 h-4 mr-2" />
                Start Trial
              </Button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {isLoading && (
          <div className="text-center py-4">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-400 mx-auto"></div>
            <p className="text-gray-400 mt-2">Processing transaction...</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
