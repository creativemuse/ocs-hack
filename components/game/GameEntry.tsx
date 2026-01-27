'use client';

import { useState, useCallback, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { useSessionToken } from '@/hooks/useSessionToken';
import { useUSDCBalance } from '@/hooks/useUSDCBalance';
import { useTriviaContract } from '@/hooks/useTriviaContract';
import { usePaidGameEntry } from '@/hooks/usePaidGameEntry';
import { useAccount } from 'wagmi';
import { generateFundingUrl, clearBrowserCache } from '@/lib/utils/funding';
import TrialStatusDisplay from './TrialStatusDisplay';
import GamePayment from './GamePayment';
import SessionCountdown from './SessionCountdown';
import { Gamepad2, Crown, Coins, Play, DollarSign, AlertCircle, CheckCircle, Zap } from 'lucide-react';
import { Wallet, ConnectWallet, WalletDropdown, WalletDropdownDisconnect, WalletDropdownFundLink } from '@coinbase/onchainkit/wallet';
import { Avatar, Name, Address, Identity, EthBalance } from '@coinbase/onchainkit/identity';
import { base } from 'wagmi/chains';
import { parseTransactionError, logTransactionError, type TransactionError, type ErrorContext } from '@/lib/utils/errorHandling';
import TransactionErrorDisplay from '@/components/ui/TransactionErrorDisplay';
import { TRIVIA_CONTRACT_ADDRESS } from '@/lib/blockchain/contracts';

interface GameEntryProps {
  onGameStart: (options: { isTrial: boolean; transactionHash?: string }) => void;
  entryToken?: string | null;
  className?: string;
  playerModeChoice?: 'trial' | 'paid';
}

export default function GameEntry({ onGameStart, entryToken, className = '', playerModeChoice = 'trial' }: GameEntryProps) {
  console.log('GameEntry received playerModeChoice:', playerModeChoice);
  const { address, isConnected } = useAccount();
  
  // Clear any existing errors on component mount
  useEffect(() => {
    setError(null);
    setTransactionError(null);
  }, []);
  
  const { trialStatus, isLoading: trialLoading, incrementTrialGame } = useTrialStatus(address, entryToken || undefined);
  const { getSessionToken, isLoading: sessionLoading, error: sessionError } = useSessionToken();
  const { balance, hasEnoughForEntry, isLoading: balanceLoading, error: balanceError } = useUSDCBalance();
  const { 
    sessionActive, 
    sessionCounter,
    isSessionActive,
    currentSessionPrizePool,
    contractOwner,
    startSession, 
    checkSessionStatus, 
    ensureActiveSession,
    isStartingSession,
    error: contractError 
  } = useTriviaContract(true, false); // Sessions now start automatically
  
  // New paymaster implementation
  const { 
    joinGameUniversal, 
    result: gameResult, 
    error: gameError, 
    isSmartAccount, 
    isEOA,
    currentStep
  } = usePaidGameEntry();
  
  const [showPayment, setShowPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionError, setTransactionError] = useState<TransactionError | null>(null);
  const [fundingUrl, setFundingUrl] = useState<string | null>(null);
  const [fundingSuccess, setFundingSuccess] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isFundingUrlGenerating, setIsFundingUrlGenerating] = useState(false);

  // Clear errors when wallet connects
  useEffect(() => {
    if (address) {
      setError(null);
      setTransactionError(null);
    }
  }, [address]);

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

  // Handle game result updates
  useEffect(() => {
    if (gameResult.success) {
      console.log('✅ Paid game transaction successful!', { transactionHash: gameResult.transactionHash });
      setIsProcessingPayment(false);
      setTransactionError(null);
      setError(null);
      onGameStart({ isTrial: false, transactionHash: gameResult.transactionHash });
    } else if (gameResult.error) {
      setIsProcessingPayment(false);
      console.error('Transaction failed:', gameResult.error);
      
      const paymasterError: TransactionError = {
        code: 'TRANSACTION_ERROR',
        message: gameResult.error,
        userMessage: gameResult.error,
        recoverable: true,
        retryable: true,
        details: {
          suggestion: isSmartAccount ? 'Smart Account transaction failed' : 'EOA transaction failed',
          accountType: isSmartAccount ? 'Smart Account' : 'EOA',
          paymasterSupported: isSmartAccount
        }
      };
      
      setTransactionError(paymasterError);
      setError(paymasterError.userMessage);
    }
  }, [gameResult, onGameStart, isSmartAccount]);

  // Handle game errors - only show errors when processing payment
  useEffect(() => {
    if (gameError && isProcessingPayment) {
      setIsProcessingPayment(false);
      console.error('Game entry error:', gameError);
      
      const errorMessage = gameError.message || 'Unknown error occurred';
      setError(errorMessage);
    }
  }, [gameError, isProcessingPayment]);

  const handleStartGame = async () => {
    console.log('Game start requested:', { playerModeChoice, isConnected, address, hasEnoughForEntry, balance });
    console.log('Trial status:', trialStatus);
    console.log('Player mode choice:', playerModeChoice);
    
    // Prevent trial mode if trial is exhausted
    if (playerModeChoice === 'trial' && trialStatus.gamesRemaining === 0) {
      setError('Your free trial has been used. Please switch to Paid Mode.');
      return;
    }
    
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
    console.log('Account type:', isSmartAccount ? 'Smart Account (Paymaster)' : 'EOA');
    setIsProcessingPayment(true);
    setError(null);
    // Step will be set by the hook during transaction execution

    try {
      await joinGameUniversal();
    } catch (err) {
      console.error('Failed to join game:', err);
      setIsProcessingPayment(false);
      
      // Check for execution reverted errors (contract revert)
      if (err instanceof Error && (
        err.message.includes('execution reverted') ||
        err.message.includes('reverted') ||
        err.message.includes('revert')
      )) {
        // Check for specific revert reasons
        if (err.message.includes('SessionNotActive') || err.message.includes('session not active')) {
          setError('Game session is not active. Please wait for a new session to start.');
        } else if (err.message.includes('AlreadyParticipated') || err.message.includes('already participated')) {
          setError('You have already joined this game session. Please wait for the next session.');
        } else if (err.message.includes('InsufficientEntryFee') || err.message.includes('insufficient')) {
          setError('Insufficient USDC balance or allowance. Please check your balance and try again.');
        } else {
          setError(`Transaction reverted: ${err.message}. This usually means the contract requirements weren't met. Please try again or contact support if the issue persists.`);
        }
      }
      // Check for popup blocker error (common with Base Account)
      else if (err instanceof Error && (
        err.message.includes('Popup window was blocked') ||
        err.message.includes('popup') ||
        err.message.includes('blocked')
      )) {
        setError('Popup was blocked. Please allow popups for this site and try again. If using Base Account, you may need to approve the popup permission when prompted.');
      } 
      // Check if it's a user rejection
      else if (err instanceof Error && (err.message.includes('User rejected') || err.message.includes('User cancelled'))) {
        setError('Transaction was cancelled. Please try again when ready.');
      } 
      // Check for blockchain game creation error
      else if (err instanceof Error && err.message.includes('Failed to create blockchain game')) {
        setError(`Unable to start game: ${err.message}. Please try again or contact support.`);
      } 
      // Generic error
      else {
        const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
        setError(`Failed to join game: ${errorMessage}. Please try again.`);
      }
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

      {/* Session countdown - shows when next session can start */}
      <SessionCountdown />
      
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
                      {/* Address shown only in wallet dropdown for wallet management - OnchainKit Name handles Basename display above */}
                      <Address className="text-gray-400 text-xs" />
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
              

              {/* Account Type and Gas Sponsorship Info - Only show when wallet is connected */}
              {address && (
                <div className="mb-4 p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <Zap className="h-4 w-4 text-blue-400" />
                      <span className="text-sm text-gray-300">Account Type</span>
                    </div>
                    <Badge 
                      variant="secondary" 
                      className={isSmartAccount 
                        ? "bg-blue-500/20 text-blue-400 border-blue-500/30" 
                        : "bg-gray-500/20 text-gray-400 border-gray-500/30"
                      }
                    >
                      {isSmartAccount ? 'Smart Account' : 'EOA'}
                    </Badge>
                  </div>
                  <div className="text-xs text-gray-400">
                    {isSmartAccount 
                      ? '✅ Gas sponsored by Creative Organization DAO' 
                      : '⚠️ You will pay gas fees'
                    }
                  </div>
                </div>
              )}

              {/* USDC Purchase Info */}
              <div className="flex items-center justify-center gap-2 text-sm mb-4">
                <Coins className="h-4 w-4 text-yellow-400" />
                <span className="text-gray-300">Entry Fee: 1 USDC</span>
                {address && (
                  <Badge variant="secondary" className="bg-green-500/20 text-green-400 border-green-500/30 ml-2">
                    {isSmartAccount ? 'Gasless' : 'Gas Required'}
                  </Badge>
                )}
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
                  {/* Enhanced Balance Display - Show both ETH and USDC for EOA, USDC only for Smart Accounts */}
                  <div className="mb-4 space-y-3">
                    {/* ETH Balance - Only show for EOA wallets */}
                    {isEOA && (
                      <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center gap-2">
                            <div className="w-5 h-5 rounded-full flex items-center justify-center">
                              <Image src="/tokens/eth-logo.svg" alt="ETH" width={20} height={20} />
                            </div>
                            <span className="text-sm text-gray-300">ETH Balance</span>
                          </div>
                          <div className="flex items-center gap-2">
                            {balanceLoading ? (
                              <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white"></div>
                            ) : (
                              <CheckCircle className="h-4 w-4 text-blue-400" />
                            )}
                          </div>
                        </div>
                        <div className="text-lg font-bold text-white">
                          <EthBalance address={address} />
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          For gas fees
                        </div>
                      </div>
                    )}

                    {/* USDC Balance - Always show */}
                    <div className="p-3 bg-gray-800/50 rounded-lg border border-gray-700/50">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                          <Image src="/tokens/usdc-logo.svg" alt="USDC" width={20} height={20} />
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
                  </div>

                  <div className="text-sm text-gray-300 text-center mb-4">
                    Ready to compete for rewards?
                  </div>
                  
                  {isProcessingPayment ? (
                    <div className="space-y-4">
                      <div className="p-4 bg-yellow-500/10 border border-yellow-500/30 rounded-lg space-y-3">
                        {/* Transaction Step Display */}
                        {isSmartAccount ? (
                          // Smart Account: Batched transaction
                          <>
                            <div className="flex items-center justify-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400"></div>
                              <span className="text-yellow-400 text-sm font-medium">
                                {currentStep === 'batching_transaction' 
                                  ? 'Batching transaction (approval + payment)...'
                                  : currentStep === 'processing_paymaster'
                                  ? 'Processing with Paymaster...'
                                  : 'Processing batched transaction...'}
                              </span>
                            </div>
                            <div className="text-xs text-gray-400 text-center space-y-1">
                              <div className="flex items-center justify-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${currentStep === 'batching_transaction' || currentStep === 'processing_paymaster' || currentStep === 'complete' ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                                <span>Approving USDC & Joining battle (batched)</span>
                              </div>
                            </div>
                          </>
                        ) : (
                          // EOA: Sequential transactions
                          <>
                            <div className="flex items-center justify-center gap-2">
                              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-yellow-400"></div>
                              <span className="text-yellow-400 text-sm font-medium">
                                {currentStep === 'approving_usdc' 
                                  ? 'Step 1/2: Approving USDC spending...'
                                  : currentStep === 'joining_battle'
                                  ? 'Step 2/2: Joining battle...'
                                  : 'Processing transaction...'}
                              </span>
                            </div>
                            <div className="text-xs text-gray-400 text-center space-y-1">
                              <div className="flex items-center justify-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${currentStep === 'approving_usdc' || currentStep === 'joining_battle' || currentStep === 'complete' ? 'bg-green-400' : 'bg-gray-500'}`}></div>
                                <span>Step 1: Approve USDC</span>
                              </div>
                              <div className="flex items-center justify-center gap-2">
                                <div className={`w-2 h-2 rounded-full ${currentStep === 'joining_battle' || currentStep === 'complete' ? 'bg-green-400' : currentStep === 'approving_usdc' ? 'bg-yellow-400 animate-pulse' : 'bg-gray-500'}`}></div>
                                <span>Step 2: Join battle</span>
                              </div>
                            </div>
                          </>
                        )}
                      </div>
                      <Button
                        onClick={() => {
                          setIsProcessingPayment(false);
                        }}
                        variant="outline"
                        className="w-full border-red-400 text-white hover:bg-red-500/10 cursor-pointer"
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
                      {isSmartAccount ? 'Start Gasless Game' : 'Start Paid Game'}
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
                      {error?.includes('Popup') || error?.includes('popup') || error?.includes('blocked') ? (
                        <div className="space-y-2">
                          <div className="text-xs text-gray-400 text-center">
                            If you're using Base Account, please:
                          </div>
                          <ol className="text-xs text-gray-300 list-decimal list-inside space-y-1">
                            <li>Click "Try again" when the popup permission prompt appears</li>
                            <li>Allow popups for this site in your browser settings</li>
                            <li>Then click "Start Paid Game" again</li>
                          </ol>
                          <div className="text-center pt-2">
                            <Button
                              onClick={handlePaidGameEntry}
                              size="sm"
                              variant="outline"
                              className="border-blue-500 text-blue-400 hover:bg-blue-500/10"
                            >
                              Try Again
                            </Button>
                          </div>
                        </div>
                      ) : error?.includes('wallet') ? (
                        <div className="text-center">
                          <button
                            onClick={() => window.location.reload()}
                            className="text-xs text-blue-400 hover:text-blue-300 underline"
                          >
                            Try reconnecting your wallet
                          </button>
                        </div>
                      ) : null}
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
