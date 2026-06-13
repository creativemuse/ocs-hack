import { base } from 'viem/chains';

export const BASE_ACCOUNT_APP_NAME =
  process.env.NEXT_PUBLIC_BASE_ACCOUNT_APP_NAME || 'BEAT ME';

export const BASE_ACCOUNT_LOGO_URL =
  process.env.NEXT_PUBLIC_BASE_ACCOUNT_LOGO_URL || 'https://base.org/logo.png';

export const BASE_CHAIN_ID = base.id;

export const USDC_ADDRESS_BASE =
  process.env.NEXT_PUBLIC_USDC_ADDRESS ||
  '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913';

export const SPEND_PERMISSION_SPENDER =
  process.env.NEXT_PUBLIC_SPEND_PERMISSION_SPENDER || '';

export const PAYMASTER_URL =
  process.env.NEXT_PUBLIC_PAYMASTER_AND_BUNDLER_ENDPOINT || undefined;

export const BASE_PAY_AMOUNTS = {
  walletFunding: '5.00',
  gamePayment: '10.00',
} as const;
