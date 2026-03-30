'use client';

import { useActivePlayers } from '@/hooks/useActivePlayers';

interface PlayerCountProps {
  className?: string;
  showLabel?: boolean;
}

export default function PlayerCount({ className = '', showLabel = true }: PlayerCountProps) {
  const { players, isLoading } = useActivePlayers({ maxPlayers: 100 }); // Get all players for accurate count

  if (isLoading) {
    return (
      <div className={`flex items-center space-x-2 ${className}`}>
        {showLabel && <span className="text-white text-xs">Players:</span>}
        <div className="w-4 h-4 bg-gray-600 rounded-full animate-pulse"></div>
      </div>
    );
  }

  return (
    <div className={`flex items-center space-x-2 ${className}`}>
      {showLabel && <span className="text-white text-xs">Players:</span>}
      <span className="text-white text-xs font-semibold">{players.length}</span>
    </div>
  );
}
