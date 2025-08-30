'use client';

import { useState, useCallback, useEffect } from 'react';
import { TRIVIA_ABI, TRIVIA_CONTRACT_ADDRESS, USDC_CONTRACT_ADDRESS } from '@/lib/blockchain/contracts';
import { ethers } from 'ethers';

export interface SessionInfo {
  startTime: bigint;
  endTime: bigint;
  prizePool: bigint;
  paidPlayerCount: bigint;
  trialPlayerCount: bigint;
  isActive: boolean;
  prizesDistributed: boolean;
}

export interface PlayerScore {
  score: bigint;
  hasSubmitted: boolean;
  submissionTime: bigint;
}

export interface ContractState {
  sessionInfo: SessionInfo | null;
  playerScore: PlayerScore | null;
  trialPlayerScore: PlayerScore | null;
  entryFee: bigint;
  isLoading: boolean;
  error: string | null;
}

export interface UseTriviaContractReturn extends ContractState {
  // Session management
  startSession: (duration: number) => Promise<void>;
  joinBattle: () => Promise<void>;
  joinTrialBattle: (sessionId: string) => Promise<void>;
  
  // Score submission
  submitScore: (score: number) => Promise<void>;
  submitTrialScore: (sessionId: string, score: number) => Promise<void>;
  
  // Prize distribution
  distributePrizes: () => Promise<void>;
  
  // USDC operations
  approveUSDC: (amount?: bigint) => Promise<void>;
  getUSDCBalance: (address: string) => Promise<bigint>;
  getUSDCAllowance: (owner: string, spender: string) => Promise<bigint>;
  
  // Utility functions
  refreshSessionInfo: () => Promise<void>;
  refreshPlayerScore: (address: string) => Promise<void>;
  refreshTrialPlayerScore: (sessionId: string) => Promise<void>;
  
  // Formatting helpers
  formatUSDC: (amount: bigint) => string;
  formatTimeRemaining: (endTime: bigint) => string;
}

export function useTriviaContract(
  walletAddress?: string,
  trialSessionId?: string
): UseTriviaContractReturn {
  const [state, setState] = useState<ContractState>({
    sessionInfo: null,
    playerScore: null,
    trialPlayerScore: null,
    entryFee: BigInt(0),
    isLoading: false,
    error: null,
  });

  // Get provider and signer
  const getProvider = useCallback(() => {
    if (typeof window !== 'undefined' && window.ethereum) {
      return new ethers.BrowserProvider(window.ethereum);
    }
    return null;
  }, []);

  const getSigner = useCallback(async () => {
    const provider = getProvider();
    if (!provider) throw new Error('No provider available');
    return await provider.getSigner();
  }, [getProvider]);

  // Get contract instances
  const getTriviaContract = useCallback(async () => {
    const signer = await getSigner();
    return new ethers.Contract(TRIVIA_CONTRACT_ADDRESS, TRIVIA_ABI, signer);
  }, [getSigner]);

  const getUSDCContract = useCallback(async () => {
    const signer = await getSigner();
    const usdcAbi = [
      'function approve(address spender, uint256 amount) returns (bool)',
      'function balanceOf(address account) view returns (uint256)',
      'function allowance(address owner, address spender) view returns (uint256)',
      'function decimals() view returns (uint8)',
    ];
    return new ethers.Contract(USDC_CONTRACT_ADDRESS, usdcAbi, signer);
  }, [getSigner]);

  // Load initial data
  const loadInitialData = useCallback(async () => {
    if (!getProvider()) return;
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const contract = await getTriviaContract();
      const [sessionInfo, entryFee] = await Promise.all([
        contract.getSessionInfo(),
        contract.ENTRY_FEE(),
      ]);

      setState(prev => ({
        ...prev,
        sessionInfo,
        entryFee,
        isLoading: false,
      }));
    } catch (error) {
      console.error('Error loading initial data:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to load contract data',
        isLoading: false,
      }));
    }
  }, [getProvider, getTriviaContract]);

  // Refresh session info
  const refreshSessionInfo = useCallback(async () => {
    if (!getProvider()) return;
    
    try {
      const contract = await getTriviaContract();
      const sessionInfo = await contract.getSessionInfo();
      setState(prev => ({ ...prev, sessionInfo }));
    } catch (error) {
      console.error('Error refreshing session info:', error);
    }
  }, [getProvider, getTriviaContract]);

  // Refresh player score
  const refreshPlayerScore = useCallback(async (address: string) => {
    if (!getProvider() || !address) return;
    
    try {
      const contract = await getTriviaContract();
      const playerScore = await contract.getPlayerScore(address);
      setState(prev => ({ ...prev, playerScore }));
    } catch (error) {
      console.error('Error refreshing player score:', error);
    }
  }, [getProvider, getTriviaContract]);

  // Refresh trial player score
  const refreshTrialPlayerScore = useCallback(async (sessionId: string) => {
    if (!getProvider() || !sessionId) return;
    
    try {
      const contract = await getTriviaContract();
      const trialPlayerScore = await contract.getTrialPlayerScore(sessionId);
      setState(prev => ({ ...prev, trialPlayerScore }));
    } catch (error) {
      console.error('Error refreshing trial player score:', error);
    }
  }, [getProvider, getTriviaContract]);

  // Start session (owner only)
  const startSession = useCallback(async (duration: number) => {
    if (!getProvider()) throw new Error('No provider available');
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const contract = await getTriviaContract();
      const tx = await contract.startSession(duration);
      await tx.wait();
      
      await refreshSessionInfo();
      setState(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      console.error('Error starting session:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to start session',
        isLoading: false,
      }));
      throw error;
    }
  }, [getProvider, getTriviaContract, refreshSessionInfo]);

  // Join battle (paid player)
  const joinBattle = useCallback(async () => {
    if (!getProvider() || !walletAddress) throw new Error('Wallet not connected');
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const contract = await getTriviaContract();
      const tx = await contract.joinBattle();
      await tx.wait();
      
      await Promise.all([
        refreshSessionInfo(),
        refreshPlayerScore(walletAddress),
      ]);
      
      setState(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      console.error('Error joining battle:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to join battle',
        isLoading: false,
      }));
      throw error;
    }
  }, [getProvider, getTriviaContract, walletAddress, refreshSessionInfo, refreshPlayerScore]);

  // Join trial battle
  const joinTrialBattle = useCallback(async (sessionId: string) => {
    if (!getProvider()) throw new Error('No provider available');
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const contract = await getTriviaContract();
      const tx = await contract.joinTrialBattle(sessionId);
      await tx.wait();
      
      await Promise.all([
        refreshSessionInfo(),
        refreshTrialPlayerScore(sessionId),
      ]);
      
      setState(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      console.error('Error joining trial battle:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to join trial battle',
        isLoading: false,
      }));
      throw error;
    }
  }, [getProvider, getTriviaContract, refreshSessionInfo, refreshTrialPlayerScore]);

  // Submit score (paid player)
  const submitScore = useCallback(async (score: number) => {
    if (!getProvider() || !walletAddress) throw new Error('Wallet not connected');
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const contract = await getTriviaContract();
      const tx = await contract.submitScore(score);
      await tx.wait();
      
      await refreshPlayerScore(walletAddress);
      setState(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      console.error('Error submitting score:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to submit score',
        isLoading: false,
      }));
      throw error;
    }
  }, [getProvider, getTriviaContract, walletAddress, refreshPlayerScore]);

  // Submit trial score
  const submitTrialScore = useCallback(async (sessionId: string, score: number) => {
    if (!getProvider()) throw new Error('No provider available');
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const contract = await getTriviaContract();
      const tx = await contract.submitTrialScore(sessionId, score);
      await tx.wait();
      
      await refreshTrialPlayerScore(sessionId);
      setState(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      console.error('Error submitting trial score:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to submit trial score',
        isLoading: false,
      }));
      throw error;
    }
  }, [getProvider, getTriviaContract, refreshTrialPlayerScore]);

  // Distribute prizes (owner only)
  const distributePrizes = useCallback(async () => {
    if (!getProvider()) throw new Error('No provider available');
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const contract = await getTriviaContract();
      const tx = await contract.distributePrizes();
      await tx.wait();
      
      await refreshSessionInfo();
      setState(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      console.error('Error distributing prizes:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to distribute prizes',
        isLoading: false,
      }));
      throw error;
    }
  }, [getProvider, getTriviaContract, refreshSessionInfo]);

  // USDC operations
  const approveUSDC = useCallback(async (amount?: bigint) => {
    if (!getProvider() || !walletAddress) throw new Error('Wallet not connected');
    
    const approveAmount = amount || state.entryFee;
    if (approveAmount <= 0) throw new Error('Invalid approval amount');
    
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    
    try {
      const usdcContract = await getUSDCContract();
      const tx = await usdcContract.approve(TRIVIA_CONTRACT_ADDRESS, approveAmount);
      await tx.wait();
      
      setState(prev => ({ ...prev, isLoading: false }));
    } catch (error) {
      console.error('Error approving USDC:', error);
      setState(prev => ({
        ...prev,
        error: error instanceof Error ? error.message : 'Failed to approve USDC',
        isLoading: false,
      }));
      throw error;
    }
  }, [getProvider, getUSDCContract, walletAddress, state.entryFee]);

  const getUSDCBalance = useCallback(async (address: string): Promise<bigint> => {
    if (!getProvider()) throw new Error('No provider available');
    
    const usdcContract = await getUSDCContract();
    return await usdcContract.balanceOf(address);
  }, [getProvider, getUSDCContract]);

  const getUSDCAllowance = useCallback(async (owner: string, spender: string): Promise<bigint> => {
    if (!getProvider()) throw new Error('No provider available');
    
    const usdcContract = await getUSDCContract();
    return await usdcContract.allowance(owner, spender);
  }, [getProvider, getUSDCContract]);

  // Utility functions
  const formatUSDC = useCallback((amount: bigint): string => {
    return ethers.formatUnits(amount, 6);
  }, []);

  const formatTimeRemaining = useCallback((endTime: bigint): string => {
    const now = BigInt(Math.floor(Date.now() / 1000));
    const remaining = Number(endTime - now);
    
    if (remaining <= 0) return 'Ended';
    
    const minutes = Math.floor(remaining / 60);
    const seconds = remaining % 60;
    return `${minutes}:${seconds.toString().padStart(2, '0')}`;
  }, []);

  // Load data on mount and when dependencies change
  useEffect(() => {
    loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (walletAddress) {
      refreshPlayerScore(walletAddress);
    }
  }, [walletAddress, refreshPlayerScore]);

  useEffect(() => {
    if (trialSessionId) {
      refreshTrialPlayerScore(trialSessionId);
    }
  }, [trialSessionId, refreshTrialPlayerScore]);

  return {
    ...state,
    startSession,
    joinBattle,
    joinTrialBattle,
    submitScore,
    submitTrialScore,
    distributePrizes,
    approveUSDC,
    getUSDCBalance,
    getUSDCAllowance,
    refreshSessionInfo,
    refreshPlayerScore,
    refreshTrialPlayerScore,
    formatUSDC,
    formatTimeRemaining,
  };
}
