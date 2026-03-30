'use client';

import { useBaseAccount } from '@/hooks/useBaseAccount';
import { useState, useEffect } from 'react';
import { BasePayButton } from '@base-org/account-ui/react';
import { pay, getPaymentStatus } from '@base-org/account';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { DollarSign, CheckCircle, Loader2, AlertCircle, Shield, Zap } from 'lucide-react';
import SpendPermissionManager from './SpendPermissionManager';

interface GamePaymentProps {
  onPaymentComplete?: () => void;
  onBack?: () => void;
}

export default function GamePayment({ onPaymentComplete, onBack }: GamePaymentProps) {
  const { address, isConnected } = useBaseAccount();
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showSpendPermissions, setShowSpendPermissions] = useState(false);

  const handleBasePay = async () => {
    if (!address) return;
    
    setPaymentStatus('processing');
    setError(null);
    
    try {
      console.log('Initiating Base Pay for wallet:', address);
      
      // Use Base Pay to add USDC funds
      const payment = await pay({
        amount: '10.00',
        to: address,
        testnet: false, // Use mainnet for production
      });
      
      setPaymentId(payment.id);
      console.log('Base Pay initiated:', payment.id);
      
      // Poll for payment status
      const checkStatus = async () => {
        try {
          const status = await getPaymentStatus({ id: payment.id, testnet: false });
          console.log('Payment status:', status);
          
          if (status.status === 'completed') {
            setPaymentStatus('completed');
            onPaymentComplete?.();
            setTimeout(() => setPaymentStatus('idle'), 3000);
          } else if (status.status === 'failed') {
            setPaymentStatus('failed');
            setError('Payment failed');
          } else {
            // Still pending, check again in 2 seconds
            setTimeout(checkStatus, 2000);
          }
        } catch (error) {
          console.error('Error checking payment status:', error);
          setPaymentStatus('failed');
          setError('Failed to check payment status');
        }
      };
      
      // Start polling
      setTimeout(checkStatus, 2000);
      
    } catch (err) {
      console.error('Base Pay failed:', err);
      setPaymentStatus('failed');
      setError(err instanceof Error ? err.message : 'Payment failed');
    }
  };

  if (!isConnected || !address) {
    return (
      <div className="bg-[#000000] min-h-screen w-full flex items-center justify-center px-4">
        <div className="w-full max-w-[390px] md:max-w-[428px]">
          <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30">
            <CardContent className="p-6">
              <div className="text-center text-gray-400">
                <Shield className="h-8 w-8 mx-auto mb-2 opacity-50" />
                <p className="text-sm">Connect your Base Account to access payment options</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (paymentStatus === 'processing') {
    return (
      <div className="bg-[#000000] min-h-screen w-full flex items-center justify-center px-4">
        <div className="w-full max-w-[390px] md:max-w-[428px]">
          <Card className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg text-white">
                <Loader2 className="h-5 w-5 text-blue-400 animate-spin" />
                Processing Payment
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-300 text-center">
                Your Base Pay transaction is being processed...
              </div>
              
              {paymentId && (
                <div className="bg-black/30 rounded-lg p-3">
                  <div className="text-xs text-gray-400 text-center">
                    Payment ID: {paymentId.slice(0, 8)}...{paymentId.slice(-8)}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  if (paymentStatus === 'completed') {
    return (
      <div className="bg-[#000000] min-h-screen w-full flex items-center justify-center px-4">
        <div className="w-full max-w-[390px] md:max-w-[428px]">
          <Card className="bg-gradient-to-br from-green-900/20 to-blue-900/20 border-green-500/30">
            <CardHeader className="pb-3">
              <CardTitle className="flex items-center gap-2 text-lg text-white">
                <CheckCircle className="h-5 w-5 text-green-400" />
                Payment Successful
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="text-sm text-gray-300 text-center">
                Your wallet has been funded with $10 USDC!
              </div>
              
              <Badge variant="secondary" className="bg-green-500/20 text-green-400 w-full justify-center">
                <CheckCircle className="h-3 w-3 mr-1" />
                Payment Complete
              </Badge>
            </CardContent>
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#000000] min-h-screen w-full flex items-center justify-center px-4">
      <div className="w-full max-w-[390px] md:max-w-[428px] space-y-4">
        {/* Header */}
        <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-white">
              <DollarSign className="h-5 w-5 text-yellow-400" />
              Base Account Payment
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-300 text-center">
              Add USDC to your Base Account to join the game and compete for prizes
            </div>
            
            <div className="flex items-center justify-center gap-2 text-sm">
              <Zap className="h-4 w-4 text-blue-400" />
              <span className="text-gray-300">Gasless Transactions</span>
              <Badge variant="secondary" className="bg-blue-500/20 text-blue-400 border-blue-500/30">
                Enabled
              </Badge>
            </div>
          </CardContent>
        </Card>

        {/* Error Display */}
        {error && (
          <Card className="bg-red-900/20 border-red-500/30">
            <CardContent className="p-4">
              <div className="text-red-400 text-sm text-center flex items-center gap-2">
                <AlertCircle className="h-4 w-4" />
                {error}
              </div>
            </CardContent>
          </Card>
        )}

        {/* Base Pay Component */}
        <Card className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-white">
              <DollarSign className="h-5 w-5 text-blue-400" />
              Add USDC Funds
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-300 text-center">
              Use Base Pay to add $10 USDC to your account
            </div>
            
            <BasePayButton
              colorScheme="light"
              onClick={handleBasePay}
            />
            
            <div className="text-xs text-gray-400 text-center">
              Powered by Base Pay
            </div>
          </CardContent>
        </Card>

        {/* Spend Permissions Section */}
        <Card className="bg-gradient-to-br from-purple-900/20 to-pink-900/20 border-purple-500/30">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg text-white">
              <Shield className="h-5 w-5 text-purple-400" />
              Spend Permissions
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="text-sm text-gray-300 text-center">
              Enable gasless transactions by granting spend permissions
            </div>
            
            <Button
              onClick={() => setShowSpendPermissions(!showSpendPermissions)}
              variant="outline"
              className="w-full bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              {showSpendPermissions ? 'Hide' : 'Manage'} Spend Permissions
            </Button>
            
            {showSpendPermissions && (
              <SpendPermissionManager />
            )}
          </CardContent>
        </Card>

        {/* Back Button */}
        {onBack && (
          <div className="text-center">
            <Button
              onClick={onBack}
              variant="outline"
              className="bg-white/10 border-white/20 text-white hover:bg-white/20"
            >
              Back to Game Entry
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
