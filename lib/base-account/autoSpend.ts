/**
 * @deprecated Sub-account auto-spend is managed by the Base Account SDK by default.
 * On the first sub-account transaction, users are prompted to fund from their
 * universal account and optionally grant ongoing spend permissions.
 *
 * Do not call these helpers — they are kept only for backward compatibility.
 * See: https://docs.base.org/base-account/improve-ux/sub-accounts#auto-spend-permissions
 */

const DEPRECATION_MESSAGE =
  'Manual auto-spend configuration is deprecated. The Base Account SDK handles sub-account funding automatically on the first transaction.';

export const configureAutoSpend = async (): Promise<{
  success: boolean;
  error?: string;
}> => {
  console.warn(DEPRECATION_MESSAGE);
  return { success: false, error: DEPRECATION_MESSAGE };
};

export const checkAutoSpendStatus = async (): Promise<{
  isConfigured: boolean;
  allowance?: string;
  spender?: string;
  error?: string;
}> => {
  console.warn(DEPRECATION_MESSAGE);
  return { isConfigured: false, error: DEPRECATION_MESSAGE };
};

export const revokeAutoSpend = async (): Promise<{
  success: boolean;
  error?: string;
}> => {
  console.warn(DEPRECATION_MESSAGE);
  return { success: false, error: DEPRECATION_MESSAGE };
};

export const getAutoSpendConfig = async (): Promise<{
  universalAddress?: string;
  subAccountAddress?: string;
  tokenAddress?: string;
  amount?: string;
  duration?: number;
  isActive?: boolean;
  error?: string;
}> => {
  console.warn(DEPRECATION_MESSAGE);
  return { isActive: false, error: DEPRECATION_MESSAGE };
};
