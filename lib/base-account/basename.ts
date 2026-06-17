/**
 * @deprecated Import from `@/lib/base-account/basenameServer` on the server
 * or use `/api/basename` from client code. Browser-side viem RPC calls fail CORS
 * on public endpoints like eth.llamarpc.com.
 */
export { getBasename, getBasenameWithFallback } from './basenameServer';
