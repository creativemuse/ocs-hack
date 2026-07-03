/**
 * Resolve Base RPC URL for server-side / CLI usage.
 *
 * - Explicit `BASE_RPC_URL` is always honored (use for Alchemy after allowlist setup).
 * - `NEXT_PUBLIC_BASE_RPC_URL` is skipped when it points at Alchemy, since browser-only
 *   origin allowlists break Node/Vercel ("Unspecified origin not on whitelist").
 */
export const resolveBaseRpcUrl = (): string => {
  const explicit = process.env.BASE_RPC_URL?.trim();
  if (explicit) {
    return explicit;
  }

  const publicRpc = process.env.NEXT_PUBLIC_BASE_RPC_URL?.trim();
  if (publicRpc && !publicRpc.includes('alchemy.com')) {
    return publicRpc;
  }

  return 'https://mainnet.base.org';
};
