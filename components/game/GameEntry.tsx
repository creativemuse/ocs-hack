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
import { generateFundingUrl, generateAssetFundingUrl, clearBrowserCache, openEthGasFunding } from '@/lib/utils/funding';
import { openFundingUrl } from '@/lib/utils/openFundingUrl';
import TrialStatusDisplay from './TrialStatusDisplay';
import GamePayment from './GamePayment';
import WalletWithBalance from '@/components/wallet/WalletWithBalance';
import SubAccountDisplay from '@/components/base-account/SubAccountDisplay';
import OrbConnectButton from '@/components/auth/OrbConnectButton';
import { useOrbAuth } from '@/components/providers/OrbAuthProvider';
import GaslessBadge from '@/components/base-account/GaslessBadge';
import { Gamepad2, Crown, Coins, Play, DollarSign, AlertCircle, CheckCircle, Loader2, Wallet, LogOut } from 'lucide-react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
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
import {
  savePendingPaidEntry,
  loadPendingPaidEntry,
  type PendingPaidEntry,
} from '@/lib/game/pendingPaidEntry';

interface GameEntryProps {
  onGameStart: (options: GameStartOptions) => void | Promise<void>;
  entryToken?: string | null;
  className?: string;
  playerModeChoice?: PlayerModeChoice;
  joinStartError?: string | null;
  onDismissJoinStartError?: () => void;
  /** true when the session for this mode has an active round */
  sessionBusy?: boolean;
  /** seconds remaining in the active round (from server) */
  sessionTimeRemaining?: number;
  /** Parent shows full-screen overlay while verifying payment + joining */
  isJoiningAfterPayment?: boolean;
  joinProgressMessage?: string;
  /** Allow wallet switch on gameplay mode selection screen only */
  allowDisconnect?: boolean;
}

export default function GameEntry({
  onGameStart,
  entryToken,
  className = '',
  playerModeChoice = 'trial',
  joinStartError,
  onDismissJoinStartError,
  sessionBusy = false,
  sessionTimeRemaining = 0,
  isJoiningAfterPayment = false,
  joinProgressMessage = 'Confirming payment on-chain and joining the session…',
  allowDisconnect = false,
}: GameEntryProps) {
  const isPaidMode = playerModeChoice === 'paid_solo' || playerModeChoice === 'paid_multiplayer';
  console.log('GameEntry received playerModeChoice:', playerModeChoice);
  const { address, universalAddress, isConnected, connect, disconnect, isConnecting } = useBaseAccount();
  const { disconnect: orbDisconnect } = useOrbAuth();
  const { trialStatus, isLoading: trialLoading, incrementTrialGame } = useTrialStatus(address || undefined, entryToken || undefined);
  const { getSessionToken, isLoading: sessionLoading, error: sessionError } = useSessionToken();
  const { balance, hasEnoughForEntry, isLoading: balanceLoading, error: balanceError } = useUSDCBalance();
  useTriviaContract(true);
  const [showPayment, setShowPayment] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [transactionError, setTransactionError] = useState<TransactionError | null>(null);
  const [fundingUrl, setFundingUrl] = useState<string | null>(null);
  const [ethFundingUrl, setEthFundingUrl] = useState<string | null>(null);
  const [ethFundingLoading, setEthFundingLoading] = useState(false);
  const [ethFundingError, setEthFundingError] = useState<string | null>(null);
  const [fundingSuccess, setFundingSuccess] = useState(false);
  const [isProcessingPayment, setIsProcessingPayment] = useState(false);
  const [awaitingWalletOpen, setAwaitingWalletOpen] = useState(false);
  const [isStartingGame, setIsStartingGame] = useState(false);
  const [paymentFlowId, setPaymentFlowId] = useState(0);
  const [isFundingUrlGenerating, setIsFundingUrlGenerating] = useState(false);
  const paidGameCalls = useMemo(() => createBaseAccountPaidGameCalls(), []);
  const paidTxRef = useRef<BaseAccountTransactionHandle>(null);
  const generatingAddressRef = useRef<string | null>(null);
  const paymasterConfigured = Boolean(process.env.NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT);
  const [pendingPaidEntry, setPendingPaidEntry] = useState<PendingPaidEntry | null>(null);
  const [showSwitchAccountConfirm, setShowSwitchAccountConfirm] = useState(false);
  const [isSwitchingAccount, setIsSwitchingAccount] = useState(false);

  const switchAccountDisabled =
    isJoiningAfterPayment ||
    isProcessingPayment ||
    awaitingWalletOpen ||
    isSwitchingAccount;

  const performSwitchAccount = useCallback(async () => {
    setIsSwitchingAccount(true);
    try {
      orbDisconnect();
      await disconnect();
      setShowSwitchAccountConfirm(false);
    } catch (err) {
      console.error('Failed to switch account:', err);
      setError('Could not switch account. Please try again.');
    } finally {
      setIsSwitchingAccount(false);
    }
  }, [disconnect, orbDisconnect]);

  const handleSwitchAccountClick = useCallback(() => {
    if (switchAccountDisabled) {
      return;
    }
    if (pendingPaidEntry) {
      setShowSwitchAccountConfirm(true);
      return;
    }
    void performSwitchAccount();
  }, [pendingPaidEntry, performSwitchAccount, switchAccountDisabled]);

  useEffect(() => {
    setPendingPaidEntry(loadPendingPaidEntry(address));
  }, [address, joinStartError]);

  // Local countdown timer that ticks every second from the server-provided value
  const [localCountdown, setLocalCountdown] = useState(sessionTimeRemaining);
  useEffect(() => {
    setLocalCountdown(sessionTimeRemaining);
  }, [sessionTimeRemaining]);
  useEffect(() => {
    if (localCountdown <= 0) return;
    const t = window.setInterval(() => {
      setLocalCountdown((c) => Math.max(0, c - 1));
    }, 1000);
    return () => clearInterval(t);
  }, [localCountdown > 0]); // eslint-disable-line react-hooks/exhaustive-deps
  const countdownMins = Math.floor(localCountdown / 60);
  const countdownSecs = localCountdown % 60;
  const countdownText = `${countdownMins}:${countdownSecs.toString().padStart(2, '0')}`;


  // Reset funding URLs when wallet address changes
  useEffect(() => {
    setFundingUrl(null);
    setEthFundingUrl(null);
  }, [address]);

  const generateOnrampUrls = useCallback(async (): Promise<string | null> => {
    if (!address || generatingAddressRef.current === address) return null;

    generatingAddressRef.current = address;
    setIsFundingUrlGenerating(true);

    try {
      await clearBrowserCache();
      const sessionToken = await getSessionToken(address);

      if (generatingAddressRef.current !== address) {
        return null;
      }

      const usdcUrl = generateFundingUrl({ walletAddress: address, sessionToken });
      setFundingUrl(usdcUrl);
      setEthFundingUrl(
        generateAssetFundingUrl({
          walletAddress: address,
          sessionToken,
          asset: 'ETH',
          presetFiatAmount: '5',
        })
      );
      setError(null);
      return usdcUrl;
    } catch (err) {
      if (generatingAddressRef.current !== address) return null;
      console.error('Failed to generate onramp URLs:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(`Failed to initialize onramp: ${errorMessage}`);
      return null;
    } finally {
      if (generatingAddressRef.current === address) {
        generatingAddressRef.current = null;
        setIsFundingUrlGenerating(false);
      }
    }
  }, [address, getSessionToken]);

  // Auto-generate USDC + ETH onramp URLs when address is available
  useEffect(() => {
    if (!address || fundingUrl) return;
    void generateOnrampUrls();
  }, [address, fundingUrl, generateOnrampUrls]);

  // Handle transaction status updates
  const handleTransactionStatus = useCallback((
    status: 'pending' | 'success' | 'error',
    message?: string,
    extras?: BaseAccountTxStatusExtras
  ) => {
    console.log('Transaction status:', status, message, extras);
    
    if (status === 'success') {
      console.log('Paid game transaction successful!');
      const paidTxHash = extras?.lastTxHash;
      if (!paidTxHash) {
        setError('Payment succeeded but no transaction hash was returned. Check your wallet activity and use Continue paid game.');
        setIsProcessingPayment(false);
        setAwaitingWalletOpen(true);
        setIsStartingGame(false);
        return;
      }

      if (address) {
        savePendingPaidEntry({
          paidTxHash,
          playerMode: playerModeChoice,
          walletAddress: address,
          walletUniversalAddress: universalAddress ?? undefined,
        });
        setPendingPaidEntry(loadPendingPaidEntry(address));
      }

      setIsProcessingPayment(false);
      setAwaitingWalletOpen(false);
      setTransactionError(null);
      setError(null);
      void onGameStart({
        isTrial: false,
        paidTxHash,
        playerMode: playerModeChoice,
        walletUniversalAddress: universalAddress ?? undefined,
      });
    } else if (status === 'error') {
      setIsProcessingPayment(false);
      setAwaitingWalletOpen(true);
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

      const isInsufficientGas =
        safeMessage.toLowerCase().includes('insufficient') &&
        (safeMessage.toLowerCase().includes('eth') ||
          safeMessage.toLowerCase().includes('gas') ||
          safeMessage.toLowerCase().includes('fee'));

      if (isInsufficientGas) {
        const gasError: TransactionError = {
          code: 'INSUFFICIENT_ETH_FOR_GAS',
          message: 'Insufficient ETH for gas fees',
          userMessage:
            'You need a small amount of ETH in your wallet for network fees (~$0.02). Add ETH using the button on your wallet card, then open the wallet again.',
          recoverable: true,
          retryable: true,
        };
        setTransactionError(gasError);
        setError(gasError.userMessage);
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

    if (playerModeChoice === 'trial' && !trialStatus.isTrialActive) {
      setError('Your free trial has been used. Please select a paid mode.');
      setIsStartingGame(false);
      return;
    }

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
      // Trial exhausted but not in paid mode — parent auto-redirects to paid_solo
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
    setAwaitingWalletOpen(true);
    setIsStartingGame(false);
    setError(null);
  };

  /** Must run synchronously from a user click so the wallet window is not blocked. */
  const handleOpenWallet = () => {
    setAwaitingWalletOpen(false);
    setTransactionError(null);
    setError(null);
    paidTxRef.current?.submit();
  };

  const handleFundEth = async () => {
    if (!address || ethFundingLoading) return;

    setEthFundingLoading(true);
    setEthFundingError(null);

    const result = await openEthGasFunding({
      walletAddress: address,
      getSessionToken,
      cachedUrl: ethFundingUrl,
    });

    setEthFundingLoading(false);

    if (!result.opened) {
      setEthFundingError(
        result.error ??
          'Could not open Coinbase Pay. Try “Fund wallet in Base Account app” below.'
      );
    }
  };

  const handlePaymentSuccess = () => {
    setError(
      'USDC added to your wallet. Tap Start paid game to approve and join on-chain (one wallet confirmation).'
    );
    setShowPayment(false);
  };

  const handleContinuePendingPaid = () => {
    const pending = pendingPaidEntry ?? loadPendingPaidEntry(address);
    if (!pending?.paidTxHash) return;
    setError(null);
    onDismissJoinStartError?.();
    void onGameStart({
      isTrial: false,
      paidTxHash: pending.paidTxHash,
      playerMode: pending.playerMode,
      walletUniversalAddress: pending.walletUniversalAddress,
    });
  };

  const handlePaymentError = (errorMessage: string) => {
    setError(errorMessage);
  };

  const handleRetryTransaction = () => {
    setTransactionError(null);
    setError(null);
    setPaymentFlowId((n) => n + 1);
    setIsProcessingPayment(true);
    setAwaitingWalletOpen(true);
  };

  const handleDismissError = () => {
    setTransactionError(null);
    setError(null);
    setIsProcessingPayment(false);
    setAwaitingWalletOpen(false);
    setIsStartingGame(false);
  };

  const handleBackToEntry = () => {
    setShowPayment(false);
    setError(null);
  };

  const handleRefreshFundingUrl = async () => {
    if (!address) return;

    setFundingUrl(null);
    setEthFundingUrl(null);
    setError(null);
    const url = await generateOnrampUrls();
    if (url) {
      setFundingSuccess(true);
      setTimeout(() => setFundingSuccess(false), 2000);
    }
  };

  const handleBuyUsdc = async () => {
    if (fundingUrl) {
      openFundingUrl(fundingUrl);
      return;
    }
    const url = await generateOnrampUrls();
    if (url) {
      openFundingUrl(url);
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
          className="rounded-lg border border-red-500/60 bg-red-950/60 px-4 py-4 text-sm text-red-100 shadow-lg"
          role="alertdialog"
          aria-labelledby="join-error-title"
        >
          <p id="join-error-title" className="font-semibold text-red-50 mb-1">
            Payment received — game did not start
          </p>
          <p className="mb-3">{joinStartError}</p>
          <div className="flex flex-col gap-2 sm:flex-row">
            {(pendingPaidEntry ?? loadPendingPaidEntry(address)) ? (
              <Button
                type="button"
                onClick={handleContinuePendingPaid}
                className="bg-amber-500 hover:bg-amber-400 text-black"
                aria-label="Retry starting game with your existing payment"
              >
                Retry with same payment
              </Button>
            ) : null}
            {onDismissJoinStartError ? (
              <Button
                type="button"
                variant="outline"
                onClick={onDismissJoinStartError}
                className="border-red-400/50 text-red-100"
                aria-label="Dismiss error"
              >
                Dismiss
              </Button>
            ) : null}
          </div>
        </div>
      ) : null}

      {pendingPaidEntry && !joinStartError && !isJoiningAfterPayment ? (
        <div
          className="rounded-lg border border-amber-500/40 bg-amber-950/30 px-4 py-3 text-sm text-amber-100"
          role="status"
        >
          <p className="font-medium text-amber-50">You have a paid entry waiting</p>
          <p className="text-xs text-amber-200/80 mt-1 mb-3">
            Your USDC payment is on-chain. Continue without paying again.
          </p>
          <Button
            type="button"
            onClick={handleContinuePendingPaid}
            className="w-full bg-amber-500 hover:bg-amber-400 text-black"
            aria-label="Continue paid game without paying again"
          >
            Continue paid game
          </Button>
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
                  <>
                    <SubAccountDisplay
                      showActions={true}
                      onFundEth={handleFundEth}
                      ethFundingLoading={ethFundingLoading}
                      ethFundingError={ethFundingError}
                      paymasterConfigured={paymasterConfigured}
                    />
                    <div className="mt-3 flex flex-col items-center gap-3">
                      <OrbConnectButton allowDisconnect={allowDisconnect} />
                      {allowDisconnect && (
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={handleSwitchAccountClick}
                          disabled={switchAccountDisabled}
                          className="border-white/20 bg-white/5 text-white/80 hover:bg-white/10 hover:text-white disabled:opacity-50"
                          aria-label="Switch Base Account"
                        >
                          {isSwitchingAccount ? (
                            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                          ) : (
                            <LogOut className="h-4 w-4 mr-2" />
                          )}
                          Switch account
                        </Button>
                      )}
                    </div>
                  </>
                ) : (
                  <div className="text-center">
                    <SignInWithBaseButton
                      align="center"
                      variant="solid"
                      colorScheme="light"
                      onClick={isConnecting ? undefined : connect}
                    />
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
                <GaslessBadge isGasless={paymasterConfigured} />
              </div>
              {paymasterConfigured && (
                <p className="text-[10px] text-gray-500 text-center -mt-2 mb-2">
                  *Gasless for eligible Coinbase One members; others need a small ETH balance
                </p>
              )}

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

                    {/* USDC onramp — always available so players can add more funds */}
                    {!balanceLoading && (
                      <div className="mt-3 pt-3 border-t border-gray-700/50">
                        <Button
                          onClick={handleBuyUsdc}
                          disabled={isFundingUrlGenerating}
                          className="w-full !bg-gradient-to-r !from-blue-500 !to-indigo-500 hover:!from-blue-400 hover:!to-indigo-400 text-white text-sm cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
                          size="sm"
                        >
                          {isFundingUrlGenerating ? (
                            <>
                              <Loader2 className="h-3 w-3 mr-2 animate-spin" />
                              Initializing Onramp...
                            </>
                          ) : (
                            <>
                              <Coins className="h-3 w-3 mr-2" />
                              {hasEnoughForEntry ? 'Add More USDC' : fundingUrl ? 'Buy USDC with Card' : 'Retry Onramp Setup'}
                            </>
                          )}
                        </Button>
                        <p className="text-[10px] text-gray-400 text-center mt-1.5">
                          USDC entry fee &middot; Powered by Coinbase Onramp
                        </p>
                      </div>
                    )}
                  </div>

                  <div className="text-sm text-gray-300 text-center mb-4">
                    {playerModeChoice === 'paid_multiplayer'
                      ? 'Same weekly pool as solo — lobby only syncs start time. Each entry adds 1 USDC.'
                      : 'Arcade pay-to-play: each entry adds 1 USDC to this week\'s pool. Latest score ranks you.'}
                  </div>

                  <div
                    className="mb-4 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-xs text-gray-300"
                    role="status"
                  >
                    Play Again = another 1 USDC toward the pool. Your <span className="text-white font-medium">most recent score</span> is what ranks you for the weekly top 3 payout.
                  </div>
                  
                  {/* Session-busy info banner — paid players can still enter (auto-reset) */}
                  {sessionBusy && localCountdown > 0 && !isProcessingPayment && (
                    <div
                      className="mb-3 rounded-lg border border-amber-500/30 bg-amber-950/20 px-3 py-3 text-center"
                      role="status"
                      aria-live="polite"
                    >
                      <p className="text-sm text-amber-200 font-medium">
                        Round in progress &mdash; {countdownText} remaining
                      </p>
                      <p className="mt-1 text-xs text-gray-400">
                        Your entry will start a new session automatically
                      </p>
                    </div>
                  )}

                  {isProcessingPayment ? (
                    <div className="space-y-4">
                      <BaseAccountTransaction
                        ref={paidTxRef}
                        calls={paidGameCalls}
                        onStatus={handleTransactionStatus}
                        className="w-full"
                        showSubmitButton={false}
                        connectedAddress={address}
                      />
                      {awaitingWalletOpen ? (
                        <div
                          className="rounded-lg border border-blue-500/30 bg-blue-950/20 px-4 py-5 text-center space-y-4"
                          role="status"
                          aria-live="polite"
                        >
                          <p className="text-sm font-medium text-blue-200">Ready to sign</p>
                          <p className="text-sm text-zinc-200">
                            Tap below to open your Base wallet and approve USDC, then confirm join.
                          </p>
                          <Button
                            type="button"
                            onClick={handleOpenWallet}
                            className="w-full bg-white text-black hover:bg-gray-100 font-semibold"
                          >
                            <Wallet className="h-4 w-4 mr-2" />
                            Open wallet
                          </Button>
                        </div>
                      ) : (
                        <div
                          className="rounded-lg border border-amber-500/30 bg-amber-950/20 px-4 py-5 text-center"
                          role="status"
                          aria-live="polite"
                        >
                          <p className="text-sm font-medium text-amber-200">Processing entry</p>
                          <p className="mt-2 text-sm text-zinc-200">
                            Confirm in your wallet, then wait for on-chain confirmation…
                          </p>
                        </div>
                      )}
                      <Button
                        type="button"
                        onClick={() => {
                          setIsProcessingPayment(false);
                          setAwaitingWalletOpen(false);
                          setIsStartingGame(false);
                        }}
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
            <div className="text-center text-sm text-gray-400 py-4">
              <p>Select a play mode above to get started.</p>
            </div>
          )}
        </CardContent>
      </Card>

      {isJoiningAfterPayment ? (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 px-4"
          role="status"
          aria-live="polite"
          aria-label="Starting game after payment"
        >
          <div className="max-w-sm rounded-xl border border-amber-500/40 bg-zinc-900 px-6 py-8 text-center shadow-xl">
            <Loader2 className="mx-auto h-10 w-10 animate-spin text-amber-400 mb-4" aria-hidden />
            <p className="text-lg font-semibold text-white">Starting your game</p>
            <p className="mt-2 text-sm text-zinc-300">{joinProgressMessage}</p>
            <p className="mt-4 text-xs text-zinc-500">
              This usually takes a few seconds. On busy networks it can take up to a minute.
            </p>
          </div>
        </div>
      ) : null}

      <AlertDialog open={showSwitchAccountConfirm} onOpenChange={setShowSwitchAccountConfirm}>
        <AlertDialogContent className="bg-zinc-900 border-gray-700 text-white">
          <AlertDialogHeader>
            <AlertDialogTitle>Switch account?</AlertDialogTitle>
            <AlertDialogDescription className="text-gray-400">
              You have a pending paid entry for this wallet. Switching accounts will sign you out
              and you may need to recover your entry with the new wallet.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="border-gray-600 bg-transparent text-white hover:bg-white/10">
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault();
                void performSwitchAccount();
              }}
              disabled={isSwitchingAccount}
              className="bg-amber-600 hover:bg-amber-500 text-white"
            >
              {isSwitchingAccount ? 'Switching…' : 'Switch account'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
