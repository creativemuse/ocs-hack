'use client';

import { useState } from 'react';
import { useBaseAccount } from '@/hooks/useBaseAccount';
import { BasePayButton } from '@base-org/account-ui/react';
import { pay, getPaymentStatus } from '@base-org/account';
import { Button } from '@/components/ui/button';
import { Coins, ExternalLink, DollarSign, CheckCircle, Loader2 } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

interface WalletFundingProps {
  className?: string;
}

export default function WalletFunding({ className = '' }: WalletFundingProps) {
  const { address, isConnected } = useBaseAccount();
  const [paymentStatus, setPaymentStatus] = useState<'idle' | 'processing' | 'completed' | 'failed'>('idle');
  const [paymentId, setPaymentId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const handleBasePay = async () => {
    if (!address) return;
    
    setPaymentStatus('processing');
    setError(null);
    
    try {
      console.log('Initiating Base Pay for wallet:', address);
      
      // Use Base Pay to add USDC funds
      const payment = await pay({
        amount: '5.00',
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
      <Card className={`bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30 ${className}`}>
        <CardContent className="p-4">
          <div className="text-center text-gray-400">
            <Coins className="h-8 w-8 mx-auto mb-2 opacity-50" />
            <p className="text-sm">Connect your Base Account to access funding options</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (paymentStatus === 'processing') {
    return (
      <Card className={`bg-gradient-to-br from-blue-900/20 to-purple-900/20 border-blue-500/30 ${className}`}>
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
    );
  }

  if (paymentStatus === 'completed') {
    return (
      <Card className={`bg-gradient-to-br from-green-900/20 to-blue-900/20 border-green-500/30 ${className}`}>
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-white">
            <CheckCircle className="h-5 w-5 text-green-400" />
            Payment Successful
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="text-sm text-gray-300 text-center">
            Your wallet has been funded with $5 USDC!
          </div>
          
          <Badge variant="secondary" className="bg-green-500/20 text-green-400 w-full justify-center">
            <CheckCircle className="h-3 w-3 mr-1" />
            Payment Complete
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={`bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30 ${className}`}>
      <CardHeader className="pb-3">
        <CardTitle className="flex items-center gap-2 text-lg text-white">
          <Coins className="h-5 w-5 text-yellow-400" />
          Base Account Funding
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="text-sm text-gray-300 text-center">
          Need funds to play? Add USDC to your Base Account easily.
        </div>
        
        <div className="space-y-3">
          <BasePayButton
            colorScheme="light"
            onClick={handleBasePay}
          />
          
          {error && (
            <div className="text-red-400 text-xs text-center">
              {error}
            </div>
          )}
        </div>
        
        <div className="text-xs text-gray-400 text-center">
          Powered by Base Pay
        </div>
      </CardContent>
    </Card>
  );
}
