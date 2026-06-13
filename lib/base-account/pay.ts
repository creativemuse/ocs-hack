import { pay, getPaymentStatus, type PaymentOptions, type PaymentResult } from '@base-org/account';

export type BasePayResult =
  | { success: true; payment: PaymentResult; status: 'completed' }
  | { success: false; error: string; status?: 'failed' | 'pending' };

const pollPaymentStatus = async (
  paymentId: string,
  testnet: boolean,
  maxAttempts = 30,
  intervalMs = 2000
): Promise<BasePayResult> => {
  for (let attempt = 0; attempt < maxAttempts; attempt += 1) {
    await new Promise((resolve) => setTimeout(resolve, intervalMs));

    try {
      const status = await getPaymentStatus({ id: paymentId, testnet });

      if (status.status === 'completed') {
        return { success: true, payment: { success: true, id: paymentId, amount: status.amount ?? '', to: status.recipient as `0x${string}` }, status: 'completed' };
      }

      if (status.status === 'failed') {
        return {
          success: false,
          error: status.reason || status.message || 'Payment failed',
          status: 'failed',
        };
      }
    } catch (error) {
      if (attempt === maxAttempts - 1) {
        return {
          success: false,
          error: error instanceof Error ? error.message : 'Failed to check payment status',
        };
      }
    }
  }

  return { success: false, error: 'Payment timed out', status: 'pending' };
};

/**
 * Execute a Base Pay flow using paymentOptions (account-ui button is visual only in v1.0.1).
 */
export const executeBasePay = async (
  paymentOptions: PaymentOptions
): Promise<BasePayResult> => {
  try {
    const payment = await pay(paymentOptions);
    return pollPaymentStatus(payment.id, paymentOptions.testnet ?? false);
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Payment failed',
    };
  }
};
