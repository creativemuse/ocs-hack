'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Share2, Users, Trophy, Music, Star } from 'lucide-react';
import ComposeCastButton from './ComposeCastButton';
import { useSocialShare } from '@/hooks/useSocialShare';

export default function SocialGraphDemo() {
  const { shareGameAchievement, sharePlayerActivity } = useSocialShare();
  const [demoScore] = useState(750);
  const [demoPlayerCount] = useState(12);

  const handleDemoShare = () => {
    shareGameAchievement('high-score', demoScore, {
      round: 3,
      totalRounds: 3,
      playerCount: demoPlayerCount,
      playerName: 'Demo Player'
    });
  };

  const handlePlayerActivityShare = () => {
    sharePlayerActivity('joined-game', 'VITALIK.BASE.ETH', {
      score: 1200,
      questionNumber: 5,
      totalQuestions: 30
    });
  };

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-4">
        <h1 className="text-3xl font-bold text-white">BEAT ME Social Graph</h1>
        <p className="text-gray-400">
          Experience the power of social gaming with native sharing and player connections
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Achievement Sharing */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Trophy className="w-5 h-5 text-yellow-400" />
              <span>Achievement Sharing</span>
            </CardTitle>
            <CardDescription className="text-gray-400">
              Share your victories and milestones with the community
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <ComposeCastButton
                achievementType="high-score"
                score={demoScore}
                className="w-full"
              />
              
              <ComposeCastButton
                achievementType="game-complete"
                score={demoScore}
                round={3}
                totalRounds={3}
                className="w-full"
              />
              
              <ComposeCastButton
                achievementType="perfect-round"
                score={100}
                round={2}
                className="w-full"
              />
            </div>
            
            <div className="pt-4 border-t border-gray-700">
              <Button
                onClick={handleDemoShare}
                variant="outline"
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Demo High Score Share
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Player Activity */}
        <Card className="bg-gray-900 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Users className="w-5 h-5 text-blue-400" />
              <span>Player Activity</span>
            </CardTitle>
            <CardDescription className="text-gray-400">
              Share and discover what other players are doing
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-3">
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-semibold">VITALIK.BASE.ETH</div>
                    <div className="text-gray-400 text-sm">Just joined the game</div>
                  </div>
                  <Badge className="bg-green-500 text-white">Live</Badge>
                </div>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-semibold">PAULCRAMER.BASE.ETH</div>
                    <div className="text-gray-400 text-sm">Scored 850 USDC in Round 2</div>
                  </div>
                  <Badge className="bg-yellow-500 text-white">Hot</Badge>
                </div>
              </div>
              
              <div className="bg-gray-800 rounded-lg p-3">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="text-white font-semibold">ALICE.BASE.ETH</div>
                    <div className="text-gray-400 text-sm">Perfect Round 1!</div>
                  </div>
                  <Badge className="bg-purple-500 text-white">Perfect</Badge>
                </div>
              </div>
            </div>
            
            <div className="pt-4 border-t border-gray-700">
              <Button
                onClick={handlePlayerActivityShare}
                variant="outline"
                className="w-full border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                <Share2 className="w-4 h-4 mr-2" />
                Demo Player Activity Share
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Social Features */}
        <Card className="bg-gray-900 border-gray-700 md:col-span-2">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <Star className="w-5 h-5 text-purple-400" />
              <span>Social Graph Features</span>
            </CardTitle>
            <CardDescription className="text-gray-400">
              Connect with players and build your gaming network
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center mx-auto">
                  <Users className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-white font-semibold">Player Profiles</h3>
                <p className="text-gray-400 text-sm">View detailed player stats and achievements</p>
              </div>
              
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-blue-500 rounded-full flex items-center justify-center mx-auto">
                  <Share2 className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-white font-semibold">Native Sharing</h3>
                <p className="text-gray-400 text-sm">Share achievements using Web Share API</p>
              </div>
              
              <div className="text-center space-y-2">
                <div className="w-12 h-12 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto">
                  <Music className="w-6 h-6 text-white" />
                </div>
                <h3 className="text-white font-semibold">Live Activity</h3>
                <p className="text-gray-400 text-sm">See real-time player activity and connections</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
