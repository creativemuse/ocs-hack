/**
 * Enhanced error handling utilities for transaction failures
 */

export interface TransactionError {
  code?: string;
  message: string;
  details?: any;
  recoverable: boolean;
  userMessage: string;
  retryable: boolean;
}

export interface ErrorContext {
  operation: string;
  contractAddress?: string;
  functionName?: string;
  args?: any[];
  userAddress?: string;
  chainId?: number;
}

/**
 * Parse transaction error and provide user-friendly information
 */
export function parseTransactionError(
  error: any,
  context: ErrorContext
): TransactionError {
  console.log('🔍 Parsing transaction error:', { error, context });

  // Handle different error types
  if (typeof error === 'string') {
    return parseStringError(error, context);
  }

  if (error && typeof error === 'object') {
    return parseObjectError(error, context);
  }

  // Fallback for unknown error types
  return {
    message: 'Unknown transaction error',
    details: error,
    recoverable: false,
    userMessage: 'An unexpected error occurred. Please try again.',
    retryable: true,
  };
}

/**
 * Parse string-based errors
 */
function parseStringError(error: string, context: ErrorContext): TransactionError {
  const lowerError = error.toLowerCase();

  // Common error patterns
  if (lowerError.includes('user rejected') || lowerError.includes('user denied')) {
    return {
      code: 'USER_REJECTED',
      message: error,
      recoverable: true,
      userMessage: 'Transaction was cancelled. You can try again.',
      retryable: true,
    };
  }

  // Check for gas-specific insufficient funds first
  if (lowerError.includes('insufficient funds for gas') ||
    lowerError.includes('insufficient funds for transfer') ||
    (lowerError.includes('gas') && lowerError.includes('insufficient'))) {
    return {
      code: 'INSUFFICIENT_ETH_FOR_GAS',
      message: error,
      recoverable: true,
      userMessage: 'Insufficient ETH for gas fees. Please add more ETH to your wallet.',
      retryable: false,
    };
  }

  if (lowerError.includes('insufficient funds') || lowerError.includes('insufficient balance')) {
    return {
      code: 'INSUFFICIENT_FUNDS',
      message: error,
      recoverable: true,
      userMessage: 'Insufficient funds. Please check your ETH and USDC balance.',
      retryable: false,
    };
  }

  if (lowerError.includes('gas') && lowerError.includes('low')) {
    return {
      code: 'GAS_TOO_LOW',
      message: error,
      recoverable: true,
      userMessage: 'Transaction failed due to low gas limit. Please try again.',
      retryable: true,
    };
  }

  if (lowerError.includes('network') || lowerError.includes('connection')) {
    return {
      code: 'NETWORK_ERROR',
      message: error,
      recoverable: true,
      userMessage: 'Network error. Please check your connection and try again.',
      retryable: true,
    };
  }

  if (lowerError.includes('revert') || lowerError.includes('execution reverted')) {
    return {
      code: 'CONTRACT_REVERT',
      message: error,
      recoverable: false,
      userMessage: 'Transaction failed due to contract conditions. Please check your eligibility.',
      retryable: false,
    };
  }

  return {
    message: error,
    recoverable: true,
    userMessage: 'Transaction failed. Please try again.',
    retryable: true,
  };
}

/**
 * Parse object-based errors
 */
function parseObjectError(error: any, context: ErrorContext): TransactionError {
  // Handle wagmi errors
  if (error.name === 'UserRejectedRequestError') {
    return {
      code: 'USER_REJECTED',
      message: error.message,
      details: error,
      recoverable: true,
      userMessage: 'Transaction was cancelled. You can try again.',
      retryable: true,
    };
  }

  if (error.name === 'InsufficientFundsError') {
    return {
      code: 'INSUFFICIENT_FUNDS',
      message: error.message,
      details: error,
      recoverable: true,
      userMessage: 'Insufficient funds. Please add more USDC to your wallet.',
      retryable: false,
    };
  }

  if (error.name === 'GasTooLowError') {
    return {
      code: 'GAS_TOO_LOW',
      message: error.message,
      details: error,
      recoverable: true,
      userMessage: 'Transaction failed due to low gas. Please try again.',
      retryable: true,
    };
  }

  // Handle contract revert errors
  if (error.code === 'CALL_EXCEPTION' || error.reason === 'execution reverted') {
    return {
      code: 'CONTRACT_REVERT',
      message: error.message || error.reason,
      details: error,
      recoverable: false,
      userMessage: 'Transaction failed due to contract conditions. Please check your eligibility.',
      retryable: false,
    };
  }

  // Handle network errors
  if (error.code === 'NETWORK_ERROR' || error.name === 'NetworkError') {
    return {
      code: 'NETWORK_ERROR',
      message: error.message,
      details: error,
      recoverable: true,
      userMessage: 'Network error. Please check your connection and try again.',
      retryable: true,
    };
  }

  // Handle timeout errors
  if (error.code === 'TIMEOUT' || error.name === 'TimeoutError') {
    return {
      code: 'TIMEOUT',
      message: error.message,
      details: error,
      recoverable: true,
      userMessage: 'Transaction timed out. Please try again.',
      retryable: true,
    };
  }

  // Default object error handling
  return {
    message: error.message || 'Unknown error',
    details: error,
    recoverable: true,
    userMessage: 'Transaction failed. Please try again.',
    retryable: true,
  };
}

/**
 * Get user-friendly error message for display
 */
export function getUserFriendlyErrorMessage(error: TransactionError): string {
  return error.userMessage;
}

/**
 * Check if error is recoverable
 */
export function isErrorRecoverable(error: TransactionError): boolean {
  return error.recoverable;
}

/**
 * Check if error allows retry
 */
export function isErrorRetryable(error: TransactionError): boolean {
  return error.retryable;
}

/**
 * Get error recovery suggestions
 */
export function getErrorRecoverySuggestions(error: TransactionError): string[] {
  const suggestions: string[] = [];

  switch (error.code) {
    case 'USER_REJECTED':
      suggestions.push('Click "Try Again" to retry the transaction');
      break;
    case 'INSUFFICIENT_FUNDS':
      suggestions.push('Add more USDC to your wallet');
      suggestions.push('Check your USDC balance');
      break;
    case 'INSUFFICIENT_ETH_FOR_GAS':
      suggestions.push('Add more ETH to your wallet for gas fees');
      suggestions.push('Bridge ETH to Base network');
      break;
    case 'GAS_TOO_LOW':
      suggestions.push('Try the transaction again');
      suggestions.push('Check your network connection');
      break;
    case 'NETWORK_ERROR':
      suggestions.push('Check your internet connection');
      suggestions.push('Try switching networks');
      suggestions.push('Wait a moment and try again');
      break;
    case 'CONTRACT_REVERT':
      suggestions.push('Check if you meet the game requirements');
      suggestions.push('Ensure you have enough USDC for entry');
      suggestions.push('Try refreshing the page');
      break;
    case 'TIMEOUT':
      suggestions.push('Wait a moment and try again');
      suggestions.push('Check your network connection');
      break;
    default:
      suggestions.push('Try the transaction again');
      suggestions.push('Check your wallet connection');
      suggestions.push('Refresh the page if the problem persists');
  }

  return suggestions;
}

/**
 * Log error with context for debugging
 */
export function logTransactionError(
  error: TransactionError,
  context: ErrorContext,
  additionalInfo?: any
): void {
  console.group('🚨 Transaction Error Details');
  console.error('Error:', error);
  console.log('Context:', context);
  console.log('Additional Info:', additionalInfo);
  console.log('Recoverable:', error.recoverable);
  console.log('Retryable:', error.retryable);
  console.log('User Message:', error.userMessage);
  console.log('Recovery Suggestions:', getErrorRecoverySuggestions(error));
  console.groupEnd();
}
