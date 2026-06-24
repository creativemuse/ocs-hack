export const formatSpacetimeConnectError = (error: unknown): Error => {
  if (error instanceof Error) {
    return error;
  }

  if (error && typeof error === 'object' && 'message' in error) {
    return new Error(String((error as { message: unknown }).message));
  }

  return new Error(String(error));
};

export const isSpacetimeTokenVerificationError = (error: unknown): boolean => {
  const message = formatSpacetimeConnectError(error).message.toLowerCase();
  return message.includes('verify token');
};
