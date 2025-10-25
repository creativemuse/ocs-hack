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
      functionName: 'enterGame',
      args: [],
    },
  ];
}

/**
 * Creates transaction calls for trial game entry
 */
export function createTrialGameCalls(sessionId: string) {
  return [
    {
      address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
      abi: TRIVIA_ABI,
      functionName: 'joinTrialBattle',
      args: [sessionId],
    },
  ];
}
