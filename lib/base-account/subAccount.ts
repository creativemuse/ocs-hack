import type { ProviderInterface } from '@base-org/account';

export interface SubAccountAddresses {
  universalAddress: string;
  subAccountAddress: string;
}

interface SubAccountEntry {
  address: string;
}

interface GetSubAccountsResponse {
  subAccounts: SubAccountEntry[];
}

interface AddSubAccountResponse {
  address: string;
}

/**
 * Re-activate the app sub-account for the current session and resolve addresses.
 * Per Base docs, wallet_addSubAccount should be called each session before use.
 */
export const resolveSubAccountAddresses = async (
  provider: ProviderInterface
): Promise<SubAccountAddresses | null> => {
  let accounts: string[] = [];

  try {
    accounts = (await provider.request({
      method: 'eth_accounts',
      params: [],
    })) as string[];
  } catch {
    return null;
  }

  if (!accounts.length) {
    return null;
  }

  const universalAddress = accounts[0];

  try {
    await provider.request({
      method: 'wallet_addSubAccount',
      params: [
        {
          account: {
            type: 'create',
          },
        },
      ],
    });
  } catch {
    // Sub-account may already be active for this session.
  }

  try {
    const response = (await provider.request({
      method: 'wallet_getSubAccounts',
      params: [
        {
          account: universalAddress,
          domain: window.location.origin,
        },
      ],
    })) as GetSubAccountsResponse;

    const subFromIndex = response.subAccounts?.[0]?.address;
    if (subFromIndex) {
      return { universalAddress, subAccountAddress: subFromIndex };
    }
  } catch {
    // Fall through to eth_accounts ordering.
  }

  const refreshedAccounts = (await provider.request({
    method: 'eth_accounts',
    params: [],
  })) as string[];

  if (refreshedAccounts.length > 1) {
    return {
      universalAddress: refreshedAccounts[0],
      subAccountAddress: refreshedAccounts[1],
    };
  }

  const fallback = refreshedAccounts[0] ?? universalAddress;
  return {
    universalAddress: fallback,
    subAccountAddress: fallback,
  };
};

/**
 * Connect wallet and resolve sub-account addresses.
 */
export const connectSubAccountAddresses = async (
  provider: ProviderInterface
): Promise<SubAccountAddresses> => {
  const accounts = (await provider.request({
    method: 'eth_requestAccounts',
    params: [],
  })) as string[];

  if (!accounts.length) {
    throw new Error('No accounts found');
  }

  const resolved = await resolveSubAccountAddresses(provider);
  if (!resolved) {
    throw new Error('Failed to resolve sub-account');
  }

  return resolved;
};
