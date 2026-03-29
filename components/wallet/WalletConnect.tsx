'use client';

import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { useBaseAccount } from '@/hooks/useBaseAccount';
import { SignInWithBaseButton } from '@base-org/account-ui/react';
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
    subAccountAddress,
    universalAddress,
    isConnected,
    isConnecting,
    chainId,
    error,
    connect,
    disconnect,
  } = useBaseAccount();

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

  // Base Account automatically handles network switching

  // Show disconnect button if connected and showDisconnect is true
  if (isConnected && showDisconnect) {
    return (
      <div className={`space-y-3 ${className}`}>
        <div className="text-center space-y-2">
          <div className="flex items-center justify-center gap-2 text-green-400">
            <CheckCircle className="w-4 h-4" />
            <span className="text-sm">Base Account Connected</span>
          </div>
          <div className="text-xs text-gray-400 font-mono">
            Sub Account: {address?.slice(0, 6)}...{address?.slice(-4)}
          </div>
          {universalAddress && universalAddress !== address && (
            <div className="text-xs text-gray-500 font-mono">
              Universal: {universalAddress?.slice(0, 6)}...{universalAddress?.slice(-4)}
            </div>
          )}
          <Badge variant="secondary" className="bg-green-500/20 text-green-300">
            Base Network
          </Badge>
        </div>
        
        <Button
          onClick={handleDisconnect}
          variant="outline"
          className="w-full bg-white/10 backdrop-blur-md border-white/20 text-white hover:bg-white/20"
        >
          <LogOut className="w-4 h-4 mr-2" />
          Disconnect Base Account
        </Button>
      </div>
    );
  }

  // Show error if there's a connection issue
  if (error && !isConnected) {
    return (
      <div className={`space-y-3 ${className}`}>
        <Alert className="border-red-500/20 bg-red-500/10">
          <AlertTriangle className="w-4 h-4" />
          <AlertDescription className="text-red-300 text-sm">
            {error}
          </AlertDescription>
        </Alert>
        
        <SignInWithBaseButton
          colorScheme="light"
          onClick={handleConnect}
        />
      </div>
    );
  }

  // Show connect button if not connected
  return (
    <div className={`space-y-3 ${className}`}>
      <SignInWithBaseButton
        colorScheme="light"
        onClick={handleConnect}
      />
    </div>
  );
}