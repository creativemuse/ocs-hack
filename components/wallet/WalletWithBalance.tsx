'use client';

import { useState } from 'react';
import { Wallet, ConnectWallet, WalletDropdown, WalletDropdownDisconnect } from '@coinbase/onchainkit/wallet';
import { Avatar, Name, Address, Identity } from '@coinbase/onchainkit/identity';
import { cn, text as dsText, pressable } from '@coinbase/onchainkit/theme';
import { useUSDCBalance } from '@/hooks/useUSDCBalance';
import { useAccount } from 'wagmi';
import { useOneClickBuy } from '@/hooks/useOneClickBuy';
import { Coins, DollarSign, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

interface WalletWithBalanceProps {
  onFundingSuccess?: () => void;
  className?: string;
}

export default function WalletWithBalance({ onFundingSuccess, className = '' }: WalletWithBalanceProps) {
  const { address, isConnected } = useAccount();
  const { balance, hasEnoughForEntry, isLoading, error, refreshBalance } = useUSDCBalance();
  const { generateBuyUrl, openOnramp, isLoading: buyLoading, error: buyError, quoteData } = useOneClickBuy();
  const [fundingSuccess, setFundingSuccess] = useState(false);

  const handleAddFunds = async () => {
    if (!address) return;
    
    try {
      console.log('Generating One-Click-Buy URL for wallet:', address);
      
      // Generate buy URL with $5 USDC preset on Base
      const result = await generateBuyUrl(address, {
        paymentAmount: '5.00',
        paymentCurrency: 'USD',
        purchaseCurrency: 'USDC',
        purchaseNetwork: 'base',
        paymentMethod: 'CARD',
        country: 'US',
      });
      
      if (result?.url) {
        console.log('Opening One-Click-Buy URL');
        
        // Open the onramp URL
        openOnramp(result.url);
        
        // Show success feedback
        setFundingSuccess(true);
        setTimeout(() => {
          setFundingSuccess(false);
          onFundingSuccess?.();
          refreshBalance(); // Refresh balance after funding
        }, 2000);
      }
    } catch (err) {
      console.error('Failed to generate One-Click-Buy URL:', err);
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

      {/* Wallet Component */}
      <div className="flex justify-center">
        <Wallet>
          <ConnectWallet>
            <Avatar className="h-6 w-6" />
            <Name />
          </ConnectWallet>
          <WalletDropdown>
            <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
              <Avatar />
              <Name />
              {/* Address shown only in wallet dropdown for wallet management - OnchainKit Name handles Basename display above */}
              <Address className="text-gray-400 text-xs" />
            </Identity>
            
            {/* USDC Balance in Dropdown */}
            {isConnected && (
              <div className="px-3 py-2 border-t border-gray-200/10">
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2">
                    <Coins className="h-3 w-3 text-yellow-400" />
                    <span className="text-gray-300">USDC Balance</span>
                  </div>
                  <span className="font-medium text-white">
                    {isLoading ? '...' : formatUSDCBalance(balance)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs mt-1">
                  <span className="text-gray-400">Entry Fee: 1 USDC</span>
                  <Badge 
                    variant={hasEnoughForEntry ? "default" : "destructive"}
                    className={`text-xs ${hasEnoughForEntry ? "bg-green-500/20 text-green-400" : "bg-red-500/20 text-red-400"}`}
                  >
                    {hasEnoughForEntry ? 'Ready' : 'Need Funds'}
                  </Badge>
                </div>
              </div>
            )}
            
            {/* Add Funds Button */}
            {isConnected && (
              <button
                type="button"
                onClick={handleAddFunds}
                disabled={buyLoading}
                className={cn(
                  pressable.default,
                  'text-ock-foreground',
                  'relative flex w-full items-center px-4 pt-3 pb-4',
                  buyLoading && 'opacity-50 cursor-not-allowed'
                )}
              >
                <div className="absolute left-4 flex h-[1.125rem] w-[1.125rem] items-center justify-center">
                  {buyLoading ? (
                    <Loader2 className="h-full w-full animate-spin" />
                  ) : fundingSuccess ? (
                    <CheckCircle className="h-full w-full text-green-500" />
                  ) : (
                    <Coins className="h-full w-full" />
                  )}
                </div>
                <span className={cn(dsText.body, 'pl-6')}>
                  {buyLoading ? 'Opening funding...' : fundingSuccess ? 'Funding opened!' : 'Add USDC Funds'}
                </span>
              </button>
            )}
            
            {/* Error Messages */}
            {buyError && (
              <div className="px-3 py-2 text-xs text-red-400">
                {buyError}
              </div>
            )}
            
            <WalletDropdownDisconnect />
          </WalletDropdown>
        </Wallet>
      </div>
    </div>
  );
}
