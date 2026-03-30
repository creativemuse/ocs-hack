import { useCallback, useState } from 'react';
import { useAccount } from 'wagmi';
import { encodeFunctionData, parseUnits } from 'viem';
import { useBundlerClient } from './useBundlerClient';
import { 
  USDC_ABI, 
  TRIVIA_ABI, 
  USDC_CONTRACT_ADDRESS, 
  TRIVIA_CONTRACT_ADDRESS, 
  ENTRY_FEE_USDC 
} from '@/lib/blockchain/contracts';

interface GameEntryResult {
  success: boolean;
  transactionHash?: string;
  error?: string;
}

// Paymaster address for ERC-20 gas payments (CDP Paymaster)
const PAYMASTER_ADDRESS = '0x2FAEB0760D4230Ef2aC21496Bb4F0b47D634FD4c';

export function usePaidGameEntryWithERC20Gas() {
  const { address } = useAccount();
  const { bundlerClient, publicClient, isReady } = useBundlerClient();
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<GameEntryResult>({ success: false });
  const [error, setError] = useState<Error | null>(null);

  // Check paymaster allowance
  const checkPaymasterAllowance = useCallback(async (): Promise<bigint> => {
    if (!address || !publicClient) return BigInt(0);

    try {
      const allowance = await publicClient.readContract({
        address: USDC_CONTRACT_ADDRESS as `0x${string}`,
        abi: USDC_ABI,
        functionName: 'allowance',
        args: [address as `0x${string}`, PAYMASTER_ADDRESS as `0x${string}`],
      });
      return allowance as bigint;
    } catch (err) {
      console.error('Failed to check paymaster allowance:', err);
      return BigInt(0);
    }
  }, [address, publicClient]);

  // Join game with ERC-20 gas payment
  const joinGameWithERC20Gas = useCallback(async () => {
    if (!address) {
      throw new Error('No wallet connected');
    }

    if (!isReady || !bundlerClient) {
      throw new Error('Bundler client not ready. Please ensure wallet is connected and paymaster is configured.');
    }

    setIsLoading(true);
    setError(null);
    setResult({ success: false });

    try {
      // Check allowance thresholds
      const minTokenThreshold = parseUnits('1', 6); // $1 USDC minimum
      const tokenApprovalTopUp = parseUnits('20', 6); // $20 USDC top-up
      
      const currentAllowance = await checkPaymasterAllowance();
      const needsPaymasterApproval = currentAllowance < minTokenThreshold;

      console.log('Current paymaster allowance:', currentAllowance.toString());
      console.log('Needs paymaster approval:', needsPaymasterApproval);

      // Prepare calls array
      const calls: Array<{
        to: `0x${string}`;
        value: bigint;
        data: `0x${string}`;
      }> = [];

      // 1. Approve paymaster for ERC-20 gas (if needed)
      if (needsPaymasterApproval) {
        console.log('Adding paymaster approval for ERC-20 gas payment...');
        calls.push({
          to: USDC_CONTRACT_ADDRESS as `0x${string}`,
          value: BigInt(0),
          data: encodeFunctionData({
            abi: USDC_ABI,
            functionName: 'approve',
            args: [PAYMASTER_ADDRESS as `0x${string}`, tokenApprovalTopUp],
          }),
        });
      }

      // 2. Approve contract for entry fee
      const entryFeeWei = parseUnits(ENTRY_FEE_USDC, 6);
      calls.push({
        to: USDC_CONTRACT_ADDRESS as `0x${string}`,
        value: BigInt(0),
        data: encodeFunctionData({
          abi: USDC_ABI,
          functionName: 'approve',
          args: [TRIVIA_CONTRACT_ADDRESS as `0x${string}`, entryFeeWei],
        }),
      });

      // 3. Call your contract
      calls.push({
        to: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
        value: BigInt(0),
        data: encodeFunctionData({
          abi: TRIVIA_ABI,
          functionName: 'joinBattle',
          args: [],
        }),
      });

      console.log(`Sending ${calls.length} batched calls with ERC-20 gas payment...`);

      // Send batched transaction with ERC-20 gas payment
      // The bundler client handles the paymaster integration
      // The paymaster service URL is configured in the bundler client setup
      // ERC-20 gas payment is handled automatically by the CDP Paymaster when configured
      const hash = await bundlerClient.sendUserOperation({
        calls,
      });

      console.log('✅ Transaction with ERC-20 gas payment sent:', hash);

      setResult({
        success: true,
        transactionHash: hash,
      });

      return hash;
    } catch (err) {
      console.error('❌ Transaction with ERC-20 gas payment failed:', err);
      const error = err instanceof Error ? err : new Error('Unknown error occurred');
      setError(error);
      setResult({
        success: false,
        error: error.message,
      });
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [address, bundlerClient, isReady, checkPaymasterAllowance]);

  return {
    joinGameWithERC20Gas,
    result,
    error,
    isLoading,
    isReady,
  };
}

