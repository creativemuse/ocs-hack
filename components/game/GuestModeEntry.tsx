'use client';

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useBaseAccount } from '@/hooks/useBaseAccount';
import { SignInWithBaseButton } from '@base-org/account-ui/react';
import { Wallet, Gamepad2, Crown, Sparkles, Users, Trophy, Zap, Shield, Star } from 'lucide-react';

interface GuestModeEntryProps {
  onGuestStart: (guestName: string) => void;
  onWalletConnect: () => void;
  className?: string;
}

export default function GuestModeEntry({ onGuestStart, onWalletConnect, className = '' }: GuestModeEntryProps) {
  const [guestName, setGuestName] = useState('');
  const [showGuestForm, setShowGuestForm] = useState(false);
  const { isConnected, connect } = useBaseAccount();

  const handleGuestSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (guestName.trim()) {
      onGuestStart(guestName.trim());
    }
  };

  const features = [
    {
      icon: <Zap className="h-4 w-4 text-yellow-400" />,
      title: "Instant Play",
      description: "Jump in immediately, no entry fee required"
    },
    {
      icon: <Sparkles className="h-4 w-4 text-pink-400" />,
      title: "Claim Later",
      description: "Claim rewards at the end of the game"
    }
  ];

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Hero Section */}
      <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30">
        <CardHeader className="text-center pb-4">
          <CardTitle className="flex items-center justify-center gap-2 text-2xl text-white">
            <Gamepad2 className="h-6 w-6 text-green-400" />
            Ready to Play?
          </CardTitle>
          <p className="text-gray-300 text-sm">
            Choose your adventure - play instantly or connect your wallet for rewards
          </p>
        </CardHeader>
      </Card>

      {/* Guest Mode Features */}
      <Card className="bg-gradient-to-br from-green-900/20 to-emerald-900/20 border-green-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-white">
            <Sparkles className="h-5 w-5 text-green-400" />
            Trial Mode
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            {features.map((feature, index) => (
              <div key={index} className="text-center p-3 bg-white/5 rounded-lg border border-white/10">
                <div className="flex justify-center mb-2">
                  {feature.icon}
                </div>
                <h4 className="text-sm font-medium text-white mb-1">{feature.title}</h4>
                <p className="text-xs text-gray-400">{feature.description}</p>
              </div>
            ))}
          </div>

          {/* Trial Limitation Notice */}
          <div className="bg-amber-500/10 border border-amber-500/20 rounded-lg p-3 mt-4">
            <div className="text-xs text-amber-300">
              <p className="font-medium mb-1">⚠️ Trial Player Limitations:</p>
              <ul className="space-y-1 text-amber-200/80">
                <li>• Trial players cannot win prizes from the prize pool</li>
                <li>• Trial games help you learn before playing for real money</li>
                <li>• Connect wallet after trial to compete for prizes</li>
              </ul>
            </div>
          </div>

          {!showGuestForm ? (
            <Button
              onClick={() => setShowGuestForm(true)}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white"
            >
              <Gamepad2 className="h-4 w-4 mr-2" />
              Start Playing Now
            </Button>
          ) : (
            <form onSubmit={handleGuestSubmit} className="space-y-3">
              <div>
                <Label htmlFor="guestName" className="text-sm text-gray-300">
                  Choose Your Player Name
                </Label>
                <Input
                  id="guestName"
                  value={guestName}
                  onChange={(e) => setGuestName(e.target.value)}
                  placeholder="Enter your name..."
                  className="mt-1 bg-white/10 border-white/20 text-white placeholder:text-gray-400"
                  maxLength={20}
                  required
                />
              </div>
              <div className="flex gap-2">
                <Button
                  type="submit"
                  className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white"
                  disabled={!guestName.trim()}
                >
                  <Gamepad2 className="h-4 w-4 mr-2" />
                  Start Game
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setShowGuestForm(false)}
                  className="bg-white/10 border-white/20 text-white hover:bg-white/20"
                >
                  Back
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>

      {/* Base Account Connect Option */}
      <Card className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-white">
            <Star className="h-5 w-5 text-blue-400" />
            Base Account Mode
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-300">Entry Fee:</span>
              <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                1 USDC
              </Badge>
            </div>
          </div>
          
          <div className="bg-blue-500/10 border border-blue-500/20 rounded-lg p-3">
            <div className="text-xs text-blue-300">
              <p className="font-medium mb-1">Base Account Benefits:</p>
              <ul className="space-y-1 text-blue-200/80">
                <li>• Win USDC rewards</li>
                <li>• Gasless transactions via paymaster</li>
                <li>• Cross-device stat persistence</li>
                <li>• Sub Account for enhanced security</li>
                <li>• Leaderboard ranking</li>
                <li>• Spend Permissions for seamless gameplay</li>
              </ul>
            </div>
          </div>

          {isConnected ? (
            <Button
              onClick={onWalletConnect}
              className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white"
            >
              <Shield className="h-4 w-4 mr-2" />
              Continue with Base Account
            </Button>
          ) : (
            <div className="space-y-3">
              <SignInWithBaseButton colorScheme="light" onClick={connect} />
              <Button
                onClick={onWalletConnect}
                variant="outline"
                className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
              >
                <Wallet className="h-4 w-4 mr-2" />
                Play for Rewards
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Social Proof */}
      {/* <Card className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-500/30">
        <CardContent className="p-4">
          <div className="text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-sm text-gray-300">
              <Users className="h-4 w-4" />
              <span>Join other players worldwide</span>
            </div>
            <div className="flex items-center justify-center gap-4 text-xs text-gray-400">
              <span>🏆 500+ prizes claimed</span>
              <span>🎵 1M+ songs played</span>
              <span>⭐ 4.9/5 rating</span>
            </div>
          </div>
        </CardContent>
      </Card> */}
    </div>
  );
}
