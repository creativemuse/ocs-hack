export type RetryOptions = {
  maxAttempts?: number;
  initialDelayMs?: number;
  maxDelayMs?: number;
  shouldRetry?: (error: unknown, attempt: number) => boolean;
};

const defaultShouldRetry = (error: unknown): boolean => {
  const message =
    error instanceof Error
      ? error.message
      : typeof error === 'string'
        ? error
        : '';
  const lower = message.toLowerCase();
  return (
    lower.includes('pending') ||
    lower.includes('could not load transaction') ||
    lower.includes('could not be verified') ||
    lower.includes('transaction not found') ||
    lower.includes('could not determine') ||
    lower.includes('verification will retry') ||
    lower.includes('network') ||
    lower.includes('fetch') ||
    lower.includes('timeout') ||
    lower.includes('503') ||
    lower.includes('502')
  );
};

export const retryWithBackoff = async <T>(
  fn: () => Promise<T>,
  options: RetryOptions = {}
): Promise<T> => {
  const maxAttempts = options.maxAttempts ?? 5;
  const initialDelayMs = options.initialDelayMs ?? 1_000;
  const maxDelayMs = options.maxDelayMs ?? 16_000;
  const shouldRetry = options.shouldRetry ?? defaultShouldRetry;

  let lastError: unknown;
  let delayMs = initialDelayMs;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt >= maxAttempts || !shouldRetry(error, attempt)) {
        throw error;
      }
      await new Promise((resolve) => setTimeout(resolve, delayMs));
      delayMs = Math.min(delayMs * 2, maxDelayMs);
    }
  }

  throw lastError;
};
