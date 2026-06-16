export type OrbLinkStep =
  | 'signature'
  | 'lens'
  | 'spacetime_config'
  | 'spacetime_admin'
  | 'spacetime_write'
  | 'handle_conflict';

export const classifyOrbLinkError = (
  message: string,
): { step: OrbLinkStep; status: number } => {
  const lower = message.toLowerCase();

  if (lower.includes('already taken') || lower.includes('already linked')) {
    return { step: 'handle_conflict', status: 409 };
  }

  if (lower.includes('only admins')) {
    return { step: 'spacetime_admin', status: 403 };
  }

  if (
    lower.includes('not connected to spacetime') ||
    lower.includes('connection timeout') ||
    lower.includes('not configured') ||
    lower.includes('spacetimedb connection')
  ) {
    return { step: 'spacetime_config', status: 503 };
  }

  if (
    lower.includes('invalid or expired orb') ||
    lower.includes('lens graphql') ||
    lower.includes('failed to refresh lens')
  ) {
    return { step: 'lens', status: 401 };
  }

  if (
    lower.includes('invalid wallet signature') ||
    lower.includes('signature address does not match') ||
    lower.includes('invalid wallet address')
  ) {
    return { step: 'signature', status: 401 };
  }

  return { step: 'spacetime_write', status: 500 };
};

export const toUserFriendlyOrbLinkError = (
  error: string,
  step?: OrbLinkStep,
): string => {
  const resolvedStep = step ?? classifyOrbLinkError(error).step;

  switch (resolvedStep) {
    case 'signature':
      return 'Wallet signature failed. Reconnect your Base Account and try again.';
    case 'lens':
      return 'Orb session expired. Scan the QR code again in the Orb app, then retry linking.';
    case 'spacetime_config':
      return 'Beat Me could not reach the game database. Try again in a moment.';
    case 'spacetime_admin':
      return 'Profile linking is temporarily unavailable. Please try again later.';
    case 'handle_conflict':
      return 'This Lens handle is already linked to another wallet.';
    case 'spacetime_write':
    default:
      return error || 'Failed to link Orb profile. Please try again.';
  }
};
