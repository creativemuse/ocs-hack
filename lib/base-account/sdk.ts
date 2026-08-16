import { createBaseAccountSDK } from '@base-org/account';
import type { ProviderInterface } from '@base-org/account';
import { base } from 'viem/chains';
import {
  BASE_ACCOUNT_APP_NAME,
  BASE_ACCOUNT_LOGO_URL,
  PAYMASTER_URL,
} from './config';

export type BaseAccountSDKInstance = ReturnType<typeof createBaseAccountSDK>;

let sdkInstance: BaseAccountSDKInstance | null = null;

export const getBaseAccountSDK = (): BaseAccountSDKInstance => {
  if (typeof window === 'undefined') {
    throw new Error('Base Account SDK can only be used on the client');
  }

  if (!sdkInstance) {
    sdkInstance = createBaseAccountSDK({
      appName: BASE_ACCOUNT_APP_NAME,
      appLogoUrl: BASE_ACCOUNT_LOGO_URL,
      appChainIds: [base.id],
      subAccounts: {
        creation: 'on-connect',
        defaultAccount: 'sub',
      },
      paymasterUrls: PAYMASTER_URL ? [PAYMASTER_URL] : undefined,
    });
  }

  return sdkInstance;
};

export const getBaseAccountProvider = (): ProviderInterface => {
  return getBaseAccountSDK().getProvider();
};

export const resetBaseAccountSDK = (): void => {
  sdkInstance = null;
};
