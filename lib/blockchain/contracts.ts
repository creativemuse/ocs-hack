// Entry fee in USDC (1 USDC = 1000000 wei for USDC with 6 decimals)
export const ENTRY_FEE_USDC = '1000000'; // 1 USDC
export const TRIAL_ENTRY_FEE_USDC = '0'; // 0 USDC for trial players

// USDC contract address on Base Sepolia (mock address for demo)
// TODO: Replace with actual USDC contract address when ready for production
const USDC_CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000002';

// Trivia Battle smart contract address (mock address for demo)
// TODO: Replace with actual deployed contract address when ready for production
const TRIVIA_CONTRACT_ADDRESS = '0x0000000000000000000000000000000000000001';

// Contract ABI for trivia battle functionality
const TRIVIA_ABI = [
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
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'submitScore',
    inputs: [
      { name: 'gameId', type: 'bytes32' },
      { name: 'score', type: 'uint256' },
      { name: 'answers', type: 'bytes32[]' },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'distributePrizes',
    inputs: [{ name: 'gameId', type: 'bytes32' }],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getPrizePool',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getPlayerCount',
    inputs: [],
    outputs: [{ name: '', type: 'uint256' }],
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'getTrialPlayerCount',
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
    ],
  },
  {
    type: 'event',
    name: 'TrialPlayerJoined',
    inputs: [
      { name: 'player', type: 'address', indexed: true },
      { name: 'sessionId', type: 'string', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'ScoreSubmitted',
    inputs: [
      { name: 'player', type: 'address', indexed: true },
      { name: 'gameId', type: 'bytes32', indexed: true },
      { name: 'score', type: 'uint256', indexed: false },
    ],
  },
  {
    type: 'event',
    name: 'PrizesDistributed',
    inputs: [
      { name: 'gameId', type: 'bytes32', indexed: true },
      { name: 'totalPool', type: 'uint256', indexed: false },
      { name: 'winners', type: 'address[]', indexed: false },
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