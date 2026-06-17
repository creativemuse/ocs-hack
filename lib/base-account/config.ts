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

/** CDP Paymaster contract on Base — accepts USDC for gas when sponsorship is unavailable. */
export const CDP_PAYMASTER_ADDRESS =
  (process.env.NEXT_PUBLIC_CDP_PAYMASTER_ADDRESS ||
    '0x2FAEB0760D4230Ef2aC21496Bb4F0b47D634FD4c') as `0x${string}`;

export const ERC20_GAS_MIN_USDC_ALLOWANCE = '1';
export const ERC20_GAS_APPROVAL_TOP_UP_USDC = '20';

export const BASE_PAY_AMOUNTS = {
  walletFunding: '5.00',
  gamePayment: '10.00',
} as const;
