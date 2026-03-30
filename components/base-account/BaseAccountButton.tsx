'use client';

import { Button } from '@/components/ui/button';
import { SignInWithBaseButton } from '@base-org/account-ui/react';
import { useBaseAccount } from '@/hooks/useBaseAccount';
import { Shield, LogOut, CheckCircle } from 'lucide-react';

interface BaseAccountButtonProps {
  onConnect?: () => void;
  onDisconnect?: () => void;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
}

export default function BaseAccountButton({ 
  onConnect, 
  onDisconnect, 
  className = '',
  variant = 'default',
  size = 'default'
}: BaseAccountButtonProps) {
  const { isConnected, connect, disconnect } = useBaseAccount();

  const handleConnect = async () => {
    try {
      await connect();
      onConnect?.();
    } catch (error) {
      console.error('❌ Base Account connection failed:', error);
    }
  };

  const handleDisconnect = () => {
    disconnect();
    onDisconnect?.();
  };

  if (isConnected) {
    return (
      <Button
        onClick={handleDisconnect}
        variant={variant}
        size={size}
        className={`bg-green-500/20 text-green-300 border-green-500/30 hover:bg-green-500/30 ${className}`}
      >
        <CheckCircle className="h-4 w-4 mr-2" />
        Connected
        <LogOut className="h-4 w-4 ml-2" />
      </Button>
    );
  }

  return (
    <SignInWithBaseButton
      colorScheme="light"
      onClick={handleConnect}
    />
  );
}
