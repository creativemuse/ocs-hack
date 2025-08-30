'use client';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useWallet } from '@/hooks/useWallet';
import { LogOut, Wallet, AlertTriangle, CheckCircle } from 'lucide-react';

interface WalletConnectProps {
  onConnect?: (address: string) => void;
  onDisconnect?: () => void;
  showDisconnect?: boolean;
  className?: string;
}

export default function WalletConnect({ 
  onConnect, 
  onDisconnect, 
  showDisconnect = false,
  className = ''
}: WalletConnectProps) {
  const {
    address,
    isConnected,
    isConnecting,
    chainId,
    error,
    connect,
    disconnect,
    switchNetwork,
  } = useWallet();

  const handleConnect = async () => {
    try {
      await connect();
      if (address) {
        onConnect?.(address);
      }
    } catch (error) {
      console.error('❌ Wallet connection failed:', error);
    }
  };

  const handleDisconnect = async () => {
    try {
      disconnect();
      onDisconnect?.();
    } catch (error) {
      console.error('❌ Wallet disconnect failed:', error);
    }
  };

  const handleSwitchNetwork = async () => {
    try {
      await switchNetwork(84532); // Base Sepolia
    } catch (error) {
      console.error('❌ Network switch failed:', error);
    }
  };

  // Show disconnect button if connected and showDisconnect is true
  if (isConnected && showDisconnect) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-green-400">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">Wallet Connected</span>
          </div>
          <div className="text-xs text-gray-400 font-mono">
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </div>
          {chainId === 84532 ? (
            <Badge variant="secondary" className="bg-green-500/20 text-green-300">
              Base Sepolia
            </Badge>
          ) : (
            <Badge variant="secondary" className="bg-red-500/20 text-red-300">
              Wrong Network
            </Badge>
          )}
        </div>
        
        {chainId !== 84532 && (
          <Button
            onClick={handleSwitchNetwork}
            variant="outline"
            className="w-full border-yellow-500/30 text-yellow-300 hover:bg-yellow-500/20"
          >
            <AlertTriangle className="w-4 h-4 mr-2" />
            Switch to Base Sepolia
          </Button>
        )}
        
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

  // Show error if there's a network issue
  if (error && !isConnected) {
    return (
      <div className={`space-y-3 ${className}`}>
        <Alert className="border-red-500/20 bg-red-500/10">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription className="text-red-300 text-sm">
            {error}
          </AlertDescription>
        </Alert>
        
        <Button
          onClick={handleConnect}
          disabled={isConnecting}
          className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white"
        >
          <Wallet className="w-4 h-4 mr-2" />
          {isConnecting ? 'Connecting...' : 'Connect Wallet'}
        </Button>
      </div>
    );
  }

  // Show connect button if not connected
  return (
    <div className={`space-y-3 ${className}`}>
      <Button
        onClick={handleConnect}
        disabled={isConnecting}
        className="w-full bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-500 hover:to-blue-500 text-white"
      >
        <Wallet className="w-4 h-4 mr-2" />
        {isConnecting ? 'Connecting...' : 'Connect Wallet'}
      </Button>
    </div>
  );
}