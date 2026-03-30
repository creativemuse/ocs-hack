'use client';

import { useState } from 'react';
import { useBaseAccount } from '@/hooks/useBaseAccount';
import { SignInWithBaseButton, BasePayButton } from '@base-org/account-ui/react';
import { pay, getPaymentStatus } from '@base-org/account';
import { useUSDCBalance } from '@/hooks/useUSDCBalance';
import { Coins, DollarSign, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface WalletWithBalanceProps {
  onFundingSuccess?: () => void;
  className?: string;
}

export default function WalletWithBalance({ onFundingSuccess, className = '' }: WalletWithBalanceProps) {
  const { address, subAccountAddress, universalAddress, isConnected } = useBaseAccount();
  const { balance, hasEnoughForEntry, isLoading, error, refreshBalance } = useUSDCBalance();
  const [fundingSuccess, setFundingSuccess] = useState(false);
  const [paymentLoading, setPaymentLoading] = useState(false);

  const handleBasePay = async () => {
    if (!address) return;
    
    setPaymentLoading(true);
    try {
      console.log('Initiating Base Pay for wallet:', address);
      
      // Use Base Pay to add USDC funds
      const payment = await pay({
        amount: '5.00',
        to: address,
        testnet: false, // Use mainnet for production
      });
      
      console.log('Base Pay initiated:', payment.id);
      
      // Poll for payment status
      const checkStatus = async () => {
        try {
          const status = await getPaymentStatus({ id: payment.id, testnet: false });
          console.log('Payment status:', status);
          
          if (status.status === 'completed') {
            setFundingSuccess(true);
            onFundingSuccess?.();
            refreshBalance();
            setTimeout(() => setFundingSuccess(false), 3000);
          } else if (status.status === 'failed') {
            console.error('Payment failed');
          } else {
            // Still pending, check again in 2 seconds
            setTimeout(checkStatus, 2000);
          }
        } catch (error) {
          console.error('Error checking payment status:', error);
        }
      };
      
      // Start polling
      setTimeout(checkStatus, 2000);
      
    } catch (err) {
      console.error('Base Pay failed:', err);
    } finally {
      setPaymentLoading(false);
    }
  };

  const formatUSDCBalance = (balance: number) => {
    return balance.toFixed(2);
  };

  const getBalanceStatus = () => {
    if (isLoading) return { icon: Loader2, text: 'Loading...', className: 'text-gray-400' };
    if (error) return { icon: AlertCircle, text: 'Error loading balance', className: 'text-red-400' };
    if (hasEnoughForEntry) return { icon: CheckCircle, text: 'Sufficient funds', className: 'text-green-400' };
    return { icon: AlertCircle, text: 'Insufficient funds', className: 'text-yellow-400' };
  };

  const balanceStatus = getBalanceStatus();
  const StatusIcon = balanceStatus.icon;

  return (
    <div className={`space-y-4 ${className}`}>
      {/* USDC Balance Card */}
      {isConnected && address && (
        <Card className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-500/30">
          <CardContent className="p-4">
            <div className="flex items-center justify-between mb-3">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-blue-400" />
                <span className="text-sm font-medium text-white">USDC Balance</span>
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={refreshBalance}
                disabled={isLoading}
                className="text-gray-400 hover:text-white"
              >
                {isLoading ? (
                  <Loader2 className="h-3 w-3 animate-spin" />
                ) : (
                  <span className="text-xs">Refresh</span>
                )}
              </Button>
            </div>
            
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-2xl font-bold text-white">
                  {isLoading ? '...' : formatUSDCBalance(balance)} USDC
                </span>
                <StatusIcon className={`h-4 w-4 ${balanceStatus.className}`} />
              </div>
              
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-300">Entry Fee Required: 1 USDC</span>
                <Badge 
                  variant={hasEnoughForEntry ? "default" : "destructive"}
                  className={hasEnoughForEntry ? "bg-green-500/20 text-green-400 border-green-500/30" : "bg-red-500/20 text-red-400 border-red-500/30"}
                >
                  {hasEnoughForEntry ? 'Ready' : 'Need Funds'}
                </Badge>
              </div>
              
              {error && (
                <div className="text-xs text-red-400 flex items-center gap-1">
                  <AlertCircle className="h-3 w-3" />
                  {error}
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Base Account Component */}
      <div className="flex justify-center">
        {isConnected ? (
          <Card className="bg-gradient-to-br from-green-900/20 to-blue-900/20 border-green-500/30">
            <CardContent className="p-4">
              <div className="text-center space-y-3">
                <div className="flex items-center justify-center gap-2 text-green-400">
                  <CheckCircle className="w-4 h-4" />
                  <span className="text-sm font-medium">Base Account Connected</span>
                </div>
                
                <div className="space-y-1">
                  <div className="text-xs text-gray-400 font-mono">
                    Sub Account: {address?.slice(0, 6)}...{address?.slice(-4)}
                  </div>
                  {universalAddress && universalAddress !== address && (
                    <div className="text-xs text-gray-500 font-mono">
                      Universal: {universalAddress?.slice(0, 6)}...{universalAddress?.slice(-4)}
                    </div>
                  )}
                </div>
                
                <Badge variant="secondary" className="bg-green-500/20 text-green-300">
                  Base Network
                </Badge>
                
                {/* Add Funds with Base Pay */}
                <BasePayButton
                  colorScheme="light"
                  onClick={handleBasePay}
                />
              </div>
            </CardContent>
          </Card>
        ) : (
          <SignInWithBaseButton colorScheme="light" />
        )}
      </div>
    </div>
  );
}
