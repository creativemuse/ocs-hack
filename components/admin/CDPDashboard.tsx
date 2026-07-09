"use client";

import React from 'react';
import { useCDPEvents } from '@/hooks/useCDPEvents';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  Users, 
  Trophy, 
  Play, 
  RefreshCw, 
  TrendingUp,
  Activity
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CDPDashboardProps {
  className?: string;
}

export const CDPDashboard: React.FC<CDPDashboardProps> = ({ className }) => {
  const { 
    events, 
    loading, 
    error, 
    isInitialized, 
    refreshEvents, 
    lastUpdateTime 
  } = useCDPEvents(10000); // Poll every 10 seconds for admin dashboard

  const formatAddress = (address: string) => {
    return `${address.slice(0, 6)}...${address.slice(-4)}`;
  };

  const formatTimestamp = (timestamp: number) => {
    return formatDistanceToNow(new Date(timestamp * 1000), { addSuffix: true });
  };

  // Calculate statistics
  const totalPlayers = events.playerJoined.length;
  const totalScores = events.scoreSubmitted.length;
  const totalSessions = events.sessionStarted.length;

  if (!isInitialized) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-yellow-500" />
            CDP Dashboard
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
            <Activity className="h-5 w-5 text-red-500" />
            CDP Dashboard
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
    <div className={className}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-blue-500" />
                TriviaBattlev5 Analytics
              </CardTitle>
              <CardDescription>
                Real-time contract events and analytics from Base network
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
        <CardContent>
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="players">Players</TabsTrigger>
              <TabsTrigger value="sessions">Sessions</TabsTrigger>
            </TabsList>
            
            <TabsContent value="overview" className="space-y-4">
              {/* Statistics Cards */}
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Users className="h-4 w-4 text-blue-500" />
                      <div>
                        <p className="text-sm font-medium">Total Players</p>
                        <p className="text-2xl font-bold">{totalPlayers}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <Trophy className="h-4 w-4 text-yellow-500" />
                      <div>
                        <p className="text-sm font-medium">Scores Submitted</p>
                        <p className="text-2xl font-bold">{totalScores}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardContent className="p-4">
                    <div className="flex items-center gap-2">
                      <TrendingUp className="h-4 w-4 text-purple-500" />
                      <div>
                        <p className="text-sm font-medium">Sessions</p>
                        <p className="text-2xl font-bold">{totalSessions}</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Recent Activity */}
              <Card>
                <CardHeader>
                  <CardTitle className="text-lg">Recent Activity</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 max-h-64 overflow-y-auto">
                    {[...events.playerJoined, ...events.scoreSubmitted]
                      .sort((a, b) => b.timestamp - a.timestamp)
                      .slice(0, 10)
                      .map((event, index) => (
                        <div key={index} className="flex items-center justify-between p-2 bg-muted rounded">
                          <div className="flex items-center gap-2">
                            {'playerCount' in event ? (
                              <Trophy className="h-4 w-4 text-yellow-500" />
                            ) : (
                              <Users className="h-4 w-4 text-blue-500" />
                            )}
                            <span className="text-sm">
                              {'playerCount' in event
                                ? `Session ${event.sessionId} • ${event.playerCount} players`
                                : `${formatAddress(event.player)} joined`}
                            </span>
                          </div>
                          <span className="text-xs text-muted-foreground">
                            {formatTimestamp(event.timestamp)}
                          </span>
                        </div>
                      ))}
                  </div>
                </CardContent>
              </Card>
            </TabsContent>
            
            <TabsContent value="players" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Users className="h-5 w-5" />
                      Players Joined ({events.playerJoined.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {events.playerJoined.map((event, index) => (
                        <div key={index} className="p-2 bg-muted rounded">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">{formatAddress(event.player)}</p>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatTimestamp(event.timestamp)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
                
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Trophy className="h-5 w-5" />
                      Scores Submitted ({events.scoreSubmitted.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {events.scoreSubmitted.map((event, index) => (
                        <div key={index} className="p-2 bg-muted rounded">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">Session: {event.sessionId}</p>
                              <p className="text-sm text-muted-foreground">
                                Players: {event.playerCount}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatTimestamp(event.timestamp)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
            
            <TabsContent value="sessions" className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Play className="h-5 w-5 text-green-500" />
                      Sessions Started ({events.sessionStarted.length})
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 max-h-64 overflow-y-auto">
                      {events.sessionStarted.map((event, index) => (
                        <div key={index} className="p-2 bg-muted rounded">
                          <div className="flex justify-between items-start">
                            <div>
                              <p className="font-medium">Session #{index + 1}</p>
                              <p className="text-sm text-muted-foreground">
                                Start: {parseInt(event.startTime)} • End: {parseInt(event.endTime)}
                              </p>
                            </div>
                            <span className="text-xs text-muted-foreground">
                              {formatTimestamp(event.timestamp)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};