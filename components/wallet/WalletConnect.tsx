'use client';

import { Button } from '@/components/ui/button';
import { LogOut } from 'lucide-react';

interface WalletConnectProps {
  onConnect?: () => void;
  onDisconnect?: () => void;
  showDisconnect?: boolean;
}

export default function WalletConnect({ onConnect, onDisconnect, showDisconnect = false }: WalletConnectProps) {
  // For now, using a simplified approach until we can properly integrate OnchainKit hooks
  const isConnected = false; // This would come from OnchainKit hooks

  const handleConnect = async () => {
    try {
      // This would trigger OnchainKit's wallet connection
      console.log('Connecting wallet...');
      onConnect?.();
    } catch (error) {
      console.error('❌ Wallet connection failed:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      // This would trigger OnchainKit's wallet disconnection
      console.log('Disconnecting wallet...');
      onDisconnect?.();
    } catch (error) {
      console.error('❌ Wallet disconnect failed:', error);
    }
  };

  // Show disconnect button if connected and showDisconnect is true
  if (isConnected && showDisconnect) {
    return (
      <div className="space-y-3">
        <div className="text-sm text-gray-400 text-center">
          Wallet Connected
        </div>
        <Button
          onClick={handleDisconnect}
          variant="outline"
          className="w-full bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Disconnect Wallet
        </Button>
      </div>
    );
  }

  // Show connect button if not connected
  return (
    <div className="space-y-3">
      <Button
        onClick={handleConnect}
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white"
      >
        Connect Wallet
      </Button>
    </div>
  );
}