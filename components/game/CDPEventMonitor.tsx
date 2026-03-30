"use client";

import React from 'react';
import { useCDPEvents, usePlayerJoinedEvents, useScoreSubmittedEvents, useSessionEvents } from '@/hooks/useCDPEvents';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { RefreshCw, Users, Trophy, Play, Square, AlertCircle } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CDPEventMonitorProps {
  className?: string;
}

export const CDPEventMonitor: React.FC<CDPEventMonitorProps> = ({ className }) => {
  const { 
    events, 
    loading, 
    error, 
    isInitialized, 
    refreshEvents, 
    lastUpdateTime 
  } = useCDPEvents(30000); // Poll every 30 seconds

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: number) => {
    return formatDistanceToNow(new Date(timestamp * 1000), { addSuffix: true });
  };

  if (!isInitialized) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-yellow-500" />
            CDP Event Monitor
          </CardTitle>
          <CardDescription>
            Initializing Coinbase CDP connection...
          </CardDescription>
        </CardHeader>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertCircle className="h-5 w-5 text-red-500" />
            CDP Event Monitor
          </CardTitle>
          <CardDescription className="text-red-500">
            {error}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Button onClick={refreshEvents} variant="outline" size="sm">
            <RefreshCw className="h-4 w-4 mr-2" />
            Retry
          </Button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5 text-blue-500" />
              Live Contract Events
            </CardTitle>
            <CardDescription>
              Real-time TriviaBattle contract events from Base network
            </CardDescription>
          </div>
          <div className="flex items-center gap-2">
            {lastUpdateTime && (
              <span className="text-xs text-muted-foreground">
                Updated {formatDistanceToNow(lastUpdateTime, { addSuffix: true })}
              </span>
            )}
            <Button 
              onClick={refreshEvents} 
              variant="outline" 
              size="sm"
              disabled={loading}
            >
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* Session Events */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Play className="h-4 w-4 text-green-500" />
              <span className="font-medium">Sessions Started</span>
              <Badge variant="secondary">{events.sessionStarted.length}</Badge>
            </div>
            {events.sessionStarted.slice(0, 3).map((event, index) => (
              <div key={index} className="text-sm text-muted-foreground">
                Duration: {parseInt(event.duration)}s • {formatTimestamp(event.timestamp)}
              </div>
            ))}
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Square className="h-4 w-4 text-red-500" />
              <span className="font-medium">Sessions Ended</span>
              <Badge variant="secondary">{events.sessionEnded.length}</Badge>
            </div>
            {events.sessionEnded.slice(0, 3).map((event, index) => (
              <div key={index} className="text-sm text-muted-foreground">
                {formatTimestamp(event.timestamp)}
              </div>
            ))}
          </div>
        </div>

        {/* Player Events */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-blue-500" />
              <span className="font-medium">Players Joined</span>
              <Badge variant="secondary">{events.playerJoined.length}</Badge>
            </div>
            {events.playerJoined.slice(0, 3).map((event, index) => (
              <div key={index} className="text-sm text-muted-foreground">
                {formatAddress(event.player)} • {formatTimestamp(event.timestamp)}
              </div>
            ))}
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-yellow-500" />
              <span className="font-medium">Scores Submitted</span>
              <Badge variant="secondary">{events.scoreSubmitted.length}</Badge>
            </div>
            {events.scoreSubmitted.slice(0, 3).map((event, index) => (
              <div key={index} className="text-sm text-muted-foreground">
                {formatAddress(event.player)} • Score: {event.score} • {formatTimestamp(event.timestamp)}
              </div>
            ))}
          </div>
        </div>

        {/* Trial Events */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Users className="h-4 w-4 text-purple-500" />
              <span className="font-medium">Trial Players</span>
              <Badge variant="secondary">{events.trialPlayerJoined.length}</Badge>
            </div>
            {events.trialPlayerJoined.slice(0, 3).map((event, index) => (
              <div key={index} className="text-sm text-muted-foreground">
                Session: {event.sessionId} • {formatTimestamp(event.timestamp)}
              </div>
            ))}
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-purple-500" />
              <span className="font-medium">Trial Scores</span>
              <Badge variant="secondary">{events.trialScoreSubmitted.length}</Badge>
            </div>
            {events.trialScoreSubmitted.slice(0, 3).map((event, index) => (
              <div key={index} className="text-sm text-muted-foreground">
                Session: {event.sessionId} • Score: {event.score} • {formatTimestamp(event.timestamp)}
              </div>
            ))}
          </div>
        </div>

        {/* Prize Distribution */}
        {events.prizesDistributed.length > 0 && (
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <Trophy className="h-4 w-4 text-green-500" />
              <span className="font-medium">Prizes Distributed</span>
              <Badge variant="secondary">{events.prizesDistributed.length}</Badge>
            </div>
            {events.prizesDistributed.slice(0, 2).map((event, index) => (
              <div key={index} className="text-sm text-muted-foreground">
                {event.winners.length} winners • {formatTimestamp(event.timestamp)}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

// Simplified component for just player activity
export const PlayerActivityMonitor: React.FC<{ className?: string }> = ({ className }) => {
  const { events: playerEvents, loading, error, refresh } = usePlayerJoinedEvents(15000);
  const { events: scoreEvents } = useScoreSubmittedEvents(15000);

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: number) => {
    return formatDistanceToNow(new Date(timestamp * 1000), { addSuffix: true });
  };

  if (error) {
    return (
      <div className={className}>
        <div className="text-sm text-red-500">CDP Error: {error}</div>
      </div>
    );
  }

  return (
    <div className={className}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">Live Activity</span>
        <Button onClick={refresh} variant="ghost" size="sm" disabled={loading}>
          <RefreshCw className={`h-3 w-3 ${loading ? 'animate-spin' : ''}`} />
        </Button>
      </div>
      
      <div className="space-y-1 text-xs text-muted-foreground">
        {playerEvents.slice(0, 3).map((event, index) => (
          <div key={index}>
            <Users className="h-3 w-3 inline mr-1" />
            {formatAddress(event.player)} joined {formatTimestamp(event.timestamp)}
          </div>
        ))}
        
        {scoreEvents.slice(0, 2).map((event, index) => (
          <div key={`score-${index}`}>
            <Trophy className="h-3 w-3 inline mr-1" />
            {formatAddress(event.player)} scored {event.score} {formatTimestamp(event.timestamp)}
          </div>
        ))}
      </div>
    </div>
  );
};
