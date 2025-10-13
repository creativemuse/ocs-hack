'use client';

import { useState, useCallback, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { useSessionToken } from '@/hooks/useSessionToken';
import { useUSDCBalance } from '@/hooks/useUSDCBalance';
import { useTriviaContract } from '@/hooks/useTriviaContract';
import { useAccount } from 'wagmi';
import { generateFundingUrl, clearBrowserCache } from '@/lib/utils/funding';
import TrialStatusDisplay from './TrialStatusDisplay';
import GamePayment from './GamePayment';
import WalletWithBalance from '@/components/wallet/WalletWithBalance';
import WalletDebugInfo from '@/components/debug/WalletDebugInfo';
import PaymasterTest from '@/components/debug/PaymasterTest';
import SponsoredTransactionExample from '@/components/transaction/SponsoredTransactionExample';
import { Gamepad2, Crown, Coins, Play, DollarSign, AlertCircle, CheckCircle } from 'lucide-react';
import { Wallet, ConnectWallet, WalletDropdown, WalletDropdownDisconnect, WalletDropdownFundLink } from '@coinbase/onchainkit/wallet';
import { Avatar, Name, Address, Identity, EthBalance } from '@coinbase/onchainkit/identity';
import { Transaction, TransactionButton, TransactionSponsor, TransactionStatus, TransactionStatusLabel, TransactionStatusAction } from '@coinbase/onchainkit/transaction';
import type { LifecycleStatus } from '@coinbase/onchainkit/transaction';
import { createPaidGameCalls, createTrialGameCalls } from '@/lib/transaction/paidGameCalls';
import { base } from 'wagmi/chains';
import { parseTransactionError, logTransactionError, type TransactionError, type ErrorContext } from '@/lib/utils/errorHandling';
import TransactionErrorDisplay from '@/components/ui/TransactionErrorDisplay';
import { TRIVIA_CONTRACT_ADDRESS } from '@/lib/blockchain/contracts';

interface GameEntryProps {
  onGameStart: (options: { isTrial: boolean }) => void;
  entryToken?: string | null;
  className?: string;
  playerModeChoice?: 'trial' | 'paid';
}

export default function GameEntry({ onGameStart, entryToken, className = '', playerModeChoice = 'trial' }: GameEntryProps) {
  console.log('GameEntry received playerModeChoice:', playerModeChoice);
  const { address, isConnected } = useAccount();
  const { trialStatus, isLoading: trialLoading, incrementTrialGame } = useTrialStatus(address, entryToken || undefined);
  const { getSessionToken, isLoading: sessionLoading, error: sessionError } = useSessionToken();
  const { balance, hasEnoughForEntry, isLoading: balanceLoading, error: balanceError } = useUSDCBalance();
  const { 
    sessionActive, 
    sessionInfo, 
    contractOwner,
    startSession, 
    checkSessionStatus, 
    ensureActiveSession,
    isStartingSession,
    error: contractError 
  } = useTriviaContract(true, false); // Sessions now start automatically
  const [showPayment, setShowPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionError, setTransactionError] = useState<TransactionError | null>(null);
  const [fundingUrl, setFundingUrl] = useState<string | null>(null);
  const [fundingSuccess, setFundingSuccess] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isFundingUrlGenerating, setIsFundingUrlGenerating] = useState(false);

  // Auto-generate funding URL with CDP session token when address is available
  useEffect(() => {
    const generateInitialFundingUrl = async () => {
      if (!address || fundingUrl || isFundingUrlGenerating) return;
      
      try {
        setIsFundingUrlGenerating(true);
        console.log('🔄 Auto-generating CDP funding URL with session token for:', address);
        
        // Clear browser cache for fresh token
        await clearBrowserCache();
        
        // Generate fresh session token
        const sessionToken = await getSessionToken(address);
        console.log('✅ CDP session token generated:', sessionToken.substring(0, 20) + '...');
        
        // Generate funding URL with session token
        const url = generateFundingUrl({
          walletAddress: address,
          sessionToken: sessionToken
        });
        
        console.log('✅ CDP funding URL ready for onramp');
        setFundingUrl(url);
        setError(null);
      } catch (err) {
        console.error('❌ Failed to generate CDP funding URL:', err);
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(`Failed to initialize onramp: ${errorMessage}`);
      } finally {
        setIsFundingUrlGenerating(false);
      }
    };

    generateInitialFundingUrl();
  }, [address, fundingUrl, isFundingUrlGenerating, getSessionToken]);

  // Handle transaction status updates
  const handleTransactionStatus = useCallback((status: LifecycleStatus) => {
    console.log('Transaction status:', status);
    
    if (status.statusName === 'success') {
      console.log('Paid game transaction successful!');
      setIsProcessingPayment(false);
      setTransactionError(null);
      setError(null);
      onGameStart({ isTrial: false });
    } else if (status.statusName === 'error') {
      setIsProcessingPayment(false);
      
      // Check if user cancelled/rejected the transaction
      const errorString = JSON.stringify(status.statusData || {});
      const isUserRejection = 
        errorString.includes('User rejected') ||
        errorString.includes('User cancelled') ||
        errorString.includes('Request denied') ||
        errorString.includes('UserRejectedRequestError') ||
        errorString.includes('"code":4001');
      
      if (isUserRejection) {
        console.log('ℹ️ User cancelled transaction - no error to display');
        // User cancelled - just reset state without showing error
        setTransactionError(null);
        setError(null);
        return;
      }
      
      // Only log errors if it's not a user rejection
      console.error('Transaction failed:', status.statusData);
      console.error('Full transaction status:', JSON.stringify(status, null, 2));
      
      // Check if error object is empty - this often means paymaster/bundler rejection
      const isEmptyError = !status.statusData || Object.keys(status.statusData).length === 0;
      
      if (isEmptyError) {
        console.error('⚠️ Empty error object detected - likely paymaster/bundler issue');
        console.error('Common causes:');
        console.error('1. Contracts not in paymaster allowlist');
        console.error('2. Paymaster out of funds');
        console.error('3. Smart wallet capabilities not supported');
        
        // Provide helpful error message
        const paymasterError: TransactionError = {
          code: 'PAYMASTER_ERROR',
          message: 'Transaction rejected by paymaster',
          userMessage: 'Unable to sponsor transaction. Please ensure contracts are allowlisted in CDP Dashboard.',
          recoverable: true,
          retryable: false,
          details: {
            suggestion: 'Check CDP Dashboard > Paymaster > Contract Allowlist',
            contracts: [
              'USDC: 0x833589fcd6edb6e08f4c7c32d4f71b54bda02913',
              `TriviaBattle: ${TRIVIA_CONTRACT_ADDRESS}`
            ],
            link: 'https://portal.cdp.coinbase.com/products/bundler-and-paymaster'
          }
        };
        
        setTransactionError(paymasterError);
        setError(paymasterError.userMessage);
        logTransactionError(paymasterError, {
          operation: 'paid_game_entry',
          contractAddress: TRIVIA_CONTRACT_ADDRESS,
          functionName: 'joinBattle',
          userAddress: address,
          chainId: base.id,
        }, { status, emptyError: true });
        return;
      }
      
      // Parse the error with enhanced handling
      const errorContext: ErrorContext = {
        operation: 'paid_game_entry',
        contractAddress: TRIVIA_CONTRACT_ADDRESS,
        functionName: 'joinBattle',
        userAddress: address,
        chainId: base.id,
      };
      
      const parsedError = parseTransactionError(status.statusData || {}, errorContext);
      logTransactionError(parsedError, errorContext, { status });
      
      setTransactionError(parsedError);
      setError(parsedError.userMessage);
    }
  }, [onGameStart, address]);

  const handleStartGame = async () => {
    console.log('Game start requested:', { playerModeChoice, isConnected, address, hasEnoughForEntry, balance });
    console.log('Trial status:', trialStatus);
    console.log('Player mode choice:', playerModeChoice);
    
    if (playerModeChoice === 'trial' && trialStatus.isTrialActive) {
      // Trial player - start game immediately
      console.log('Starting trial game');
      await incrementTrialGame();
      onGameStart({ isTrial: true });
    } else if (playerModeChoice === 'paid') {
      // Paid player - check if wallet is connected
      if (!address || !isConnected) {
        setError('Please connect your wallet to play in Paid Mode');
        return;
      }
      
      // Check if user has enough USDC
      if (!hasEnoughForEntry) {
        setError('Insufficient USDC balance. Please add funds to continue.');
        return;
      }
      
      // Start paid game with smart contract interaction
      await handlePaidGameEntry();
    } else {
      // Trial exhausted or other case - show payment flow
      setShowPayment(true);
    }
  };

  const handlePaidGameEntry = async () => {
    if (!address) {
      setError('Wallet not connected. Please reconnect your wallet.');
      return;
    }
    
    if (!isConnected) {
      setError('Wallet connection lost. Please reconnect your wallet.');
      return;
    }
    
    if (!hasEnoughForEntry) {
      setError('Insufficient USDC balance. Please add funds to continue.');
      return;
    }
    
    console.log('Starting paid game entry process for wallet:', address);
    console.log('USDC Balance:', balance, 'Has enough:', hasEnoughForEntry);
    setIsProcessingPayment(true);
    setError(null);

    try {
      console.log('Starting paid game entry - session will be created automatically by the contract...');
      // The contract now automatically starts sessions when players join
      // No need for manual session management
      
      // The actual game start will be handled by the transaction success callback
      console.log('Proceeding with paid game entry...');
      
    } catch (error) {
      console.error('Error in paid game entry:', error);
      setError(error instanceof Error ? error.message : 'Failed to start game session');
      setIsProcessingPayment(false);
    }
  };

  const handlePaymentSuccess = () => {
    setError(null);
    setShowPayment(false);
    onGameStart({ isTrial: false });
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleRetryTransaction = () => {
    setTransactionError(null);
    setError(null);
    setIsProcessingPayment(true);
    // The transaction will be retried automatically by the Transaction component
  };

  const handleDismissError = () => {
    setTransactionError(null);
    setError(null);
    setIsProcessingPayment(false);
  };

  const handleBackToEntry = () => {
    setShowPayment(false);
    setError(null);
  };

  // Manual refresh of funding URL (if needed)
  const handleRefreshFundingUrl = async () => {
    if (!address) return;
    
    try {
      setIsFundingUrlGenerating(true);
      console.log('🔄 Manually refreshing CDP funding URL...');
      
      // Clear existing URL and cache
      setFundingUrl(null);
      setError(null);
      await clearBrowserCache();
      
      // Generate fresh session token
      const sessionToken = await getSessionToken(address);
      console.log('✅ Fresh CDP session token generated:', sessionToken.substring(0, 20) + '...');
      
      // Generate new funding URL
      const url = generateFundingUrl({
        walletAddress: address,
        sessionToken: sessionToken
      });
      
      console.log('✅ New CDP funding URL generated');
      setFundingUrl(url);
      setFundingSuccess(true);
      setTimeout(() => setFundingSuccess(false), 2000);
    } catch (err) {
      console.error('❌ Failed to refresh funding URL:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to refresh onramp URL: ${errorMessage}`);
    } finally {
      setIsFundingUrlGenerating(false);
    }
  };


  if (trialLoading) {
    return (
      <div className={`space-y-4 ${className}`}>
        <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30">
          <CardContent className="p-4">
            <div className="animate-pulse space-y-3">
              <div className="h-4 bg-purple-500/20 rounded w-3/4"></div>
              <div className="h-3 bg-blue-500/20 rounded w-1/2"></div>
            </div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30">
          <CardContent className="p-6">
            <div className="animate-pulse space-y-4">
              <div className="h-6 bg-purple-500/20 rounded w-1/2"></div>
              <div className="h-4 bg-blue-500/20 rounded w-3/4"></div>
              <div className="h-10 bg-gray-500/20 rounded"></div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  if (showPayment) {
    return (
      <div className={`space-y-4 ${className}`}>
        <GamePayment
          onPaymentComplete={handlePaymentSuccess}
          onBack={handleBackToEntry}
        />
        {error && (
          <Card className="bg-red-900/20 border-red-500/30">
            <CardContent className="p-4">
              <div className="text-red-400 text-sm text-center">{error}</div>
            </CardContent>
          </Card>
        )}
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Show trial status only if player chose trial mode */}
      {playerModeChoice === 'trial' && (
        <TrialStatusDisplay walletAddress={address} entryToken={entryToken} />
      )}

      
      <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-white">
            {playerModeChoice === 'trial' ? (
              <>
                <Gamepad2 className="h-5 w-5 text-green-400" />
                Trial Mode
              </>
            ) : playerModeChoice === 'paid' ? (
              <>
                <Crown className="h-5 w-5 text-yellow-400" />
                Paid Mode
              </>
            ) : (
              <>
                <Crown className="h-5 w-5 text-yellow-400" />
                Normal Mode
              </>
            )}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {playerModeChoice === 'trial' && trialStatus.isTrialActive ? (
            <>
              <div className="text-sm text-gray-300 text-center">
                You have <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30">
                  {trialStatus.gamesRemaining}
                </Badge> free plays remaining!
              </div>
              <Button
                onClick={handleStartGame}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white cursor-pointer"
              >
                <Play className="h-4 w-4 mr-2" />
                Start Free Game
              </Button>
            </>
          ) : playerModeChoice === 'paid' ? (
            <>
              {/* Enhanced Wallet Component with CDP Onramp Integration */}
              <div className="mb-4 flex justify-center">
                <Wallet>
                  <ConnectWallet 
                    className="bg-gradient-to-r from-blue-600 to-purple-600 hover:from-blue-500 hover:to-purple-500"
                  >
                    <Avatar className="h-6 w-6" />
                    <Name />
                  </ConnectWallet>
                  <WalletDropdown>
                    <Identity className="px-4 pt-3 pb-2" hasCopyAddressOnClick>
                      <Avatar />
                      <Name />
                      <Address className="text-gray-400" />
                      <EthBalance />
                    </Identity>
                    <WalletDropdownFundLink 
                      text="Add USDC"
                      fundingUrl={fundingUrl || undefined}
                      openIn="popup"
                      popupSize="md"
                      rel="noopener noreferrer"
                      className="text-gray-800 dark:text-gray-300 font-semibold hover:text-gray-900 dark:hover:text-white hover:bg-gray-100 dark:hover:bg-gray-700 transition-all duration-200 border-l-4 border-blue-500"
                    />
                    <WalletDropdownDisconnect />
                  </WalletDropdown>
                </Wallet>
              </div>

              {/* CDP Onramp Status */}
              {/* <div className="mb-4 p-3 bg-blue-900/20 border border-blue-500/30 rounded-lg">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`w-2 h-2 rounded-full ${fundingUrl ? 'bg-green-500' : isFundingUrlGenerating ? 'bg-yellow-500 animate-pulse' : 'bg-gray-500'}`}></div>
                    <span className="text-xs text-gray-300">
                      {isFundingUrlGenerating ? 'Initializing CDP Onramp...' : fundingUrl ? 'CDP Onramp Ready' : 'CDP Onramp Not Ready'}
                    </span>
                  </div>
                  {fundingUrl && !isFundingUrlGenerating && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={handleRefreshFundingUrl}
                      className="text-xs h-6 px-2 text-gray-300"
                    >
                      Refresh
                    </Button>
                  )}
                </div>
                {fundingSuccess && (
                  <div className="mt-2 text-xs text-green-400">
                    ✅ Onramp URL updated successfully
                  </div>
                )}
              </div> */}

              {/* Debug Info - Remove in production */}
              {/* <WalletDebugInfo /> */}
              {/* <PaymasterTest /> */}
              {/* <SponsoredTransactionExample /> */}

              {/* USDC Purchase Info */}
              <div className="flex items-center justify-center gap-2 text-sm mb-4">
                <Coins className="h-4 w-4 text-yellow-400" />
                <span className="text-gray-300">Entry Fee: 1 USDC</span>
                <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30 ml-2">
                  Gasless
                </Badge>
              </div>

              {!address ? (
                <div className="text-center">
                  <div className="text-yellow-400 text-sm font-medium mb-2">
                    🔗 Wallet Required
                  </div>
                  <div className="text-xs text-gray-400">
                    Please connect your wallet above to continue
                  </div>
                </div>
              ) : (
                <>
                  {/* USDC Balance Status */}
                  <div className="mb-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2">
                        <DollarSign className="h-4 w-4 text-blue-400" />
                        <span className="text-sm text-gray-300">USDC Balance</span>
                      </div>
                      <div className="flex items-center gap-2">
                        {balanceLoading ? (
                          <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                        ) : hasEnoughForEntry ? (
                          <CheckCircle className="h-4 w-4 text-green-400" />
                        ) : (
                          <AlertCircle className="h-4 w-4 text-yellow-400" />
                        )}
                      </div>
                    </div>
                    <div className="text-lg font-bold text-white">
                      {balanceLoading ? '...' : balance.toFixed(2)} USDC
                    </div>
                    <div className="text-xs text-gray-400 mt-1">
                      {hasEnoughForEntry ? 'Sufficient funds for entry' : 'Need 1 USDC to play'}
                    </div>
                  </div>

                  <div className="text-sm text-gray-300 text-center mb-4">
                    Ready to compete for rewards?
                  </div>
                  
                  {isProcessingPayment ? (
                    <div className="space-y-4">
                      <Transaction
                        chainId={base.id}
                        calls={createPaidGameCalls()}
                        isSponsored={true}
                        onStatus={handleTransactionStatus}
                      />
                      <Button
                        onClick={() => setIsProcessingPayment(false)}
                        variant="outline"
                        className="w-full"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={handlePaidGameEntry}
                      disabled={!hasEnoughForEntry}
                      className="w-full !bg-gradient-to-r !from-yellow-500 !to-orange-500 hover:!from-yellow-400 hover:!to-orange-400 !text-white border-0 shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: 'linear-gradient(to right, #eab308, #f97316)' }}
                    >
                      <Play className="h-4 w-4 mr-2" />
                      Start Paid Game
                    </Button>
                  )}
                  
                  {/* Enhanced Error Display */}
                  {transactionError && (
                    <div className="mt-3">
                      <TransactionErrorDisplay
                        error={transactionError}
                        onRetry={handleRetryTransaction}
                        onDismiss={handleDismissError}
                        showDetails={true}
                      />
                    </div>
                  )}
                  
                  {/* Fallback Error Display for non-transaction errors */}
                  {error && !transactionError && (
                    <div className="mt-3 p-3 bg-red-900/20 border border-red-500/30 rounded-lg">
                      <div className="text-red-400 text-sm text-center mb-2">
                        {error}
                      </div>
                      {error?.includes('wallet') && (
                        <div className="text-center">
                          <button
                            onClick={() => window.location.reload()}
                            className="text-xs text-blue-400 hover:text-blue-300 underline"
                          >
                            Try reconnecting your wallet
                          </button>
                        </div>
                      )}
                    </div>
                  )}
                </>
              )}
            </>
          ) : (
            <>
              <div className="text-sm text-gray-300 text-center">
                Ready to compete for rewards?
              </div>
              <div className="flex items-center justify-center gap-2 text-sm mb-4">
                <Coins className="h-4 w-4 text-yellow-400" />
                <span className="text-gray-300">Entry Fee: 1 USDC</span>
                <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30 ml-2">
                  Gasless
                </Badge>
              </div>
              <Button
                onClick={handleStartGame}
                className="w-full !bg-gradient-to-r !from-yellow-500 !to-orange-500 hover:!from-yellow-400 hover:!to-orange-400 !text-white border-0 shadow-lg cursor-pointer"
                style={{ background: 'linear-gradient(to right, #eab308, #f97316)' }}
              >
                <Play className="h-4 w-4 mr-2" />
                Start Normal Game
              </Button>
            </>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
