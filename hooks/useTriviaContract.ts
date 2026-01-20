'use client';

import { useState, useCallback } from 'react';
import { useAccount, useWriteContract, useWaitForTransactionReceipt, useReadContract } from 'wagmi';
import { parseUnits } from 'viem';
// import { useTransactionContext } from '@coinbase/onchainkit/transaction';
import { TRIVIA_ABI, USDC_ABI, ENTRY_FEE_USDC, TRIVIA_CONTRACT_ADDRESS, USDC_CONTRACT_ADDRESS } from '@/lib/blockchain/contracts';

// Contract owner (not currently fetched, set to undefined)
const contractOwner: string | undefined = undefined;

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

  // Read current session counter
  const { data: sessionCounter } = useReadContract({
    address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
    abi: TRIVIA_ABI,
    functionName: 'sessionCounter',
  });

  // Read session active status
  const { data: isSessionActive, refetch: refetchSession } = useReadContract({
    address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
    abi: TRIVIA_ABI,
    functionName: 'isSessionActive',
  });

  // Read current session prize pool
  const { data: currentSessionPrizePool } = useReadContract({
    address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
    abi: TRIVIA_ABI,
    functionName: 'currentSessionPrizePool',
  });

  // Read session interval
  const { data: sessionInterval, refetch: refetchSessionInterval } = useReadContract({
    address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
    abi: TRIVIA_ABI,
    functionName: 'sessionInterval',
  });

  // Read last session time
  const { data: lastSessionTime, refetch: refetchLastSessionTime } = useReadContract({
    address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
    abi: TRIVIA_ABI,
    functionName: 'lastSessionTime',
  });

  // Contract owner is fetched via wagmi hook below if needed

  // Note: OnchainKit gasless transactions require Transaction component wrapper
  // For now, we'll use regular wagmi transactions

  // Start a new trivia session
  // Note: New contract uses startNewSession() with no parameters (uses configured sessionInterval)
  const startSession = useCallback(async () => {
    if (!address || !isConnected) {
      setState(prev => ({ ...prev, error: 'Wallet not connected' }));
      return false;
    }

    setState(prev => ({ ...prev, isStartingSession: true, error: null }));

    try {
      console.log('Starting new trivia session...');
      console.log('⚠️  WARNING: Only contract owner can start sessions!');
      console.log('Current user address:', address);
      console.log('Contract address:', TRIVIA_CONTRACT_ADDRESS);
      
      await writeContractAsync({
        address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
        abi: TRIVIA_ABI,
        functionName: 'startNewSession',
        args: [],
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
      
      // isSessionActive is a boolean from the contract
      const isActive = Boolean(result?.data ?? false);
      
      setState(prev => ({ ...prev, sessionActive: isActive }));
      console.log('Session status:', { isActive });
      return isActive;
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
      
      console.log('✅ You are the contract owner, checking session interval...');
      
      // Check if enough time has elapsed since last session
      // Note: If values aren't loaded yet, we'll proceed and let the contract validate
      if (sessionInterval !== undefined && lastSessionTime !== undefined && sessionInterval !== null && lastSessionTime !== null) {
        const currentTime = BigInt(Math.floor(Date.now() / 1000));
        const lastSession = BigInt(lastSessionTime.toString());
        const interval = BigInt(sessionInterval.toString());
        const nextSessionTime = lastSession + interval;
        
        if (currentTime < nextSessionTime) {
          const timeRemaining = Number(nextSessionTime - currentTime);
          const daysRemaining = Math.floor(timeRemaining / 86400);
          const hoursRemaining = Math.floor((timeRemaining % 86400) / 3600);
          const minutesRemaining = Math.floor((timeRemaining % 3600) / 60);
          const nextSessionDate = new Date(Number(nextSessionTime) * 1000);
          
          let timeMessage = '';
          if (daysRemaining > 0) {
            timeMessage = `${daysRemaining}d ${hoursRemaining}h`;
          } else if (hoursRemaining > 0) {
            timeMessage = `${hoursRemaining}h ${minutesRemaining}m`;
          } else {
            timeMessage = `${minutesRemaining}m`;
          }
          
          const errorMessage = `Session interval not elapsed. Next session can start in ${timeMessage} (${nextSessionDate.toLocaleString()})`;
          console.error('⏰', errorMessage);
          
          setState(prev => ({
            ...prev,
            error: errorMessage,
          }));
          
          return false;
        }
      } else {
        console.log('⚠️ Session interval data not loaded yet, proceeding with contract validation...');
      }
      
      console.log('✅ Session interval has elapsed, attempting to start session...');
      
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
        
        // Check if the error is about session interval
        const errorMessage = sessionError instanceof Error ? sessionError.message : String(sessionError);
        const errorString = JSON.stringify(sessionError);
        if (errorMessage.includes('SessionIntervalNotElapsed') || 
            errorString.includes('SessionIntervalNotElapsed') ||
            errorMessage.includes('session interval') ||
            errorMessage.includes('interval not elapsed')) {
          // Re-read the values to get the most current data
          const [intervalResult, lastTimeResult] = await Promise.all([
            refetchSessionInterval(),
            refetchLastSessionTime(),
          ]);
          const interval = intervalResult.data ? BigInt(intervalResult.data.toString()) : null;
          const lastTime = lastTimeResult.data ? BigInt(lastTimeResult.data.toString()) : null;
          
          if (interval && lastTime) {
            const currentTime = BigInt(Math.floor(Date.now() / 1000));
            const nextSessionTime = lastTime + interval;
            const timeRemaining = Number(nextSessionTime - currentTime);
            const daysRemaining = Math.floor(timeRemaining / 86400);
            const hoursRemaining = Math.floor((timeRemaining % 86400) / 3600);
            const minutesRemaining = Math.floor((timeRemaining % 3600) / 60);
            const nextSessionDate = new Date(Number(nextSessionTime) * 1000);
            
            let timeMessage = '';
            if (daysRemaining > 0) {
              timeMessage = `${daysRemaining}d ${hoursRemaining}h`;
            } else if (hoursRemaining > 0) {
              timeMessage = `${hoursRemaining}h ${minutesRemaining}m`;
            } else {
              timeMessage = `${minutesRemaining}m`;
            }
            
            const friendlyError = `Session interval not elapsed. Next session can start in ${timeMessage} (${nextSessionDate.toLocaleString()})`;
            
            setState(prev => ({
              ...prev,
              error: friendlyError,
            }));
          } else {
            setState(prev => ({
              ...prev,
              error: 'Session interval not elapsed. Please wait before starting a new session.',
            }));
          }
        } else {
          setState(prev => ({
            ...prev,
            error: errorMessage,
          }));
        }
        
        return false;
      }
      
    } catch (error) {
      console.error('Error in ensureActiveSession:', error);
      return false;
    }
  }, [checkSessionStatus, startSession, requireSession, contractOwner, address, sessionInterval, lastSessionTime]);

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
        args: [TRIVIA_CONTRACT_ADDRESS as `0x${string}`, entryFeeWei],
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
        functionName: 'joinBattle',
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
  // NOTE: This function does NOT exist in the deployed contract
  // Trial mode must be implemented off-chain (e.g., via SpacetimeDB)
  const joinTrialBattle = useCallback(async (sessionId: string) => {
    const errorMessage = 'Trial mode is not available on-chain. Trial battles must be implemented off-chain via SpacetimeDB. Use joinBattle() to join as a paid player.';
    console.error(errorMessage);
    setState(prev => ({
      ...prev,
      isJoining: false,
      error: errorMessage,
    }));
    throw new Error(errorMessage);
  }, []);

  // Submit score
  // NOTE: This function does NOT exist for regular players in the deployed contract
  // Contract has submitScores(address[] calldata, uint256[] calldata) for batch submission by owner/chainlink only
  // Scores should be tracked off-chain during gameplay, then submitted in batch after session ends
  const submitScore = useCallback(async (score: number) => {
    const errorMessage = 'Individual score submission is not available. Scores are submitted in batch by owner/chainlink via submitScores() after the session ends. Your score will be tracked off-chain during gameplay.';
    console.error(errorMessage);
    setState(prev => ({
      ...prev,
      isSubmitting: false,
      error: errorMessage,
    }));
    throw new Error(errorMessage);
  }, []);

  // Submit trial score
  // NOTE: This function does NOT exist in the deployed contract
  // Trial mode must be implemented off-chain (e.g., via SpacetimeDB)
  const submitTrialScore = useCallback(async (sessionId: string, score: number) => {
    const errorMessage = 'Trial score submission is not available on-chain. Trial mode must be implemented off-chain via SpacetimeDB.';
    console.error(errorMessage);
    setState(prev => ({
      ...prev,
      isSubmitting: false,
      error: errorMessage,
    }));
    throw new Error(errorMessage);
  }, []);

  // Claim winnings - NOTE: TriviaBattle.sol auto-distributes prizes via distributePrizes()
  // There is no claimPrize() function. Prizes are automatically sent to winners when
  // distributePrizes() is called by the owner or Chainlink automation.
  const claimWinnings = useCallback(async (winningAmount: string) => {
    const errorMessage = 'Prizes are automatically distributed when the session ends. There is no claim function. Check your wallet for USDC transfers after prize distribution.';
    console.warn(errorMessage);
    setState(prev => ({
      ...prev,
      isClaiming: false,
      error: errorMessage,
    }));
    throw new Error(errorMessage);
  }, []);

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
    sessionCounter,
    isSessionActive,
    currentSessionPrizePool,
    sessionInterval,
    lastSessionTime,
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