/**
 * Spend Permissions utilities for Base Account
 * 
 * Handles requesting, checking, and using spend permissions for gasless transactions
 */

// Note: Spend permission functions are not available in the current version of @base-org/account
// This is a placeholder implementation until the spend permission API is available
import { createBaseAccountSDK } from '@base-org/account';
import { base } from 'viem/chains';

// Game-specific spend permission configuration
const GAME_SPEND_CONFIG = {
  token: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // USDC on Base
  chainId: base.id,
  allowance: BigInt('100000000'), // 100 USDC (6 decimals)
  periodInDays: 30,
  spender: process.env.NEXT_PUBLIC_SPEND_PERMISSION_SPENDER || '0xYourTreasuryAddress',
};

// Get Base Account SDK instance (client-side only)
let sdkInstance: any = null;

function getSDK() {
  if (typeof window === "undefined") {
    throw new Error('Base Account SDK can only be used on the client side');
  }
  
  if (!sdkInstance) {
    sdkInstance = createBaseAccountSDK({
      appName: 'BEAT ME',
      appLogoUrl: 'https://base.org/logo.png',
      appChainIds: [base.id],
      subAccounts: {
        creation: 'on-connect',
        defaultAccount: 'sub',
      },
    });
  }
  
  return sdkInstance;
}

/**
 * Request spend permission for game entry fees
 * Note: This is a placeholder implementation until spend permission API is available
 */
export async function requestGameSpendPermission(account: string): Promise<boolean> {
  try {
    console.log('🔐 Requesting spend permission for game entry...');
    console.warn('⚠️ Spend permission API not available in current Base Account SDK version');
    
    // For now, simulate a successful permission request
    // In a real implementation, this would use the Base Account spend permission API
    const mockPermission = {
      account,
      spender: GAME_SPEND_CONFIG.spender,
      token: GAME_SPEND_CONFIG.token,
      allowance: GAME_SPEND_CONFIG.allowance.toString(),
      periodInDays: GAME_SPEND_CONFIG.periodInDays,
      timestamp: Date.now(),
    };

    // Store permission in localStorage for quick checks
    localStorage.setItem('game_spend_permission', JSON.stringify(mockPermission));
    
    console.log('✅ Spend permission granted (mock)');
    return true;
  } catch (error) {
    console.error('❌ Failed to request spend permission:', error);
    return false;
  }
}

/**
 * Check if valid spend permission exists
 */
export function checkSpendPermission(account: string): boolean {
  try {
    const stored = localStorage.getItem('game_spend_permission');
    if (!stored) return false;
    
    const permission = JSON.parse(stored);
    
    // Check if permission is for the same account and spender
    if (permission.account !== account || permission.spender !== GAME_SPEND_CONFIG.spender) {
      return false;
    }
    
    // Check if permission is still valid (within 30 days)
    const daysSinceGranted = (Date.now() - permission.timestamp) / (1000 * 60 * 60 * 24);
    if (daysSinceGranted > GAME_SPEND_CONFIG.periodInDays) {
      // Clear expired permission
      localStorage.removeItem('game_spend_permission');
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('❌ Error checking spend permission:', error);
    return false;
  }
}

/**
 * Use spend permission to execute a transaction
 * Note: This is a placeholder implementation until spend permission API is available
 */
export async function useSpendPermission(
  account: string,
  to: string,
  amount: string,
  data?: string
): Promise<string> {
  try {
    console.log('💸 Using spend permission for transaction...');
    console.warn('⚠️ Spend permission API not available in current Base Account SDK version');
    
    // For now, simulate a transaction using regular wallet calls
    // In a real implementation, this would use the Base Account spend permission API
    const result = await getSDK().getProvider().request({
      method: 'wallet_sendCalls',
      params: [{
        version: '1.0',
        chainId: `0x${GAME_SPEND_CONFIG.chainId.toString(16)}`,
        from: account,
        calls: [{
          to: to,
          data: data || '0x',
          value: '0x0',
        }],
        capabilities: {
          paymasterService: {
            url: process.env.NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT,
          },
        },
      }],
    });

    console.log('✅ Transaction sent (without spend permission):', result);
    return result;
  } catch (error) {
    console.error('❌ Failed to use spend permission:', error);
    throw error;
  }
}

/**
 * Revoke spend permission
 * Note: This is a placeholder implementation until spend permission API is available
 */
export async function revokeSpendPermission(account: string): Promise<boolean> {
  try {
    console.log('🔒 Revoking spend permission...');
    console.warn('⚠️ Spend permission API not available in current Base Account SDK version');
    
    // For now, just clear the stored permission
    // In a real implementation, this would use the Base Account spend permission API
    localStorage.removeItem('game_spend_permission');
    
    console.log('✅ Spend permission revoked (mock)');
    return true;
  } catch (error) {
    console.error('❌ Failed to revoke spend permission:', error);
    return false;
  }
}

/**
 * Get spend permission details
 */
export function getSpendPermissionDetails(account: string) {
  try {
    const stored = localStorage.getItem('game_spend_permission');
    if (!stored) return null;
    
    const permission = JSON.parse(stored);
    
    if (permission.account !== account) return null;
    
    const daysSinceGranted = (Date.now() - permission.timestamp) / (1000 * 60 * 60 * 24);
    const daysRemaining = GAME_SPEND_CONFIG.periodInDays - daysSinceGranted;
    
    return {
      ...permission,
      daysRemaining: Math.max(0, daysRemaining),
      isExpired: daysRemaining <= 0,
    };
  } catch (error) {
    console.error('❌ Error getting spend permission details:', error);
    return null;
  }
}

/**
 * Auto-request spend permission if needed
 */
export async function ensureSpendPermission(account: string): Promise<boolean> {
  if (checkSpendPermission(account)) {
    return true;
  }
  
  return await requestGameSpendPermission(account);
}
