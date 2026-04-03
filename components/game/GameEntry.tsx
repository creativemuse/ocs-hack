'use client';

import { useState, useCallback, useEffect, useMemo, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useTrialStatus } from '@/hooks/useTrialStatus';
import { useSessionToken } from '@/hooks/useSessionToken';
import { useUSDCBalance } from '@/hooks/useUSDCBalance';
import { useTriviaContract } from '@/hooks/useTriviaContract';
import { useBaseAccount } from '@/hooks/useBaseAccount';
import { SignInWithBaseButton } from '@base-org/account-ui/react';
import { generateFundingUrl, clearBrowserCache } from '@/lib/utils/funding';
import TrialStatusDisplay from './TrialStatusDisplay';
import GamePayment from './GamePayment';
import WalletWithBalance from '@/components/wallet/WalletWithBalance';
import SubAccountDisplay from '@/components/base-account/SubAccountDisplay';
import GaslessBadge from '@/components/base-account/GaslessBadge';
import { Gamepad2, Crown, Coins, Play, DollarSign, AlertCircle, CheckCircle, Loader2 } from 'lucide-react';
// Removed OnchainKit transaction imports - using Base Account native methods instead
import { createBaseAccountPaidGameCalls } from '@/lib/transaction/baseAccountCalls';
import BaseAccountTransaction, {
  type BaseAccountTransactionHandle,
} from '@/components/base-account/BaseAccountTransaction';
import { parseTransactionError, logTransactionError, type TransactionError, type ErrorContext } from '@/lib/utils/errorHandling';
import TransactionErrorDisplay from '@/components/ui/TransactionErrorDisplay';
import { TRIVIA_CONTRACT_ADDRESS } from '@/lib/blockchain/contracts';
import { base } from 'viem/chains';
import type { GameStartOptions, PlayerModeChoice } from '@/types/game';
import type { BaseAccountTxStatusExtras } from '@/components/base-account/BaseAccountTransaction';

interface GameEntryProps {
  onGameStart: (options: GameStartOptions) => void | Promise<void>;
  entryToken?: string | null;
  className?: string;
  playerModeChoice?: PlayerModeChoice;
  joinStartError?: string | null;
  onDismissJoinStartError?: () => void;
}

export default function GameEntry({
  onGameStart,
  entryToken,
  className = '',
  playerModeChoice = 'trial',
  joinStartError,
  onDismissJoinStartError,
}: GameEntryProps) {
  const isPaidMode = playerModeChoice === 'paid_solo' || playerModeChoice === 'paid_multiplayer';
  console.log('GameEntry received playerModeChoice:', playerModeChoice);
  const { address, universalAddress, isConnected } = useBaseAccount();
  const { trialStatus, isLoading: trialLoading, incrementTrialGame } = useTrialStatus(address || undefined, entryToken || undefined);
  const { getSessionToken, isLoading: sessionLoading, error: sessionError } = useSessionToken();
  const { balance, hasEnoughForEntry, isLoading: balanceLoading, error: balanceError } = useUSDCBalance();
  useTriviaContract(true);
  const [showPayment, setShowPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionError, setTransactionError] = useState<TransactionError | null>(null);
  const [fundingUrl, setFundingUrl] = useState<string | null>(null);
  const [fundingSuccess, setFundingSuccess] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [paymentFlowId, setPaymentFlowId] = useState(0);
  const [isFundingUrlGenerating, setIsFundingUrlGenerating] = useState(false);
  const paidGameCalls = useMemo(() => createBaseAccountPaidGameCalls(), []);
  const paidTxRef = useRef<BaseAccountTransactionHandle>(null);

  useEffect(() => {
    if (!isProcessingPayment) return;
    const t = window.setTimeout(() => {
      paidTxRef.current?.submit();
    }, 0);
    return () => window.clearTimeout(t);
  }, [isProcessingPayment, paymentFlowId]);

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
  const handleTransactionStatus = useCallback((
    status: 'pending' | 'success' | 'error',
    message?: string,
    extras?: BaseAccountTxStatusExtras
  ) => {
    console.log('Transaction status:', status, message, extras);
    
    if (status === 'success') {
      console.log('Paid game transaction successful!');
      setIsProcessingPayment(false);
      setIsStartingGame(false);
      setTransactionError(null);
      setError(null);
      void onGameStart({
        isTrial: false,
        paidTxHash: extras?.lastTxHash,
        playerMode: playerModeChoice,
        walletUniversalAddress: universalAddress ?? undefined,
      });
    } else if (status === 'error') {
      setIsProcessingPayment(false);
      setIsStartingGame(false);
      
      // Check if user cancelled/rejected the transaction
      const isUserRejection = 
        message?.includes('rejected by user') ||
        message?.includes('User rejected') ||
        message?.includes('User cancelled') ||
        message?.includes('Request denied') ||
        message?.includes('UserRejectedRequestError') ||
        message?.includes('code: 4001');
      
      if (isUserRejection) {
        console.log('ℹ️ User cancelled transaction - no error to display');
        // User cancelled - just reset state without showing error
        setTransactionError(null);
        setError(null);
        return;
      }
      
      // Only log errors if it's not a user rejection
      // Safely serialize error message to avoid BigInt issues
      const safeMessage = message || 'Unknown transaction error';
      console.error('Transaction failed:', safeMessage);

      const isAccountNonceError =
        safeMessage.includes('AA25') ||
        safeMessage.toLowerCase().includes('invalid account nonce');

      if (isAccountNonceError) {
        const nonceError: TransactionError = {
          code: 'AA25_INVALID_NONCE',
          message: 'Invalid smart account nonce',
          userMessage:
            'Your wallet is still finishing the USDC approval on-chain. Wait a few seconds, then tap Transact again to send the join step. Sponsored gas may require Coinbase Paymaster rules (e.g. Coinbase Verified User) in CDP.',
          recoverable: true,
          retryable: true,
          details: {
            suggestion:
              'If this keeps happening, confirm the first transaction succeeded in your wallet activity, then retry. Check Paymaster sponsorship rules in CDP.',
            link: 'https://portal.cdp.coinbase.com/products/bundler-and-paymaster',
          },
        };
        setTransactionError(nonceError);
        setError(nonceError.userMessage);
        logTransactionError(
          nonceError,
          {
            operation: 'paid_game_entry',
            contractAddress: TRIVIA_CONTRACT_ADDRESS,
            functionName: 'joinBattle',
            userAddress: address || undefined,
            chainId: base.id,
          },
          { message: safeMessage }
        );
        return;
      }

      // Check if error is paymaster/bundler related
      const isPaymasterError =
        safeMessage?.includes('paymaster') ||
        safeMessage?.includes('bundler') ||
        safeMessage?.includes('sponsor') ||
        safeMessage?.includes('allowlist') ||
        safeMessage?.includes('Transaction too large') ||
        safeMessage.toLowerCase().includes('attestation') ||
        safeMessage.includes('Verified User');
      
      if (isPaymasterError) {
        console.error('⚠️ Paymaster/bundler issue detected');
        console.error('Common causes:');
        console.error('1. Contracts not in paymaster allowlist');
        console.error('2. Paymaster out of funds');
        console.error('3. Smart wallet capabilities not supported');
        
        // Provide helpful error message
        const paymasterError: TransactionError = {
          code: 'PAYMASTER_ERROR',
          message: 'Transaction rejected by paymaster',
          userMessage:
            'Unable to sponsor gas. In CDP Bundler & Paymaster, confirm contract allowlists and any wallet rules (e.g. Coinbase Verified User attestation). You can also relax sponsorship rules for testing.',
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
          userAddress: address || undefined,
          chainId: base.id,
        }, { message: safeMessage, isPaymasterError: true });
        return;
      }
      
      // Parse the error with enhanced handling
      const errorContext: ErrorContext = {
        operation: 'paid_game_entry',
        contractAddress: TRIVIA_CONTRACT_ADDRESS,
        functionName: 'joinBattle',
        userAddress: address || undefined,
        chainId: base.id,
      };
      
      // Create a simple error object from the message
      const errorData = { message: safeMessage };
      const parsedError = parseTransactionError(errorData, errorContext);
      logTransactionError(parsedError, errorContext, { message: safeMessage });
      
      setTransactionError(parsedError);
      setError(parsedError.userMessage);
    }
  }, [onGameStart, address, playerModeChoice, universalAddress]);

  const handleStartGame = async () => {
    console.log('Game start requested:', { playerModeChoice, isConnected, address, hasEnoughForEntry, balance });
    console.log('Trial status:', trialStatus);
    console.log('Player mode choice:', playerModeChoice);

    setIsStartingGame(true);

    if (playerModeChoice === 'trial' && trialStatus.isTrialActive) {
      // Trial player - start game immediately
      console.log('Starting trial game');
      await incrementTrialGame();
      void onGameStart({ isTrial: true, playerMode: playerModeChoice });
    } else if (isPaidMode) {
      // Paid player - check if wallet is connected
      if (!address || !isConnected) {
        setError('Please connect your wallet to play in Paid Mode');
        setIsStartingGame(false);
        return;
      }

      // Check if user has enough USDC
      if (!hasEnoughForEntry) {
        setError('Insufficient USDC balance. Please add funds to continue.');
        setIsStartingGame(false);
        return;
      }

      // Start paid game with smart contract interaction
      await handlePaidGameEntry();
    } else {
      // Trial exhausted or other case - show payment flow
      setShowPayment(true);
      setIsStartingGame(false);
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
    setPaymentFlowId((n) => n + 1);
    setIsProcessingPayment(true);
    setError(null);

    try {
      console.log('Paid entry: approve USDC then joinBattle (opens session on-chain if needed).');
      
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
    // USDC onramp only — no joinBattle hash; server may reject paid verification until user completes on-chain join.
    void onGameStart({
      isTrial: false,
      playerMode: playerModeChoice,
      walletUniversalAddress: universalAddress ?? undefined,
    });
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleRetryTransaction = () => {
    setTransactionError(null);
    setError(null);
    setIsStartingGame(true);
    setPaymentFlowId((n) => n + 1);
    setIsProcessingPayment(true);
  };

  const handleDismissError = () => {
    setTransactionError(null);
    setError(null);
    setIsProcessingPayment(false);
    setIsStartingGame(false);
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
        <TrialStatusDisplay walletAddress={address || undefined} entryToken={entryToken || undefined} />
      )}

      {joinStartError ? (
        <div
          className="rounded-lg border border-red-500/40 bg-red-950/40 px-3 py-3 text-sm text-red-200"
          role="alert"
        >
          <div className="flex items-start justify-between gap-2">
            <span>{joinStartError}</span>
            {onDismissJoinStartError ? (
              <button
                type="button"
                onClick={onDismissJoinStartError}
                className="shrink-0 text-red-300 underline text-xs focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-red-400 rounded"
                aria-label="Dismiss error"
              >
                Dismiss
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      <Card className="bg-gradient-to-br from-purple-900/20 to-blue-900/20 border-purple-500/30">
        <CardHeader className="pb-3">
          <CardTitle className="flex items-center gap-2 text-lg text-white">
            {playerModeChoice === 'trial' ? (
              <>
                <Gamepad2 className="h-5 w-5 text-green-400" />
                Trial Mode
              </>
            ) : playerModeChoice === 'paid_solo' ? (
              <>
                <Crown className="h-5 w-5 text-yellow-400" />
                Solo (paid)
              </>
            ) : (
              <>
                <Crown className="h-5 w-5 text-yellow-400" />
                Multiplayer (paid)
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
                disabled={isStartingGame}
                className="w-full bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-400 hover:to-emerald-400 text-white cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isStartingGame ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : (
                  <Play className="h-4 w-4 mr-2" />
                )}
                {isStartingGame ? 'Starting...' : 'Start Free Game'}
              </Button>
            </>
          ) : isPaidMode ? (
            <>
              {/* Base Account Display */}
              <div className="mb-4">
                {isConnected ? (
                  <SubAccountDisplay showActions={true} />
                ) : (
                  <div className="text-center">
                    <SignInWithBaseButton colorScheme="light" />
                  </div>
                )}
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
                <GaslessBadge isGasless={true} />
              </div>

              {!isConnected || !address ? (
                <div className="text-center">
                  <div className="text-yellow-400 text-sm font-medium mb-2">
                    🔗 Base Account Required
                  </div>
                  <div className="text-xs text-gray-400">
                    Please connect your Base Account above to continue
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
                    {playerModeChoice === 'paid_multiplayer'
                      ? 'Compete with others — the prize pool grows when more players join.'
                      : 'Play anytime — each entry adds to the prize pool.'}
                  </div>

                  <div
                    className="mb-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-xs text-gray-300"
                    role="status"
                  >
                    Entry is <span className="text-white font-medium">1 USDC</span> per session. You sign two steps: USDC approval, then join — the app waits for the first to confirm before sending the second (avoids wallet nonce errors). Sponsored gas depends on your CDP Paymaster rules.
                  </div>
                  
                  {isProcessingPayment ? (
                    <div className="space-y-4">
                      <div
                        className="rounded-lg border border-amber-500/30 bg-amber-950/20 px-4 py-5 text-center"
                        role="status"
                        aria-live="polite"
                      >
                        <p className="text-sm font-medium text-amber-200">Processing entry</p>
                        <p className="mt-2 text-sm text-zinc-200">
                          {playerModeChoice === 'paid_multiplayer'
                            ? 'Approve USDC in your wallet, then confirm join. When both transactions confirm, you’ll enter the multiplayer lobby automatically.'
                            : 'Approve USDC in your wallet, then confirm join. When both transactions confirm, your paid game will start automatically.'}
                        </p>
                      </div>
                      <BaseAccountTransaction
                        ref={paidTxRef}
                        calls={paidGameCalls}
                        onStatus={handleTransactionStatus}
                        className="w-full"
                        showSubmitButton={false}
                        connectedAddress={address}
                      />
                      <Button
                        type="button"
                        onClick={() => { setIsProcessingPayment(false); setIsStartingGame(false); }}
                        variant="outline"
                        className="w-full border-white text-red-400 hover:text-red-500 hover:bg-red-500/20 hover:cursor-pointer"
                      >
                        Cancel
                      </Button>
                    </div>
                  ) : (
                    <Button
                      onClick={handlePaidGameEntry}
                      disabled={!hasEnoughForEntry || isStartingGame}
                      className="w-full !bg-gradient-to-r !from-yellow-500 !to-orange-500 hover:!from-yellow-400 hover:!to-orange-400 !text-white border-0 shadow-lg cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                      style={{ background: 'linear-gradient(to right, #eab308, #f97316)' }}
                    >
                      {isStartingGame ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      {isStartingGame
                        ? 'Processing...'
                        : playerModeChoice === 'paid_multiplayer'
                          ? 'Enter Multiplayer Lobby'
                          : 'Start paid game'}
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
                <GaslessBadge isGasless={true} />
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
