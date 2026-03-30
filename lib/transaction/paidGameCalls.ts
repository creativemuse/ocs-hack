import { parseUnits } from 'viem';
import { TRIVIA_ABI, USDC_ABI, ENTRY_FEE_USDC, TRIVIA_CONTRACT_ADDRESS, USDC_CONTRACT_ADDRESS } from '@/lib/blockchain/contracts';

/**
 * Creates the transaction calls for joining a paid game
 * This includes both USDC approval and enterGame calls
 */
export function createPaidGameCalls() {
  const entryFeeWei = parseUnits(ENTRY_FEE_USDC, 6); // USDC has 6 decimals

  return [
    // Step 1: Approve USDC spending for the trivia contract
    {
      address: USDC_CONTRACT_ADDRESS as `0x${string}`,
      abi: USDC_ABI,
      functionName: 'approve',
      args: [TRIVIA_CONTRACT_ADDRESS, entryFeeWei],
    },
    // Step 2: Enter the game
    {
      address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
      abi: TRIVIA_ABI,
      functionName: 'joinBattle',
      args: [],
    },
  ];
}

/**
 * Creates transaction calls for trial game entry
 * 
 * NOTE: Trial mode is NOT available on-chain in the TriviaBattle contract.
 * The joinTrialBattle() function does not exist. Trial mode must be implemented
 * off-chain via SpacetimeDB or another off-chain solution.
 * 
 * This function returns null to prevent errors. Do not use for on-chain transactions.
 */
export function createTrialGameCalls(sessionId: string) {
  console.warn('Trial mode is not available on-chain. joinTrialBattle() does not exist in the contract. Trial mode must be implemented off-chain via SpacetimeDB.');
  return null;
}
