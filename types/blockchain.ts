export interface PaymentResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

export interface PrizeDistribution {
  first: number;
  second: number; 
  third: number;
  participation: number;
}

export interface BlockchainGameState {
  gameId: string;
  playerAddress: string;
  entryFeePaid: boolean;
  paymentTransactionHash?: string;
  scoreSubmitted: boolean;
  scoreTransactionHash?: string;
  finalRank?: number;
  prizeEarned?: number;
  prizeTransactionHash?: string;
}

export interface RealTimePrizePool {
  totalAmount: number;     // Real ETH amount from blockchain
  entryFee: number;        // 0.01 ETH
  participants: number;    // Real player count from contract
  distribution: PrizeDistribution;
  contractAddress: string;
  networkName: string;
  blockExplorerUrl: string;
}

export interface GameTransaction {
  type: 'entry' | 'score-submission' | 'prize-distribution';
  hash: string;
  timestamp: number;
  amount?: number;
  status: 'pending' | 'confirmed' | 'failed';
  gasUsed?: string;
  blockNumber?: number;
}

export interface PlayerWalletState {
  address: string;
  balance: number;         // ETH balance
  canAffordEntry: boolean;
  estimatedGasCosts: {
    joinBattle: string;
    submitScore: string;
  };
}

export interface ContractEvent {
  event: 'PlayerJoined' | 'ScoresSubmitted' | 'PrizesDistributed';
  player?: string;
  gameId?: string;
  amount?: number;
  timestamp: number;
  transactionHash: string;
}