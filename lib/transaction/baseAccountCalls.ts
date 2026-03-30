import { encodeFunctionData } from 'viem';
import { parseUnits } from 'viem';
import { TRIVIA_ABI, USDC_ABI, ENTRY_FEE_USDC, TRIVIA_CONTRACT_ADDRESS, USDC_CONTRACT_ADDRESS } from '@/lib/blockchain/contracts';

/**
 * Creates Base Account transaction calls for joining a paid game
 * Returns calls in the format expected by BaseAccountTransaction component
 */
export function createBaseAccountPaidGameCalls() {
  const entryFeeWei = parseUnits(ENTRY_FEE_USDC, 6); // USDC has 6 decimals

  return [
    // Step 1: Approve USDC spending for the trivia contract
    {
      to: USDC_CONTRACT_ADDRESS as `0x${string}`,
      value: '0x0' as `0x${string}`,
      data: encodeFunctionData({
        abi: USDC_ABI,
        functionName: 'approve',
        args: [TRIVIA_CONTRACT_ADDRESS as `0x${string}`, entryFeeWei],
      }),
    },
    // Step 2: Join the battle
    {
      to: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
      value: '0x0' as `0x${string}`,
      data: encodeFunctionData({
        abi: TRIVIA_ABI,
        functionName: 'joinBattle',
        args: [],
      }),
    },
  ];
}

/** No on-chain trial entry for this contract; trial uses SpacetimeDB off-chain. */
export function createBaseAccountTrialGameCalls(_sessionId: string) {
  return [] as ReturnType<typeof createBaseAccountPaidGameCalls>;
}
