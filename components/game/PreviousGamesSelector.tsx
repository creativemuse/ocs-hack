'use client';

import { useState } from 'react';
import { Trophy, Calendar, Coins, Award } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useUnclaimedGames } from '@/hooks/useUnclaimedGames';
import ClaimWinningsButton from './ClaimWinningsButton';

interface PreviousGamesSelectorProps {
  onGameSelected?: (sessionId: bigint) => void;
}

export default function PreviousGamesSelector({ onGameSelected }: PreviousGamesSelectorProps) {
  const { unclaimedGames, isLoading, error } = useUnclaimedGames(10);
  const [selectedSessionId, setSelectedSessionId] = useState<bigint | null>(null);

  const selectedGame = unclaimedGames.find((g) => g.sessionId === selectedSessionId);

  const formatUSDC = (amount: string) => {
    const num = Number(amount) / 1000000; // USDC has 6 decimals
    return num.toFixed(6);
  };

  if (isLoading) {
    return (
      <div className="bg-white rounded-lg p-4 shadow-lg border">
        <div className="flex items-center gap-2 text-gray-500">
          <div className="h-4 w-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
          <span className="text-sm">Loading previous sessions...</span>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-red-50 border border-red-200 rounded-lg p-4">
        <p className="text-sm text-red-600">Error loading sessions: {error}</p>
      </div>
    );
  }

  if (unclaimedGames.length === 0) {
    return (
      <div className="bg-white rounded-lg p-4 shadow-lg border">
        <div className="flex items-center gap-2 text-gray-500">
          <Trophy className="h-4 w-4" />
          <span className="text-sm">No unclaimed prizes from previous sessions</span>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg p-4 shadow-lg border space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
          <Trophy className="h-5 w-5 text-yellow-600" />
          Previous Sessions with Unclaimed Prizes
        </h3>
        <Badge variant="secondary">{unclaimedGames.length} session{unclaimedGames.length !== 1 ? 's' : ''}</Badge>
      </div>

      <div className="space-y-3">
        <div>
          <label className="text-sm font-medium text-gray-700 mb-2 block">
            Select a session to claim from:
          </label>
          <Select
            value={selectedSessionId?.toString() || ''}
            onValueChange={(value) => {
              const sessionId = BigInt(value);
              setSelectedSessionId(sessionId);
              if (onGameSelected) {
                onGameSelected(sessionId);
              }
            }}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Choose a session..." />
            </SelectTrigger>
            <SelectContent>
              {unclaimedGames.map((game) => (
                <SelectItem key={game.sessionId.toString()} value={game.sessionId.toString()}>
                  <div className="flex items-center justify-between w-full">
                    <span>Session #{game.sessionId.toString()}</span>
                    <span className="text-xs text-gray-500 ml-2">
                      Rank #{game.ranking} • {formatUSDC(game.prizePool)} USDC pool
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {selectedGame && (
          <div className="bg-gradient-to-r from-yellow-50 to-orange-50 border border-yellow-200 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Award className="h-4 w-4 text-yellow-600" />
                <span className="text-sm font-medium text-yellow-800">Session #{selectedGame.sessionId.toString()}</span>
              </div>
              <Badge variant="secondary" className="bg-yellow-500/20 text-yellow-700">
                Rank #{selectedGame.ranking}
              </Badge>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div>
                <div className="text-gray-600">Prize Pool</div>
                <div className="font-bold text-gray-900 flex items-center gap-1">
                  <Coins className="h-3 w-3" />
                  {formatUSDC(selectedGame.prizePool)} USDC
                </div>
              </div>
              <div>
                <div className="text-gray-600">Players</div>
                <div className="font-bold text-gray-900">{selectedGame.playerCount}</div>
              </div>
              <div className="col-span-2">
                <div className="text-gray-600 flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Status
                </div>
                <div className="font-bold text-gray-900">{selectedGame.isActive ? 'Active' : 'Ended'}</div>
              </div>
            </div>

            {selectedGame.prizeAmount && selectedGame.prizeAmount !== '0' && (
              <div className="pt-2 border-t border-yellow-200">
                <div className="mb-2">
                  <div className="text-sm text-gray-600">Your Prize Amount</div>
                  <div className="text-lg font-bold text-green-600">
                    {formatUSDC(selectedGame.prizeAmount)} USDC
                  </div>
                </div>
                <ClaimWinningsButton
                  winningAmount={selectedGame.prizeAmount}
                  sessionId={selectedGame.sessionId}
                  onClaimSuccess={() => {
                    // Refresh the list after successful claim
                    setSelectedSessionId(null);
                  }}
                />
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

