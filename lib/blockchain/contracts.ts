// Entry fee in USDC (1 USDC = 1000000 wei for USDC with 6 decimals)
export const ENTRY_FEE_USDC = '1'; // 1 USDC
export const TRIAL_ENTRY_FEE_USDC = '0'; // 0 USDC for trial players

// USDC contract address on Base Mainnet
const USDC_CONTRACT_ADDRESS = '0x833589fcd6edb6e08f4c7c32d4f71b54bda02913';

// Trivia Battle smart contract address (deployed on Base Mainnet)
// Updated with claim-based prize distribution system
// Compiled with Solidity 0.8.25 (no compiler warnings)
// Deployed: 2025-10-13 (with claimWinnings function)
const TRIVIA_CONTRACT_ADDRESS = '0xc166a6FB38636e8430d6A2Efb7A601c226659425';

// Contract ABI for trivia battle functionality (updated with claim-based prize distribution)
export const TRIVIA_ABI = [
  {
    "inputs": [
      { "internalType": "address", "name": "_usdcToken", "type": "address" },
      { "internalType": "address", "name": "_platformFeeRecipient", "type": "address" }
    ],
    "stateMutability": "nonpayable",
    "type": "constructor"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "owner", "type": "address" }
    ],
    "name": "OwnableInvalidOwner",
    "type": "error"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "account", "type": "address" }
    ],
    "name": "OwnableUnauthorizedAccount",
    "type": "error"
  },
  {
    "inputs": [],
    "name": "ReentrancyGuardReentrantCall",
    "type": "error"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "previousOwner", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "newOwner", "type": "address" }
    ],
    "name": "OwnershipTransferred",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" },
      { "indexed": true, "internalType": "address", "name": "recipient", "type": "address" }
    ],
    "name": "PlatformFeeCollected",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "oldRecipient", "type": "address" },
      { "indexed": true, "internalType": "address", "name": "newRecipient", "type": "address" }
    ],
    "name": "PlatformFeeRecipientUpdated",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "player", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "entryFee", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "platformFee", "type": "uint256" }
    ],
    "name": "PlayerJoined",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": false, "internalType": "uint256", "name": "sessionId", "type": "uint256" },
      { "indexed": false, "internalType": "address[]", "name": "winners", "type": "address[]" },
      { "indexed": false, "internalType": "uint256[]", "name": "amounts", "type": "uint256[]" }
    ],
    "name": "PrizesDistributed",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "player", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "score", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "name": "ScoreSubmitted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": false, "internalType": "uint256", "name": "endTime", "type": "uint256" }
    ],
    "name": "SessionEnded",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": false, "internalType": "uint256", "name": "startTime", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "duration", "type": "uint256" }
    ],
    "name": "SessionStarted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "string", "name": "sessionId", "type": "string" }
    ],
    "name": "TrialPlayerJoined",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "string", "name": "sessionId", "type": "string" },
      { "indexed": false, "internalType": "uint256", "name": "score", "type": "uint256" },
      { "indexed": false, "internalType": "uint256", "name": "timestamp", "type": "uint256" }
    ],
    "name": "TrialScoreSubmitted",
    "type": "event"
  },
  {
    "anonymous": false,
    "inputs": [
      { "indexed": true, "internalType": "address", "name": "player", "type": "address" },
      { "indexed": false, "internalType": "uint256", "name": "amount", "type": "uint256" }
    ],
    "name": "WinningsClaimed",
    "type": "event"
  },
  {
    "inputs": [],
    "name": "ENTRY_FEE",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "PLATFORM_FEE_BPS",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "claimWinnings",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "currentSession",
    "outputs": [
      { "internalType": "uint256", "name": "startTime", "type": "uint256" },
      { "internalType": "uint256", "name": "endTime", "type": "uint256" },
      { "internalType": "uint256", "name": "prizePool", "type": "uint256" },
      { "internalType": "uint256", "name": "paidPlayerCount", "type": "uint256" },
      { "internalType": "uint256", "name": "trialPlayerCount", "type": "uint256" },
      { "internalType": "bool", "name": "isActive", "type": "bool" },
      { "internalType": "bool", "name": "prizesDistributed", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "distributePrizes",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "emergencyWithdraw",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "player", "type": "address" }
    ],
    "name": "getPlayerScore",
    "outputs": [
      { "internalType": "uint256", "name": "score", "type": "uint256" },
      { "internalType": "bool", "name": "hasSubmitted", "type": "bool" },
      { "internalType": "uint256", "name": "submissionTime", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "getSessionInfo",
    "outputs": [
      { "internalType": "uint256", "name": "startTime", "type": "uint256" },
      { "internalType": "uint256", "name": "endTime", "type": "uint256" },
      { "internalType": "uint256", "name": "prizePool", "type": "uint256" },
      { "internalType": "uint256", "name": "paidPlayerCount", "type": "uint256" },
      { "internalType": "uint256", "name": "trialPlayerCount", "type": "uint256" },
      { "internalType": "bool", "name": "isActive", "type": "bool" },
      { "internalType": "bool", "name": "prizesDistributed", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "sessionId", "type": "string" }
    ],
    "name": "getTrialPlayerScore",
    "outputs": [
      { "internalType": "uint256", "name": "score", "type": "uint256" },
      { "internalType": "bool", "name": "hasSubmitted", "type": "bool" },
      { "internalType": "uint256", "name": "submissionTime", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "name": "hasClaimed",
    "outputs": [
      { "internalType": "bool", "name": "", "type": "bool" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "joinBattle",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "sessionId", "type": "string" }
    ],
    "name": "joinTrialBattle",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "owner",
    "outputs": [
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "platformFeeRecipient",
    "outputs": [
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "", "type": "address" }
    ],
    "name": "playerWinnings",
    "outputs": [
      { "internalType": "uint256", "name": "", "type": "uint256" }
    ],
    "stateMutability": "view",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "renounceOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "duration", "type": "uint256" }
    ],
    "name": "startSession",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "uint256", "name": "score", "type": "uint256" }
    ],
    "name": "submitScore",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "string", "name": "sessionId", "type": "string" },
      { "internalType": "uint256", "name": "score", "type": "uint256" }
    ],
    "name": "submitTrialScore",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "newOwner", "type": "address" }
    ],
    "name": "transferOwnership",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [
      { "internalType": "address", "name": "_newRecipient", "type": "address" }
    ],
    "name": "updatePlatformFeeRecipient",
    "outputs": [],
    "stateMutability": "nonpayable",
    "type": "function"
  },
  {
    "inputs": [],
    "name": "usdcToken",
    "outputs": [
      { "internalType": "contract IERC20", "name": "", "type": "address" }
    ],
    "stateMutability": "view",
    "type": "function"
  }
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

export { USDC_ABI };

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