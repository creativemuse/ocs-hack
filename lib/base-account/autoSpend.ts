import { createBaseAccountSDK } from '@base-org/account';
import { base } from 'viem/chains';
import { parseUnits, formatUnits, Contract, JsonRpcProvider } from 'ethers';

const USDC_ADDRESS = process.env.NEXT_PUBLIC_USDC_ADDRESS as string;
const AUTO_SPEND_AMOUNT = '100.0'; // Amount to auto-spend in USDC
const AUTO_SPEND_DURATION = 30 * 24 * 60 * 60; // 30 days in seconds

if (!USDC_ADDRESS) {
  console.error('Missing environment variable: NEXT_PUBLIC_USDC_ADDRESS');
}

/**
 * Configures Auto Spend Permissions for the current Base Account.
 * This allows the sub-account to automatically spend from the universal account.
 */
export async function configureAutoSpend(): Promise<{
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

  if (!USDC_ADDRESS) {
    return { success: false, error: 'USDC address not configured' };
  }

  try {
    const provider = sdk.getProvider();
    const accounts = (await provider.request({ method: 'eth_accounts', params: [] })) as string[];
    
    if (accounts.length === 0) {
      return { success: false, error: 'No Base Account connected' };
    }

    const universalAddress = accounts[0];
    const subAccountAddress = accounts[1];

    if (!subAccountAddress) {
      return { success: false, error: 'No sub-account found' };
    }

    console.log('Configuring Auto Spend Permissions:', {
      universal: universalAddress,
      subAccount: subAccountAddress,
      amount: AUTO_SPEND_AMOUNT,
      duration: AUTO_SPEND_DURATION
    });

    // Request Auto Spend Permission using Base Account SDK
    const result = (await provider.request({
      method: 'wallet_requestSpendPermission',
      params: {
        tokenAddress: USDC_ADDRESS,
        spenderAddress: subAccountAddress,
        amount: parseUnits(AUTO_SPEND_AMOUNT, 6).toString(),
        duration: AUTO_SPEND_DURATION,
        autoSpend: true // Enable auto-spend functionality
      }
    })) as { transactionHash?: string; hash?: string };

    console.log('Auto Spend Permission configured:', result);

    return {
      success: true,
      transactionHash: result?.transactionHash || result?.hash
    };

  } catch (error: any) {
    console.error('Error configuring Auto Spend Permissions:', error);
    return {
      success: false,
      error: error.message || 'Failed to configure Auto Spend Permissions'
    };
  }
}

/**
 * Checks if Auto Spend Permissions are already configured for the current account.
 */
export async function checkAutoSpendStatus(): Promise<{
  isConfigured: boolean;
  allowance?: string;
  spender?: string;
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
    return { isConfigured: false, error: 'USDC address not configured' };
  }

  try {
    const provider = sdk.getProvider();
    const accounts = (await provider.request({ method: 'eth_accounts', params: [] })) as string[];
    
    if (accounts.length === 0) {
      return { isConfigured: false, error: 'No Base Account connected' };
    }

    const universalAddress = accounts[0];
    const subAccountAddress = accounts[1];

    if (!subAccountAddress) {
      return { isConfigured: false, error: 'No sub-account found' };
    }

    // Check current allowance
    const tokenContract = new Contract(
      USDC_ADDRESS,
      ['function allowance(address owner, address spender) view returns (uint256)'],
      new JsonRpcProvider()
    );

    const allowance = await tokenContract.allowance(universalAddress, subAccountAddress);
    const requiredAllowance = parseUnits(AUTO_SPEND_AMOUNT, 6);

    return {
      isConfigured: allowance.gte(requiredAllowance),
      allowance: formatUnits(allowance, 6),
      spender: subAccountAddress
    };

  } catch (error: any) {
    console.error('Error checking Auto Spend status:', error);
    return {
      isConfigured: false,
      error: error.message || 'Failed to check Auto Spend status'
    };
  }
}

/**
 * Revokes Auto Spend Permissions for the current account.
 */
export async function revokeAutoSpend(): Promise<{
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

  if (!USDC_ADDRESS) {
    return { success: false, error: 'USDC address not configured' };
  }

  try {
    const provider = sdk.getProvider();
    const accounts = (await provider.request({ method: 'eth_accounts', params: [] })) as string[];
    
    if (accounts.length === 0) {
      return { success: false, error: 'No Base Account connected' };
    }

    const universalAddress = accounts[0];
    const subAccountAddress = accounts[1];

    if (!subAccountAddress) {
      return { success: false, error: 'No sub-account found' };
    }

    console.log('Revoking Auto Spend Permissions:', {
      universal: universalAddress,
      subAccount: subAccountAddress
    });

    // Revoke Auto Spend Permission
    const result = (await provider.request({
      method: 'wallet_revokeSpendPermission',
      params: {
        tokenAddress: USDC_ADDRESS,
        spenderAddress: subAccountAddress
      }
    })) as { transactionHash?: string; hash?: string };

    console.log('Auto Spend Permissions revoked:', result);

    return {
      success: true,
      transactionHash: result?.transactionHash || result?.hash
    };

  } catch (error: any) {
    console.error('Error revoking Auto Spend Permissions:', error);
    return {
      success: false,
      error: error.message || 'Failed to revoke Auto Spend Permissions'
    };
  }
}

/**
 * Gets the current Auto Spend configuration details.
 */
export async function getAutoSpendConfig(): Promise<{
  universalAddress?: string;
  subAccountAddress?: string;
  tokenAddress?: string;
  amount?: string;
  duration?: number;
  isActive?: boolean;
  error?: string;
}> {
  const sdk = createBaseAccountSDK({
    appName: 'BEAT ME',
    appLogoUrl: 'https://base.org/logo.png',
    appChainIds: [base.id],
    subAccounts: { creation: 'on-connect', defaultAccount: 'sub' },
    paymasterUrls: process.env.NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT ? [process.env.NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT] : undefined,
  });

  try {
    const provider = sdk.getProvider();
    const accounts = (await provider.request({ method: 'eth_accounts', params: [] })) as string[];
    
    if (accounts.length === 0) {
      return { error: 'No Base Account connected' };
    }

    const universalAddress = accounts[0];
    const subAccountAddress = accounts[1];

    if (!subAccountAddress) {
      return { error: 'No sub-account found' };
    }

    const status = await checkAutoSpendStatus();

    return {
      universalAddress,
      subAccountAddress,
      tokenAddress: USDC_ADDRESS,
      amount: AUTO_SPEND_AMOUNT,
      duration: AUTO_SPEND_DURATION,
      isActive: status.isConfigured
    };

  } catch (error: any) {
    console.error('Error getting Auto Spend config:', error);
    return {
      error: error.message || 'Failed to get Auto Spend configuration'
    };
  }
}
