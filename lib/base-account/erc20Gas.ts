import { createBaseAccountSDK } from '@base-org/account';
import { base } from 'viem/chains';
import { Contract, parseUnits, formatUnits, JsonRpcProvider } from 'ethers';

const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS as string;
const PAYMASTER_ENDPOINT = process.env.NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT;
const rpc = new JsonRpcProvider(process.env.NEXT_PUBLIC_RPC_URL || undefined);

if (!USDC_ADDRESS) {
  console.error('Missing environment variable: NEXT_PUBLIC_USDC_ADDRESS');
}

if (!PAYMASTER_ENDPOINT) {
  console.warn('Missing environment variable: NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT - ERC20 gas payments will not be available');
}

/**
 * Checks if ERC20 gas payments are available and configured.
 */
export function isERC20GasEnabled(): boolean {
  return !!(USDC_ADDRESS && PAYMASTER_ENDPOINT);
}

/**
 * Gets the current ERC20 gas configuration.
 */
export function getERC20GasConfig(): {
  isEnabled: boolean;
  usdcAddress?: string;
  paymasterEndpoint?: string;
  error?: string;
} {
  if (!USDC_ADDRESS) {
    return {
      isEnabled: false,
      error: 'USDC address not configured'
    };
  }

  if (!PAYMASTER_ENDPOINT) {
    return {
      isEnabled: false,
      error: 'Paymaster endpoint not configured'
    };
  }

  return {
    isEnabled: true,
    usdcAddress: USDC_ADDRESS,
    paymasterEndpoint: PAYMASTER_ENDPOINT
  };
}

/**
 * Estimates the gas cost for a transaction in USDC.
 */
export async function estimateGasCostInUSDC(
  transaction: {
    to: string;
    data: string;
    value?: string;
  }
): Promise<{
  gasCost: string; // Gas cost in USDC
  gasLimit: string;
  gasPrice: string;
  error?: string;
}> {
  const sdk = createBaseAccountSDK({
    appName: 'BEAT ME',
    appLogoUrl: 'https://base.org/logo.png',
    appChainIds: [base.id],
    subAccounts: { creation: 'on-connect', defaultAccount: 'sub' },
    paymasterUrls: process.env.NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT ? [process.env.NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT] : undefined,
  });

  if (!isERC20GasEnabled()) {
    return { gasCost: '0', gasLimit: '0', gasPrice: '0', error: 'ERC20 gas payments not enabled' };
  }

  try {
    const provider = sdk.getProvider();
    
    // Estimate gas limit via EIP-1193
    const gasLimitHex = (await provider.request({
      method: 'eth_estimateGas',
      params: [{
        to: transaction.to,
        data: transaction.data,
        value: transaction.value || '0'
      }]
    })) as string;
    const gasLimit = BigInt(gasLimitHex);

    // Get current gas price via EIP-1193
    const gasPriceHex = (await provider.request({ method: 'eth_gasPrice', params: [] })) as string;
    const gasPrice = BigInt(gasPriceHex || '0x2540be400'); // fallback ~10 gwei

    // Calculate gas cost in wei (bigint)
    const gasCostWei = gasLimit * gasPrice;

    // Convert to USDC (assuming 6 decimals)
    // Note: This is a simplified calculation. In practice, you'd need to get the ETH/USDC exchange rate
    const gasCostUSDC = formatUnits(gasCostWei, 6);

    return {
      gasCost: gasCostUSDC,
      gasLimit: gasLimit.toString(),
      gasPrice: gasPrice.toString()
    };

  } catch (error: any) {
    console.error('Error estimating gas cost:', error);
    return {
      gasCost: '0',
      gasLimit: '0',
      gasPrice: '0',
      error: error.message || 'Failed to estimate gas cost'
    };
  }
}

/**
 * Sends a transaction with ERC20 gas payment using the CDP Paymaster.
 */
export async function sendTransactionWithERC20Gas(
  transaction: {
    to: string;
    data: string;
    value?: string;
  },
  options?: {
    maxFeePerGas?: string;
    maxPriorityFeePerGas?: string;
  }
): Promise<{
  success: boolean;
  transactionHash?: string;
  error?: string;
}> {
  const sdk = createBaseAccountSDK({
    appName: 'BEAT ME',
    appLogoUrl: 'https://base.org/logo.png',
    appChainIds: [base.id],
    subAccounts: { creation: 'on-connect', defaultAccount: 'sub' },
    paymasterUrls: process.env.NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT ? [process.env.NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT] : undefined,
  });

  if (!isERC20GasEnabled()) {
    return { success: false, error: 'ERC20 gas payments not enabled' };
  }

  try {
    const provider = sdk.getProvider();
    
    // Prepare the transaction with ERC20 gas payment
    const txRequest = {
      to: transaction.to,
      data: transaction.data,
      value: transaction.value || '0',
      maxFeePerGas: options?.maxFeePerGas,
      maxPriorityFeePerGas: options?.maxPriorityFeePerGas,
      // Add paymaster data for ERC20 gas payment
      paymasterAndData: PAYMASTER_ENDPOINT,
      // Specify that gas should be paid in USDC
      gasToken: USDC_ADDRESS
    };

    console.log('Sending transaction with ERC20 gas payment:', txRequest);

    // Send the transaction via EIP-1193
    const txHash = (await provider.request({
      method: 'eth_sendTransaction',
      params: [txRequest]
    })) as string;

    console.log('Transaction with ERC20 gas payment sent:', txHash);

    return {
      success: true,
      transactionHash: txHash
    };

  } catch (error: any) {
    console.error('Error sending transaction with ERC20 gas:', error);
    return {
      success: false,
      error: error.message || 'Failed to send transaction with ERC20 gas'
    };
  }
}

/**
 * Sends a batch of transactions with ERC20 gas payment using wallet_sendCalls.
 */
export async function sendBatchTransactionsWithERC20Gas(
  calls: Array<{
    to: string;
    data: string;
    value?: string;
  }>
): Promise<{
  success: boolean;
  transactionHash?: string;
  error?: string;
}> {
  const sdk = createBaseAccountSDK({
    appName: 'BEAT ME',
    appLogoUrl: 'https://base.org/logo.png',
    appChainIds: [base.id],
    subAccounts: { creation: 'on-connect', defaultAccount: 'sub' },
    paymasterUrls: process.env.NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT ? [process.env.NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT] : undefined,
  });

  if (!isERC20GasEnabled()) {
    return { success: false, error: 'ERC20 gas payments not enabled' };
  }

  try {
    const provider = sdk.getProvider();
    
    // Prepare batch calls with ERC20 gas payment
    const batchCalls = calls.map(call => ({
      to: call.to,
      data: call.data,
      value: call.value || '0'
    }));

    console.log('Sending batch transactions with ERC20 gas payment:', batchCalls);

    // Use wallet_sendCalls for batch transactions with paymaster
    const result = (await provider.request({
      method: 'wallet_sendCalls',
      params: {
        calls: batchCalls,
        paymasterAndData: PAYMASTER_ENDPOINT,
        gasToken: USDC_ADDRESS
      }
    })) as { transactionHash?: string; hash?: string };

    console.log('Batch transactions with ERC20 gas payment completed:', result);

    return {
      success: true,
      transactionHash: result?.transactionHash || result?.hash
    };

  } catch (error: any) {
    console.error('Error sending batch transactions with ERC20 gas:', error);
    return {
      success: false,
      error: error.message || 'Failed to send batch transactions with ERC20 gas'
    };
  }
}

/**
 * Checks if the user has sufficient USDC balance for gas payments.
 */
export async function checkUSDCBalanceForGas(
  userAddress: string,
  estimatedGasCost?: string
): Promise<{
  hasSufficientBalance: boolean;
  currentBalance: string;
  requiredBalance: string;
  error?: string;
}> {
  const sdk = createBaseAccountSDK({
    appName: 'BEAT ME',
    appLogoUrl: 'https://base.org/logo.png',
    appChainIds: [base.id],
    subAccounts: { creation: 'on-connect', defaultAccount: 'sub' },
    paymasterUrls: process.env.NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT ? [process.env.NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT] : undefined,
  });

  if (!USDC_ADDRESS) {
    return {
      hasSufficientBalance: false,
      currentBalance: '0',
      requiredBalance: '0',
      error: 'USDC address not configured'
    };
  }

  try {
    const provider = sdk.getProvider();
    
    // Get USDC contract
    const usdcContract = new Contract(
      USDC_ADDRESS,
      ['function balanceOf(address) view returns (uint256)', 'function decimals() view returns (uint8)'],
      rpc
    );

    // Get user's USDC balance
    const balance = await usdcContract.balanceOf(userAddress);
    const decimals = await usdcContract.decimals();
    const currentBalance = formatUnits(balance, decimals);

    // Calculate required balance (estimated gas cost + buffer)
    const requiredBalance = estimatedGasCost || '1.0'; // Default 1 USDC
    const requiredBalanceWei = parseUnits(requiredBalance, decimals);

    return {
      hasSufficientBalance: balance.gte(requiredBalanceWei),
      currentBalance,
      requiredBalance
    };

  } catch (error: any) {
    console.error('Error checking USDC balance for gas:', error);
    return {
      hasSufficientBalance: false,
      currentBalance: '0',
      requiredBalance: '0',
      error: error.message || 'Failed to check USDC balance'
    };
  }
}
