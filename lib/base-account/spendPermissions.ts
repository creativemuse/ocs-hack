'use client';

/**
 * Spend Permissions utilities for Base Account
 */

import {
  requestSpendPermission,
  requestRevoke,
  fetchPermissions,
  getPermissionStatus,
} from '@base-org/account/spend-permission/browser';
import { getBaseAccountProvider } from '@/lib/base-account/sdk';
import {
  BASE_CHAIN_ID,
  SPEND_PERMISSION_SPENDER,
  USDC_ADDRESS_BASE,
} from '@/lib/base-account/config';

const GAME_SPEND_ALLOWANCE = BigInt(100_000_000); // 100 USDC (6 decimals)
const GAME_SPEND_PERIOD_DAYS = 30;

const PERMISSION_STORAGE_KEY = 'beat_me_spend_permission';

type StoredSpendPermission = Awaited<ReturnType<typeof requestSpendPermission>>;

export interface SpendPermissionDetails {
  account: string;
  spender: string;
  token: string;
  allowance: string;
  periodInDays: number;
  daysRemaining: number;
  isExpired: boolean;
  isActive: boolean;
  remainingSpend?: string;
}

const isSpendPermissionsConfigured = (): boolean => {
  return (
    !!SPEND_PERMISSION_SPENDER &&
    SPEND_PERMISSION_SPENDER !== '0xYourTreasuryAddress'
  );
};

const storePermission = (permission: StoredSpendPermission): void => {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.setItem(PERMISSION_STORAGE_KEY, JSON.stringify(permission));
};

const loadStoredPermission = (): StoredSpendPermission | null => {
  if (typeof window === 'undefined') {
    return null;
  }

  try {
    const stored = localStorage.getItem(PERMISSION_STORAGE_KEY);
    if (!stored) {
      return null;
    }
    return JSON.parse(stored) as StoredSpendPermission;
  } catch {
    return null;
  }
};

const clearStoredPermission = (): void => {
  if (typeof window === 'undefined') {
    return;
  }
  localStorage.removeItem(PERMISSION_STORAGE_KEY);
};

export const isGameSpendPermissionsEnabled = (): boolean => {
  return isSpendPermissionsConfigured();
};

export const requestGameSpendPermission = async (
  account: string
): Promise<boolean> => {
  if (!isSpendPermissionsConfigured()) {
    console.warn(
      'Spend permissions not configured. Set NEXT_PUBLIC_SPEND_PERMISSION_SPENDER.'
    );
    return false;
  }

  try {
    const provider = getBaseAccountProvider();
    const permission = await requestSpendPermission({
      account,
      spender: SPEND_PERMISSION_SPENDER,
      token: USDC_ADDRESS_BASE,
      chainId: BASE_CHAIN_ID,
      allowance: GAME_SPEND_ALLOWANCE,
      periodInDays: GAME_SPEND_PERIOD_DAYS,
      provider,
    });

    storePermission(permission);
    return true;
  } catch (error) {
    console.error('Failed to request spend permission:', error);
    return false;
  }
};

export const checkSpendPermission = async (
  account: string
): Promise<boolean> => {
  if (!isSpendPermissionsConfigured()) {
    return false;
  }

  try {
    const provider = getBaseAccountProvider();
    const permissions = await fetchPermissions({
      account,
      spender: SPEND_PERMISSION_SPENDER,
      chainId: BASE_CHAIN_ID,
      provider,
    });

    if (permissions.length > 0) {
      storePermission(permissions[0]);
      const status = await getPermissionStatus(permissions[0]);
      return status.isActive && !status.isRevoked && !status.isExpired;
    }

    const stored = loadStoredPermission();
    if (!stored) {
      return false;
    }

    const status = await getPermissionStatus(stored);
    return status.isActive && !status.isRevoked && !status.isExpired;
  } catch (error) {
    console.error('Error checking spend permission:', error);
    return false;
  }
};

export const revokeSpendPermission = async (
  account: string
): Promise<boolean> => {
  if (!isSpendPermissionsConfigured()) {
    return false;
  }

  try {
    const provider = getBaseAccountProvider();
    let permission = loadStoredPermission();

    if (!permission) {
      const permissions = await fetchPermissions({
        account,
        spender: SPEND_PERMISSION_SPENDER,
        chainId: BASE_CHAIN_ID,
        provider,
      });
      permission = permissions[0] ?? null;
    }

    if (!permission) {
      return false;
    }

    await requestRevoke({ provider, permission });
    clearStoredPermission();
    return true;
  } catch (error) {
    console.error('Failed to revoke spend permission:', error);
    return false;
  }
};

export const getSpendPermissionDetails = async (
  account: string
): Promise<SpendPermissionDetails | null> => {
  if (!isSpendPermissionsConfigured()) {
    return null;
  }

  try {
    const provider = getBaseAccountProvider();
    let permission = loadStoredPermission();

    if (!permission) {
      const permissions = await fetchPermissions({
        account,
        spender: SPEND_PERMISSION_SPENDER,
        chainId: BASE_CHAIN_ID,
        provider,
      });
      permission = permissions[0] ?? null;
    }

    if (!permission) {
      return null;
    }

    const status = await getPermissionStatus(permission);
    const periodEnd = status.currentPeriod.end;
    const periodStart = status.currentPeriod.start;
    const daysRemaining = Math.max(
      0,
      (periodEnd - Math.floor(Date.now() / 1000)) / (60 * 60 * 24)
    );

    return {
      account,
      spender: SPEND_PERMISSION_SPENDER,
      token: USDC_ADDRESS_BASE,
      allowance: GAME_SPEND_ALLOWANCE.toString(),
      periodInDays: GAME_SPEND_PERIOD_DAYS,
      daysRemaining,
      isExpired: status.isExpired,
      isActive: status.isActive,
      remainingSpend: status.remainingSpend.toString(),
    };
  } catch (error) {
    console.error('Error getting spend permission details:', error);
    return null;
  }
};

export const ensureSpendPermission = async (
  account: string
): Promise<boolean> => {
  const hasPermission = await checkSpendPermission(account);
  if (hasPermission) {
    return true;
  }
  return requestGameSpendPermission(account);
};
