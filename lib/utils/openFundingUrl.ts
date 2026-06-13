/**
 * Open a Coinbase Pay / onramp URL in a way that works in mobile in-app browsers
 * (Base Account, Coinbase Wallet) where window.open is often blocked.
 */
export function openFundingUrl(url: string): boolean {
  if (!url) return false;

  try {
    const popup = window.open(url, '_blank', 'noopener,noreferrer');
    if (popup) {
      popup.opener = null;
      return true;
    }
  } catch {
    // fall through to same-tab navigation
  }

  try {
    window.location.assign(url);
    return true;
  } catch {
    return false;
  }
}
