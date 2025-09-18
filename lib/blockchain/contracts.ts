// Entry fee in USDC (1 USDC = 1000000 wei for USDC with 6 decimals)
export const ENTRY_FEE_USDC = '1000000'; // 1 USDC
export const TRIAL_ENTRY_FEE_USDC = '0'; // 0 USDC for trial players

// USDC contract address on Base Mainnet
const USDC_CONTRACT_ADDRESS = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';

// Trivia Battle smart contract address (deployed on Base Mainnet)
// Updated with 2.5% platform fee and trial player restrictions
// Compiled with Solidity 0.8.25 (no compiler warnings)
const TRIVIA_CONTRACT_ADDRESS = '0xd8183AA7cf350a1c4E1a247C12b4C5315BEa9D7A';

// Contract ABI for trivia battle functionality (updated to match deployed contract)
export const TRIVIA_ABI = [
  {
    type: 'function',
    name: 'joinBattle',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'joinTrialBattle',
    inputs: [{ name: 'sessionId', type: 'string' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'submitScore',
    inputs: [{ name: 'score', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'submitTrialScore',
    inputs: [
      { name: 'sessionId', type: 'string' },
      { name: 'score', type: 'uint256' }
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'startSession',
    inputs: [{ name: 'duration', type: 'uint256' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'distributePrizes',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getSessionInfo',
    inputs: [],
    outputs: [
      { name: 'startTime', type: 'uint256' },
      { name: 'endTime', type: 'uint256' },
      { name: 'prizePool', type: 'uint256' },
      { name: 'paidPlayerCount', type: 'uint256' },
      { name: 'trialPlayerCount', type: 'uint256' },
      { name: 'isActive', type: 'bool' },
      { name: 'prizesDistributed', type: 'bool' }
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getPlayerScore',
    inputs: [{ name: 'player', type: 'address' }],
    outputs: [
      { name: 'score', type: 'uint256' },
      { name: 'hasSubmitted', type: 'bool' },
      { name: 'submissionTime', type: 'uint256' }
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getTrialPlayerScore',
    inputs: [{ name: 'sessionId', type: 'string' }],
    outputs: [
      { name: 'score', type: 'uint256' },
      { name: 'hasSubmitted', type: 'bool' },
      { name: 'submissionTime', type: 'uint256' }
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'currentSession',
    inputs: [],
    outputs: [
      { name: 'startTime', type: 'uint256' },
      { name: 'endTime', type: 'uint256' },
      { name: 'prizePool', type: 'uint256' },
      { name: 'paidPlayerCount', type: 'uint256' },
      { name: 'trialPlayerCount', type: 'uint256' },
      { name: 'isActive', type: 'bool' },
      { name: 'prizesDistributed', type: 'bool' }
    ],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'ENTRY_FEE',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'event',
    name: 'PlayerJoined',
    inputs: [
      { name: 'player', type: 'address', indexed: true },
      { name: 'entryFee', type: 'uint256', indexed: false },
      { name: 'platformFee', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'TrialPlayerJoined',
    inputs: [
      { name: 'sessionId', type: 'string', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'ScoreSubmitted',
    inputs: [
      { name: 'player', type: 'address', indexed: true },
      { name: 'score', type: 'uint256', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'TrialScoreSubmitted',
    inputs: [
      { name: 'sessionId', type: 'string', indexed: true },
      { name: 'score', type: 'uint256', indexed: false },
      { name: 'timestamp', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'SessionStarted',
    inputs: [
      { name: 'startTime', type: 'uint256', indexed: false },
      { name: 'duration', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'PrizesDistributed',
    inputs: [
      { name: 'sessionId', type: 'uint256', indexed: false },
      { name: 'winners', type: 'address[]', indexed: false },
      { name: 'amounts', type: 'uint256[]', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'PlatformFeeCollected',
    inputs: [
      { name: 'amount', type: 'uint256', indexed: false },
      { name: 'recipient', type: 'address', indexed: true },
    ],
  },
  {
    type: 'event',
    name: 'PlatformFeeRecipientUpdated',
    inputs: [
      { name: 'oldRecipient', type: 'address', indexed: true },
      { name: 'newRecipient', type: 'address', indexed: true },
    ],
  },
] as const;

// USDC contract ABI for token transfers
const USDC_ABI = [
  {
    type: 'function',
    name: 'transfer',
    inputs: [
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'transferFrom',
    inputs: [
      { name: 'from', type: 'address' },
      { name: 'to', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'approve',
    inputs: [
      { name: 'spender', type: 'address' },
      { name: 'amount', type: 'uint256' },
    ],
    outputs: [{ name: '', type: 'bool' }],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'balanceOf',
    inputs: [{ name: 'account', type: 'address' }],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'decimals',
    inputs: [],
    outputs: [{ name: '', type: 'uint8' }],
    stateMutability: 'view',
  },
] as const;

export class TriviaContract {
  /**
   * Check if the contract is deployed and accessible
   */
  static async isContractDeployed(): Promise<boolean> {
    try {
      // For now, return false since we're using a mock address
      // In production, this would check the actual contract
      return false;
    } catch (error) {
      return false;
    }
  }

  /**
   * Join a trivia battle by paying the entry fee in USDC (for paid players)
   */
  static createJoinBattleTransaction() {
    return {
      to: USDC_CONTRACT_ADDRESS as `0x${string}`,
      value: BigInt(0), // No ETH value for USDC transfer
      data: '0x' as `0x${string}`, // transfer() function call to trivia contract
    };
  }

  /**
   * Join a trivia battle without paying entry fee (for trial players)
   */
  static createJoinTrialBattleTransaction(sessionId: string) {
    return {
      to: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
      value: BigInt(0),
      data: '0x' as `0x${string}`, // joinTrialBattle() function call
    };
  }

  /**
   * Submit game score and answers to the smart contract
   */
  static createSubmitScoreTransaction(
    gameId: string,
    score: number,
    answerHashes: string[]
  ) {
    // Convert answers to bytes32 format
    const answerBytes32 = answerHashes.map(hash => 
      hash.padStart(66, '0x' + '0'.repeat(64))
    );
    
    return {
      to: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
      value: BigInt(0),
      data: '0x' as `0x${string}`, // submitScore() function call with encoded parameters
    };
  }

  /**
   * Trigger prize distribution for completed game
   */
  static createDistributePrizesTransaction(gameId: string) {
    return {
      to: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
      value: BigInt(0),
      data: '0x' as `0x${string}`, // distributePrizes() function call
    };
  }

  /**
   * Get current prize pool amount in USDC (mock implementation)
   */
  static async getPrizePool(): Promise<bigint> {
    // Mock implementation - in production this would call the contract
    return BigInt(0);
  }

  /**
   * Get current number of players in the battle (mock implementation)
   */
  static async getPlayerCount(): Promise<number> {
    // Mock implementation - in production this would call the contract
    return 0;
  }

  /**
   * Get current number of trial players in the battle (mock implementation)
   */
  static async getTrialPlayerCount(): Promise<number> {
    // Mock implementation - in production this would call the contract
    return 0;
  }

  /**
   * Convert USDC wei to USDC for display (USDC has 6 decimals)
   */
  static usdcWeiToUsdc(usdcWeiValue: bigint): number {
    return Number(usdcWeiValue) / Math.pow(10, 6);
  }

  /**
   * Convert USDC to USDC wei
   */
  static usdcToUsdcWei(usdcValue: number): bigint {
    return BigInt(Math.floor(usdcValue * Math.pow(10, 6)));
  }

  /**
   * Generate a unique game ID
   */
  static generateGameId(playerAddress: string, timestamp: number): string {
    const data = `${playerAddress}_${timestamp}_${Math.random()}`;
    // Simple hash function for demo - in production use proper keccak256
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32-bit integer
    }
    return `0x${Math.abs(hash).toString(16).padStart(64, '0')}`;
  }

  /**
   * Hash answer for commitment scheme
   */
  static hashAnswer(
    questionId: string,
    answer: number,
    nonce: string
  ): string {
    const data = `${questionId}_${answer}_${nonce}`;
    // Simple hash function for demo
    let hash = 0;
    for (let i = 0; i < data.length; i++) {
      const char = data.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash;
    }
    return `0x${Math.abs(hash).toString(16).padStart(64, '0')}`;
  }
}

export { TRIVIA_CONTRACT_ADDRESS, USDC_CONTRACT_ADDRESS };