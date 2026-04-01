'use client';

import { useState, useCallback, useEffect } from 'react';
import { useBaseAccount } from './useBaseAccount';
import { createBaseAccountSDK } from '@base-org/account';
import { base } from 'viem/chains';
import { parseUnits, encodeFunctionData } from 'viem';
import { TRIVIA_ABI, USDC_ABI, ENTRY_FEE_USDC, TRIVIA_CONTRACT_ADDRESS, USDC_CONTRACT_ADDRESS } from '@/lib/blockchain/contracts';

export interface ContractState {
  isApproving: boolean;
  isJoining: boolean;
  isSubmitting: boolean;
  isClaiming: boolean;
  isStartingSession: boolean;
  error: string | null;
  transactionHash: string | null;
  isSuccess: boolean;
  useGasless: boolean;
  sessionActive: boolean;
}

export function useTriviaContract(useGasless: boolean = true) {
  const { address, isConnected } = useBaseAccount();
  const [state, setState] = useState<ContractState>({
    isApproving: false,
    isJoining: false,
    isSubmitting: false,
    isClaiming: false,
    isStartingSession: false,
    error: null,
    transactionHash: null,
    isSuccess: false,
    useGasless,
    sessionActive: false,
  });

  const [sessionInfo, setSessionInfo] = useState<any>(null);
  const [contractOwner, setContractOwner] = useState<string | null>(null);
  const [isPending, setIsPending] = useState(false);
  const [isConfirming, setIsConfirming] = useState(false);
  const [isConfirmed, setIsConfirmed] = useState(false);
  const [hash, setHash] = useState<string | null>(null);
  const [writeError, setWriteError] = useState<Error | null>(null);

  // Initialize Base Account SDK client-side only
  const [provider, setProvider] = useState<any>(null);

  useEffect(() => {
    if (typeof window !== "undefined") {
      try {
        const sdk = createBaseAccountSDK({
          appName: 'BEAT ME',
          appLogoUrl: 'https://base.org/logo.png',
          appChainIds: [base.id],
          subAccounts: {
            creation: 'on-connect',
            defaultAccount: 'sub',
          },
          paymasterUrls: process.env.NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT ? [process.env.NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT] : undefined,
        });
        setProvider(sdk.getProvider());
      } catch (error) {
        console.error('Failed to initialize Base Account SDK:', error);
      }
    }
  }, []);

  // Fetch session info using Base Account SDK
  const fetchSessionInfo = useCallback(async () => {
    if (!provider) return;
    
    try {
      const data = encodeFunctionData({
        abi: TRIVIA_ABI,
        functionName: 'isSessionActive',
        args: [],
      });

      const result = await provider.request({
        method: 'eth_call',
        params: [{
          to: TRIVIA_CONTRACT_ADDRESS,
          data,
        }, 'latest']
      });
      setSessionInfo(result);
    } catch (error) {
      console.error('Error fetching session info:', error);
    }
  }, [provider]);

  // Fetch contract owner using Base Account SDK
  const fetchContractOwner = useCallback(async () => {
    if (!provider) return;
    
    try {
      const data = encodeFunctionData({
        abi: TRIVIA_ABI,
        functionName: 'owner',
        args: [],
      });
      
      const result = await provider.request({
        method: 'eth_call',
        params: [{
          to: TRIVIA_CONTRACT_ADDRESS,
          data,
        }, 'latest']
      });
      
      // Parse the result - owner() returns an address (20 bytes padded to 32 bytes)
      if (result && result !== '0x') {
        const ownerAddress = '0x' + result.slice(-40); // Last 40 characters = 20 bytes = address
        setContractOwner(ownerAddress);
      }
    } catch (error) {
      console.error('Error fetching contract owner:', error);
    }
  }, [provider]);

  // Note: OnchainKit gasless transactions require Transaction component wrapper
  // For now, we'll use regular wagmi transactions

  // Start a new trivia session
  const startSession = useCallback(async (_duration: number = 300) => {
    if (!address || !isConnected || !provider) {
      setState(prev => ({ ...prev, error: 'Wallet not connected or provider not ready' }));
      return false;
    }

    setState(prev => ({ ...prev, isStartingSession: true, error: null }));
    setIsPending(true);

    try {
      console.log('Starting new trivia session (contract uses configured interval; duration arg ignored)');
      console.log('⚠️  WARNING: Only contract owner can start sessions!');
      console.log('Current user address:', address);
      console.log('Contract address:', TRIVIA_CONTRACT_ADDRESS);
      
      const data = encodeFunctionData({
        abi: TRIVIA_ABI,
        functionName: 'startNewSession',
        args: [],
      });
      
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: address,
          to: TRIVIA_CONTRACT_ADDRESS,
          data,
        }]
      });
      
      setHash(txHash as string);
      setIsPending(false);
      setIsConfirming(true);
      
      // Wait for transaction to be confirmed
      console.log('Session start transaction submitted, waiting for confirmation...');
      return true;
    } catch (error) {
      console.error('Error starting session:', error);
      console.error('This is likely because you are not the contract owner.');
      console.error('The contract owner needs to start a session first.');
      
      setState(prev => ({
        ...prev,
        isStartingSession: false,
        error: error instanceof Error ? error.message : 'Failed to start session - you may not be the contract owner',
      }));
      setIsPending(false);
      setWriteError(error as Error);
      return false;
    }
  }, [address, isConnected, provider]);

  // Check if session is active
  const checkSessionStatus = useCallback(async () => {
    if (!provider) {
      console.log('Provider not ready, cannot check session status');
      setState(prev => ({ ...prev, sessionActive: false }));
      return false;
    }

    try {
      console.log('Checking session status...');
      
      const data = encodeFunctionData({
        abi: TRIVIA_ABI,
        functionName: 'isSessionActive',
        args: [],
      });

      const result = await provider.request({
        method: 'eth_call',
        params: [{
          to: TRIVIA_CONTRACT_ADDRESS,
          data,
        }, 'latest']
      });

      console.log('isSessionActive result:', result);

      const isActive =
        result && result !== '0x' ? BigInt(result as string) !== BigInt(0) : false;

      setState(prev => ({ ...prev, sessionActive: isActive }));
      console.log('Session status:', { isActive });
      return isActive;
    } catch (error) {
      console.error('Error checking session status:', error);
      setState(prev => ({ ...prev, sessionActive: false }));
      return false;
    }
  }, [provider]);

  // Fetch session flag on mount / when provider is ready (joinBattle requires isSessionActive)
  useEffect(() => {
    if (provider) {
      fetchSessionInfo();
      fetchContractOwner();
      void checkSessionStatus();
    }
  }, [fetchSessionInfo, fetchContractOwner, provider, checkSessionStatus]);

  // Ensure session is active before joining
  const ensureActiveSession = useCallback(async () => {
    try {
      console.log('Ensuring active session...');
      
      // First, try to check if there's already an active session
      const isActive = await checkSessionStatus();
      
      if (isActive) {
        console.log('Session is already active');
        return true;
      }
      
      console.log('❌ No active session found!');
      console.log('Contract owner:', contractOwner);
      console.log('Current user:', address);
      console.log('Is current user the owner?', contractOwner === address);
      
      const ownerLower = contractOwner?.toLowerCase();
      const addrLower = address?.toLowerCase();
      if (ownerLower && addrLower && ownerLower !== addrLower) {
        console.error('🚨 CRITICAL: You are not the contract owner!');
        console.error('Only the contract owner can start sessions.');
        setState(prev => ({
          ...prev,
          error: `No active session. Ask the operator to call startNewSession() on the contract. (Owner: ${contractOwner})`,
        }));
        return false;
      }

      if (!contractOwner || !address) {
        setState(prev => ({
          ...prev,
          error: 'Could not verify contract owner. Refresh the page and try again.',
        }));
        return false;
      }

      console.log('✅ You are the contract owner, attempting to start session...');
      
      try {
        const sessionStarted = await startSession();
        
        if (!sessionStarted) {
          console.error('Failed to start session - you may not have permission');
          return false;
        }
        
        // Wait a bit for the transaction to be processed
        console.log('Waiting for session to be confirmed...');
        await new Promise(resolve => setTimeout(resolve, 3000));
        
        // Check session status again
        const sessionActive = await checkSessionStatus();
        console.log('Session active after creation:', sessionActive);
        
        return sessionActive;
        
      } catch (sessionError) {
        console.error('Session start failed:', sessionError);
        return false;
      }
      
    } catch (error) {
      console.error('Error in ensureActiveSession:', error);
      return false;
    }
  }, [checkSessionStatus, startSession, contractOwner, address]);

  // Approve USDC spending for the trivia contract
  const approveUSDC = useCallback(async () => {
    if (!address || !isConnected || !provider) {
      setState(prev => ({ ...prev, error: 'Wallet not connected or provider not ready' }));
      return;
    }

    setState(prev => ({ ...prev, isApproving: true, error: null }));
    setIsPending(true);

    try {
      const entryFeeWei = parseUnits(ENTRY_FEE_USDC.toString(), 6); // USDC has 6 decimals
      
      const data = encodeFunctionData({
        abi: USDC_ABI,
        functionName: 'approve',
        args: [TRIVIA_CONTRACT_ADDRESS as `0x${string}`, entryFeeWei],
      });
      
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: address,
          to: USDC_CONTRACT_ADDRESS,
          data,
        }]
      });
      
      setHash(txHash as string);
      setIsPending(false);
      setIsConfirming(true);
    } catch (error) {
      console.error('Error approving USDC:', error);
      setState(prev => ({
        ...prev,
        isApproving: false,
        error: error instanceof Error ? error.message : 'Failed to approve USDC',
      }));
      setIsPending(false);
      setWriteError(error as Error);
    }
    }, [address, isConnected, provider]);

  // Join the trivia battle (paid players)
  const joinBattle = useCallback(async () => {
    if (!address || !isConnected || !provider) {
      setState(prev => ({ ...prev, error: 'Wallet not connected or provider not ready' }));
      return;
    }

    setState(prev => ({ ...prev, isJoining: true, error: null }));
    setIsPending(true);

    try {
      // joinBattle() opens a session on-chain when none is active (see contracts/TriviaBattle.sol)
      const data = encodeFunctionData({
        abi: TRIVIA_ABI,
        functionName: 'joinBattle',
        args: [],
      });
      
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: address,
          to: TRIVIA_CONTRACT_ADDRESS,
          data,
        }]
      });
      
      setHash(txHash as string);
      setIsPending(false);
      setIsConfirming(true);
    } catch (error) {
      console.error('Error joining battle:', error);
      setState(prev => ({
        ...prev,
        isJoining: false,
        error: error instanceof Error ? error.message : 'Failed to join battle',
      }));
      setIsPending(false);
      setWriteError(error as Error);
    }
    }, [address, isConnected, provider]);

  const joinTrialBattle = useCallback(async (_sessionId: string) => {
    setState(prev => ({
      ...prev,
      isJoining: false,
      error: 'On-chain trial battles are not supported by this contract; use joinBattle (paid).',
    }));
    setIsPending(false);
  }, []);

  // Submit score
  const submitScore = useCallback(async (score: number) => {
    if (!address || !isConnected || !provider) {
      setState(prev => ({ ...prev, error: 'Wallet not connected or provider not ready' }));
      return;
    }

    setState(prev => ({ ...prev, isSubmitting: true, error: null }));
    setIsPending(true);

    try {
      const data = encodeFunctionData({
        abi: TRIVIA_ABI,
        functionName: 'submitScores',
        args: [[address as `0x${string}`], [BigInt(score)]],
      });
      
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: address,
          to: TRIVIA_CONTRACT_ADDRESS,
          data,
        }]
      });
      
      setHash(txHash as string);
      setIsPending(false);
      setIsConfirming(true);
    } catch (error) {
      console.error('Error submitting score:', error);
      setState(prev => ({
        ...prev,
        isSubmitting: false,
        error: error instanceof Error ? error.message : 'Failed to submit score',
      }));
      setIsPending(false);
      setWriteError(error as Error);
    }
    }, [address, isConnected, provider]);

  const submitTrialScore = useCallback(async (_sessionId: string, _score: number) => {
    setState(prev => ({
      ...prev,
      isSubmitting: false,
      error: 'On-chain trial scores are not supported; use SpacetimeDB trial flow or paid submitScores.',
    }));
    setIsPending(false);
  }, []);

  // Claim winnings (contract exposes executeWithdrawal for pending USDC)
  const claimWinnings = useCallback(async (winningAmount: string) => {
    if (!address || !isConnected || !provider) {
      setState(prev => ({ ...prev, error: 'Wallet not connected or provider not ready' }));
      return;
    }

    setState(prev => ({ ...prev, isClaiming: true, error: null }));
    setIsPending(true);

    try {
      console.log(`Claiming ${winningAmount} USDC for player ${address}`);
      
      const data = encodeFunctionData({
        abi: TRIVIA_ABI,
        functionName: 'executeWithdrawal',
        args: [],
      });
      
      const txHash = await provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: address,
          to: TRIVIA_CONTRACT_ADDRESS,
          data,
        }]
      });
      
      setHash(txHash as string);
      setIsPending(false);
      setIsConfirming(true);
      console.log('✅ Claim winnings transaction submitted');
    } catch (error) {
      console.error('Error claiming winnings:', error);
      setState(prev => ({
        ...prev,
        isClaiming: false,
        error: error instanceof Error ? error.message : 'Failed to claim winnings',
      }));
      setIsPending(false);
      setWriteError(error as Error);
    }
  }, [address, isConnected, provider]);

  // Update state based on transaction status
  const updateTransactionState = useCallback(() => {
    // Handle Base Account SDK transactions
    if (hash) {
      setState(prev => ({ ...prev, transactionHash: hash }));
    }
    
    if (isConfirmed) {
      setState(prev => ({
        ...prev,
        isApproving: false,
        isJoining: false,
        isSubmitting: false,
        isClaiming: false,
        isSuccess: true,
        error: null,
      }));
    }
    
    if (writeError) {
      setState(prev => ({
        ...prev,
        isApproving: false,
        isJoining: false,
        isSubmitting: false,
        isClaiming: false,
        error: writeError.message,
      }));
    }
  }, [hash, isConfirmed, writeError]);

  // Update state when transaction status changes
  useEffect(() => {
    updateTransactionState();
  }, [updateTransactionState]);

  // Reset state
  const resetState = useCallback(() => {
    setState({
      isApproving: false,
      isJoining: false,
      isSubmitting: false,
      isClaiming: false,
      isStartingSession: false,
      error: null,
      transactionHash: null,
      isSuccess: false,
      useGasless,
      sessionActive: false,
    });
  }, [useGasless]);

  return {
    ...state,
    isPending,
    isConfirming,
    isConfirmed,
    transactionHash: hash,
    sessionInfo,
    contractOwner,
    startSession,
    checkSessionStatus,
    ensureActiveSession,
    approveUSDC,
    joinBattle,
    joinTrialBattle,
    submitScore,
    submitTrialScore,
    claimWinnings,
    resetState,
  };
}