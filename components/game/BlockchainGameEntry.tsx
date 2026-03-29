'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { useTriviaContract } from '@/hooks/useTriviaContract';
import SessionCountdown from './SessionCountdown';
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
  
  // Entry fee constant (1 USDC = 1,000,000 wei for 6 decimals)
  const entryFee = BigInt(1_000_000);

  const {
    sessionActive,
    error,
    joinBattle,
    joinTrialBattle,
    submitScore,
    submitTrialScore,
    approveUSDC,
  } = useTriviaContract(true, false);

  // Note: USDC balance checking removed as functions not available in current hook

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
  const canJoinPaid = sessionActive ?? false;
  const canJoinTrial = sessionActive ?? false;
  const hasJoined = false; // We'll need to track this differently

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
    <div className={`space-y-4 ${className}`}>
      {/* Session countdown - shows when next session can start */}
      <SessionCountdown />
      
      <Card className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border-purple-500/20">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-purple-400">
            <Trophy className="w-5 h-5" />
            Join Trivia Battle
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-6">
        {/* Session Status */}
        <div className="grid grid-cols-2 gap-4 text-sm">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-blue-400" />
            <span>Session: see contract</span>
          </div>
          <div className="flex items-center gap-2">
            <DollarSign className="w-4 h-4 text-green-400" />
            <span>Prize Pool: on-chain</span>
          </div>
          <div className="flex items-center gap-2">
            <Trophy className="w-4 h-4 text-yellow-400" />
            <span>Status: {sessionActive ? 'Active' : 'Inactive'}</span>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <Alert className="border-red-500/20 bg-red-500/10">
            <AlertDescription className="text-red-300">
              {error}
            </AlertDescription>
          </Alert>
        )}

        {/* No Active Session */}
        {!sessionActive && (
          <Alert className="border-yellow-500/20 bg-yellow-500/10">
            <AlertDescription className="text-yellow-300">
              No active session. Please wait for the next battle to begin.
            </AlertDescription>
          </Alert>
        )}

        {/* Join Options */}
        {sessionActive && (
          <div className="space-y-4">
            {/* Paid Player Option */}
            <div className="border border-purple-500/20 rounded-lg p-4 bg-purple-500/5">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-purple-300">Paid Player</h3>
                <Badge variant="secondary" className="bg-purple-500/20 text-purple-300">
                  1 USDC
                </Badge>
              </div>
              
              <div className="space-y-2 text-sm text-gray-300 mb-4">
                <p>• Compete for real prizes</p>
                <p>• Full blockchain integration</p>
                <p>• Entry fee: 1 USDC</p>
              </div>

              <div className="flex gap-2">
                <Button
                  onClick={handleJoinBattle}
                  disabled={!canJoinPaid}
                  className="flex-1 bg-purple-600 hover:bg-purple-500 text-white"
                >
                  <Play className="w-4 h-4 mr-2" />
                  Join Battle
                </Button>
              </div>
            </div>

            {/* Trial Player Option - DISABLED: Not available on-chain */}
            <div className="border border-blue-500/20 rounded-lg p-4 bg-blue-500/5 opacity-60">
              <div className="flex items-center justify-between mb-3">
                <h3 className="font-semibold text-blue-300">Trial Player</h3>
                <Badge variant="secondary" className="bg-gray-500/20 text-gray-400">
                  Unavailable
                </Badge>
              </div>
              
              <div className="space-y-2 text-sm text-gray-400 mb-4">
                <p>• Trial mode is not available on-chain</p>
                <p>• Must be implemented off-chain via SpacetimeDB</p>
                <p>• Use "Join Battle" above to play as paid player</p>
              </div>

              <Alert className="border-yellow-500/20 bg-yellow-500/10 mb-4">
                <AlertDescription className="text-yellow-300 text-xs">
                  Trial mode requires off-chain implementation. Use SpacetimeDB or join as a paid player.
                </AlertDescription>
              </Alert>

              <Button
                onClick={handleJoinTrialBattle}
                disabled={true}
                className="w-full bg-gray-600 hover:bg-gray-600 text-gray-400 cursor-not-allowed"
              >
                <Zap className="w-4 h-4 mr-2" />
                Trial Mode Unavailable
              </Button>
            </div>
          </div>
        )}

        {/* Loading State */}
        {error && (
          <div className="text-center py-4">
            <div className="text-red-400">
              <p className="text-gray-400 mt-2">Error: {error}</p>
            </div>
          </div>
        )}
        </CardContent>
      </Card>
    </div>
  );
}
