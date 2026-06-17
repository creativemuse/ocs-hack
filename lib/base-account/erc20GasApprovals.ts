import { createPublicClient, encodeFunctionData, http, parseUnits } from 'viem';
import { base } from 'viem/chains';
import { USDC_ABI, USDC_CONTRACT_ADDRESS } from '@/lib/blockchain/contracts';
import {
  CDP_PAYMASTER_ADDRESS,
  ERC20_GAS_APPROVAL_TOP_UP_USDC,
  ERC20_GAS_MIN_USDC_ALLOWANCE,
  PAYMASTER_URL,
} from '@/lib/base-account/config';
import type { BatchCallInput } from '@/lib/base-account/batchCalls';

const MIN_ALLOWANCE = parseUnits(ERC20_GAS_MIN_USDC_ALLOWANCE, 6);
const TOP_UP_ALLOWANCE = parseUnits(ERC20_GAS_APPROVAL_TOP_UP_USDC, 6);

const publicClient = createPublicClient({
  chain: base,
  transport: http(process.env.NEXT_PUBLIC_BASE_RPC_URL ?? 'https://mainnet.base.org'),
});

export const isErc20GasPaymentAvailable = (): boolean =>
  Boolean(PAYMASTER_URL && CDP_PAYMASTER_ADDRESS && USDC_CONTRACT_ADDRESS);

export const getPaymasterUsdcAllowance = async (
  owner: `0x${string}`,
): Promise<bigint> => {
  return publicClient.readContract({
    address: USDC_CONTRACT_ADDRESS as `0x${string}`,
    abi: USDC_ABI,
    functionName: 'allowance',
    args: [owner, CDP_PAYMASTER_ADDRESS],
  });
};

export const buildPaymasterApprovalCall = (): BatchCallInput => ({
  to: USDC_CONTRACT_ADDRESS as `0x${string}`,
  value: '0x0',
  data: encodeFunctionData({
    abi: USDC_ABI,
    functionName: 'approve',
    args: [CDP_PAYMASTER_ADDRESS, TOP_UP_ALLOWANCE],
  }),
});

/**
 * Prepends a USDC approve for the CDP paymaster when allowance is below threshold.
 * Enables gas payment in USDC when full sponsorship is unavailable.
 */
export const withPaymasterApprovalCalls = async (
  owner: string,
  calls: BatchCallInput[],
): Promise<BatchCallInput[]> => {
  if (!isErc20GasPaymentAvailable() || !owner.startsWith('0x')) {
    return calls;
  }

  try {
    const allowance = await getPaymasterUsdcAllowance(owner as `0x${string}`);
    if (allowance >= MIN_ALLOWANCE) {
      return calls;
    }
    return [buildPaymasterApprovalCall(), ...calls];
  } catch (error) {
    console.warn('Could not check paymaster USDC allowance:', error);
    return calls;
  }
};
