'use client';

import { useState, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits } from 'viem';
// import { useTransactionContext } from '@coinbase/onchainkit/transaction';
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

export function useTriviaContract(useGasless: boolean = true, requireSession: boolean = false) {
  const { address, isConnected } = useAccount();
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

  const { writeContract: writeContractAsync, data: hash, error: writeError, isPending } = useWriteContract();
  const { isLoading: isConfirming, isSuccess: isConfirmed } = useWaitForTransactionReceipt({
    hash,
  });

  // Read current game ID
  const { data: currentGameId } = useReadContract({
    address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
    abi: TRIVIA_ABI,
    functionName: 'currentGameId',
  });

  // Read contract to check session status
  const { data: sessionInfo, refetch: refetchSession } = useReadContract({
    address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
    abi: TRIVIA_ABI,
    functionName: 'getGameInfo',
    args: currentGameId ? [currentGameId] : undefined,
    query: {
      enabled: !!currentGameId,
    },
  });

  // Read contract owner
  const { data: contractOwner } = useReadContract({
    address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
    abi: TRIVIA_ABI,
    functionName: 'owner',
  });

  // Note: OnchainKit gasless transactions require Transaction component wrapper
  // For now, we'll use regular wagmi transactions

  // Start a new trivia session
  const startSession = useCallback(async (duration: number = 300) => { // 5 minutes default
    if (!address || !isConnected) {
      setState(prev => ({ ...prev, error: 'Wallet not connected' }));
      return false;
    }

    setState(prev => ({ ...prev, isStartingSession: true, error: null }));

    try {
      console.log('Starting new trivia session with duration:', duration);
      console.log('⚠️  WARNING: Only contract owner can start sessions!');
      console.log('Current user address:', address);
      console.log('Contract address:', TRIVIA_CONTRACT_ADDRESS);
      
      await writeContractAsync({
        address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
        abi: TRIVIA_ABI,
        functionName: 'createGame',
      });
      
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
      return false;
    }
  }, [address, isConnected, writeContractAsync]);

  // Check if session is active
  const checkSessionStatus = useCallback(async () => {
    try {
      console.log('Checking session status...');
      const result = await refetchSession();
      console.log('Session refetch result:', result);
      
      if (result.data) {
        const [prizePool, platformFee, playerCount, startTime, endTime, isActive, isFinalized, rankingsSubmitted] = result.data as [bigint, bigint, bigint, bigint, bigint, boolean, boolean, boolean];
        const now = BigInt(Math.floor(Date.now() / 1000));
        
        // More lenient session validation - just check if isActive is true
        const sessionActive = isActive;
        
        setState(prev => ({ ...prev, sessionActive }));
        console.log('Session status:', { 
          isActive, 
          sessionActive, 
          startTime: startTime.toString(), 
          endTime: endTime.toString(), 
          now: now.toString(),
          playerCount: playerCount.toString(),
          prizePool: prizePool.toString()
        });
        return sessionActive;
      } else {
        console.log('No session data available');
        setState(prev => ({ ...prev, sessionActive: false }));
        return false;
      }
    } catch (error) {
      console.error('Error checking session status:', error);
      setState(prev => ({ ...prev, sessionActive: false }));
      return false;
    }
  }, [refetchSession]);

  // Ensure session is active before joining
  const ensureActiveSession = useCallback(async () => {
    // If session management is not required, just return true
    if (!requireSession) {
      console.log('Session management not required, proceeding...');
      return true;
    }
    
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
      
      if (contractOwner && contractOwner !== address) {
        console.error('🚨 CRITICAL: You are not the contract owner!');
        console.error('Only the contract owner can start sessions.');
        console.error('Contract owner:', contractOwner);
        console.error('Your address:', address);
        console.error('Please contact the contract owner to start a session.');
        
        setState(prev => ({
          ...prev,
          error: `Only contract owner can start sessions. Owner: ${contractOwner}`,
        }));
        
        return false; // Don't allow transaction if user is not owner
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
  }, [checkSessionStatus, startSession, requireSession, contractOwner, address]);

  // Approve USDC spending for the trivia contract
  const approveUSDC = useCallback(async () => {
    if (!address || !isConnected) {
      setState(prev => ({ ...prev, error: 'Wallet not connected' }));
      return;
    }

    setState(prev => ({ ...prev, isApproving: true, error: null }));

    try {
      const entryFeeWei = parseUnits(ENTRY_FEE_USDC.toString(), 6); // USDC has 6 decimals
      
      // Use regular wagmi transaction (gasless transactions require Transaction component wrapper)
      await writeContractAsync({
        address: USDC_CONTRACT_ADDRESS as `0x${string}`,
        abi: USDC_ABI,
        functionName: 'approve',
        args: [TRIVIA_CONTRACT_ADDRESS, entryFeeWei],
      });
    } catch (error) {
      console.error('Error approving USDC:', error);
      setState(prev => ({
        ...prev,
        isApproving: false,
        error: error instanceof Error ? error.message : 'Failed to approve USDC',
      }));
    }
    }, [address, isConnected, writeContractAsync]);

  // Join the trivia battle (paid players)
  const joinBattle = useCallback(async () => {
    if (!address || !isConnected) {
      setState(prev => ({ ...prev, error: 'Wallet not connected' }));
      return;
    }

    setState(prev => ({ ...prev, isJoining: true, error: null }));

    try {
      // First ensure there's an active session
      console.log('Ensuring active session before joining battle...');
      const sessionActive = await ensureActiveSession();
      
      if (!sessionActive) {
        throw new Error('Failed to start or find active session');
      }
      
      console.log('Session is active, proceeding with join battle...');
      
      // Use regular wagmi transaction (gasless transactions require Transaction component wrapper)
      await writeContractAsync({
        address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
        abi: TRIVIA_ABI,
        functionName: 'enterGame',
      });
    } catch (error) {
      console.error('Error joining battle:', error);
      setState(prev => ({
        ...prev,
        isJoining: false,
        error: error instanceof Error ? error.message : 'Failed to join battle',
      }));
    }
    }, [address, isConnected, writeContractAsync, ensureActiveSession]);

  // Join trial battle (trial players)
  const joinTrialBattle = useCallback(async (sessionId: string) => {
    if (!address || !isConnected) {
      setState(prev => ({ ...prev, error: 'Wallet not connected' }));
      return;
    }

    setState(prev => ({ ...prev, isJoining: true, error: null }));

    try {
      // First ensure there's an active session
      console.log('Ensuring active session before joining trial battle...');
      const sessionActive = await ensureActiveSession();
      
      if (!sessionActive) {
        throw new Error('Failed to start or find active session');
      }
      
      console.log('Session is active, proceeding with join trial battle...');
      
      // Use regular wagmi transaction (gasless transactions require Transaction component wrapper)
      await writeContractAsync({
        address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
        abi: TRIVIA_ABI,
        functionName: 'enterGame',
      });
    } catch (error) {
      console.error('Error joining trial battle:', error);
      setState(prev => ({
        ...prev,
        isJoining: false,
        error: error instanceof Error ? error.message : 'Failed to join trial battle',
      }));
    }
    }, [address, isConnected, writeContractAsync, ensureActiveSession]);

  // Submit score
  const submitScore = useCallback(async (score: number) => {
    if (!address || !isConnected) {
      setState(prev => ({ ...prev, error: 'Wallet not connected' }));
      return;
    }

    setState(prev => ({ ...prev, isSubmitting: true, error: null }));

    try {
      // Use regular wagmi transaction (gasless transactions require Transaction component wrapper)
      await writeContractAsync({
        address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
        abi: TRIVIA_ABI,
        functionName: 'enterGame',
      });
    } catch (error) {
      console.error('Error submitting score:', error);
      setState(prev => ({
        ...prev,
        isSubmitting: false,
        error: error instanceof Error ? error.message : 'Failed to submit score',
      }));
    }
    }, [address, isConnected, writeContractAsync]);

  // Submit trial score
  const submitTrialScore = useCallback(async (sessionId: string, score: number) => {
    if (!address || !isConnected) {
      setState(prev => ({ ...prev, error: 'Wallet not connected' }));
      return;
    }

    setState(prev => ({ ...prev, isSubmitting: true, error: null }));

    try {
      // Use regular wagmi transaction (gasless transactions require Transaction component wrapper)
      await writeContractAsync({
        address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
        abi: TRIVIA_ABI,
        functionName: 'enterGame',
      });
    } catch (error) {
      console.error('Error submitting trial score:', error);
      setState(prev => ({
        ...prev,
        isSubmitting: false,
        error: error instanceof Error ? error.message : 'Failed to submit trial score',
      }));
    }
    }, [address, isConnected, writeContractAsync]);

  // Claim winnings (calls smart contract claimWinnings function)
  const claimWinnings = useCallback(async (winningAmount: string) => {
    if (!address || !isConnected) {
      setState(prev => ({ ...prev, error: 'Wallet not connected' }));
      return;
    }

    setState(prev => ({ ...prev, isClaiming: true, error: null }));

    try {
      console.log(`Claiming ${winningAmount} USDC for player ${address}`);
      
      // Call the smart contract claimPrize function
      await writeContractAsync({
        address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
        abi: TRIVIA_ABI,
        functionName: 'claimPrize',
        args: [currentGameId || BigInt(0)],
      });
      
      console.log('✅ Claim winnings transaction submitted');
    } catch (error) {
      console.error('Error claiming winnings:', error);
      setState(prev => ({
        ...prev,
        isClaiming: false,
        error: error instanceof Error ? error.message : 'Failed to claim winnings',
      }));
    }
  }, [address, isConnected, writeContractAsync]);

  // Update state based on transaction status
  const updateTransactionState = useCallback(() => {
    // Handle regular wagmi transactions
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

    // Note: Gasless transactions would require Transaction component wrapper
  }, [hash, isConfirmed, writeError]);

  // Update state when transaction status changes
  useState(() => {
    updateTransactionState();
  });

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