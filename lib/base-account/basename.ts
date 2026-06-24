/**
 * @deprecated Import from `@/lib/base-account/basenameServer` on the server
 * or use `/api/basename` from client code. Browser-side viem RPC calls fail CORS
 * on unauthenticated public RPC endpoints (blocked from serverless).
 */
export { getBasename, getBasenameWithFallback } from './basenameServer';
