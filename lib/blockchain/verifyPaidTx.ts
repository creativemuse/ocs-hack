/**
 * Server-side verification that a paid game entry transaction is valid on-chain.
 * Confirms the tx succeeded, was sent by the given wallet (or alternate Base universal
 * account), and involved the Trivia contract (direct joinBattle call or PlayerJoined event).
 *
 * Uses Base public RPC (`https://mainnet.base.org`) by default for reads — reliable JSON-RPC
 * and full receipts. We intentionally do **not** use `BASE_RPC_URL` / `NEXT_PUBLIC_BASE_RPC_URL`
 * here: those often point at Alchemy and can return non-JSON errors or stub receipts.
 * Set `PAID_VERIFY_RPC_URL` only if you want a different primary (we still fall back to Base public).
 * Stub receipts (zero blockHash but valid blockNumber) and truncated receipt.logs are handled via
 * block-scoped `eth_getLogs` for `PlayerJoined` when needed.
 */

import { createPublicClient, http, decodeEventLog, encodeFunctionData, type Hash } from 'viem';
import { base } from 'viem/chains';
import { TRIVIA_CONTRACT_ADDRESS, TRIVIA_ABI } from '@/lib/blockchain/contracts';

const DEFAULT_BASE_PUBLIC_RPC = 'https://mainnet.base.org';

const JOIN_BATTLE_SELECTOR = (() => {
  const data = encodeFunctionData({
    abi: TRIVIA_ABI,
    functionName: 'joinBattle',
    args: [],
  });
  return data.slice(0, 10).toLowerCase();
})();

/** Normalize address for comparison (lowercase, no 0x prefix issues) */
function normalizeAddress(addr: string): string {
  if (!addr || typeof addr !== 'string') return '';
  const a = addr.trim();
  return a.startsWith('0x') ? a.toLowerCase() : `0x${a}`.toLowerCase();
}

/**
 * RPCs for paid-tx verification (deduped, ordered).
 * Default is Base public only — avoids Alchemy on `BASE_RPC_URL` breaking verification (invalid JSON, stubs).
 */
function getPaidVerificationRpcUrls(): string[] {
  const explicit = process.env.PAID_VERIFY_RPC_URL?.trim();
  const urls = explicit
    ? [explicit, DEFAULT_BASE_PUBLIC_RPC]
    : [DEFAULT_BASE_PUBLIC_RPC];
  return [...new Set(urls)];
}

const ZERO_BLOCK_HASH =
  '0x0000000000000000000000000000000000000000000000000000000000000000' as const;

/**
 * Receipt is anchored enough for verification (receipt.logs and/or eth_getLogs at a block).
 * Zero blockHash with a real blockNumber still works for block-scoped getLogs (CDP / indexer stubs).
 */
function receiptHasUsableBlockAnchor(receipt: {
  blockHash?: string | null;
  blockNumber?: bigint;
}): boolean {
  if (receipt.blockNumber != null && receipt.blockNumber > BigInt(0)) return true;
  const bh = receipt.blockHash;
  return !!bh && bh !== ZERO_BLOCK_HASH;
}

function decodePlayerJoinedFromLog(log: {
  address: string;
  data: `0x${string}`;
  topics: readonly `0x${string}`[];
}): { player: string; sessionId: string } | null {
  try {
    const decoded = decodeEventLog({
      abi: TRIVIA_ABI,
      data: log.data,
      topics: [...log.topics] as [signature: `0x${string}`, ...args: `0x${string}`[]],
    });
    if (decoded.eventName === 'PlayerJoined' && decoded.args?.player) {
      const sessionId = decoded.args.sessionId;
      return {
        player: normalizeAddress(decoded.args.player as string),
        sessionId:
          typeof sessionId === 'bigint' ? sessionId.toString() : String(sessionId ?? ''),
      };
    }
    if (decoded.eventName === 'PlayerRejoined' && decoded.args?.player) {
      const sessionId = decoded.args.sessionId;
      return {
        player: normalizeAddress(decoded.args.player as string),
        sessionId:
          typeof sessionId === 'bigint' ? sessionId.toString() : String(sessionId ?? ''),
      };
    }
  } catch {
    /* not our event */
  }
  return null;
}

function decodePlayerJoinedPlayerFromLog(log: {
  address: string;
  data: `0x${string}`;
  topics: readonly `0x${string}`[];
}): string | null {
  return decodePlayerJoinedFromLog(log)?.player ?? null;
}

async function getReceiptAndTransaction(hash: Hash) {
  const urls = getPaidVerificationRpcUrls();
  let lastMessage = 'All RPC endpoints failed';

  for (const url of urls) {
    try {
      const client = createPublicClient({
        chain: base,
        transport: http(url, { timeout: 25_000 }),
      });
      const [receipt, transaction] = await Promise.all([
        client.getTransactionReceipt({ hash }),
        client.getTransaction({ hash }),
      ]);

      if (receipt.status !== 'success') {
        lastMessage = 'Transaction did not succeed on-chain';
        continue;
      }

      if (!receiptHasUsableBlockAnchor(receipt)) {
        lastMessage =
          'RPC returned a receipt without a block anchor (cannot verify bundled tx); trying another endpoint';
        continue;
      }

      return { receipt, transaction };
    } catch (e) {
      lastMessage = e instanceof Error ? e.message : String(e);
      continue;
    }
  }

  throw new Error(lastMessage);
}

/** When receipt.logs omits Trivia events (common for AA bundles), find PlayerJoined via eth_getLogs in that block. */
async function findPlayerJoinedPlayerViaGetLogs(
  hash: Hash,
  blockNumber: bigint,
  candidateSet: Set<string>
): Promise<boolean> {
  const urls = getPaidVerificationRpcUrls();
  const trivia = TRIVIA_CONTRACT_ADDRESS as `0x${string}`;
  const hashLower = hash.toLowerCase();

  for (const url of urls) {
    try {
      const client = createPublicClient({
        chain: base,
        transport: http(url, { timeout: 25_000 }),
      });
      const logs = await client.getLogs({
        address: trivia,
        fromBlock: blockNumber,
        toBlock: blockNumber,
      });
      for (const log of logs) {
        if (log.transactionHash?.toLowerCase() !== hashLower) continue;
        const player = decodePlayerJoinedPlayerFromLog(log);
        if (player && candidateSetHas(candidateSet, player)) return true;
      }
    } catch {
      // try next URL
    }
  }
  return false;
}

function uniqueCandidates(primary: string, alternate?: string): string[] {
  const out: string[] = [];
  const p = normalizeAddress(primary);
  if (p) out.push(p);
  if (alternate) {
    const a = normalizeAddress(alternate);
    if (a && a !== p) out.push(a);
  }
  return out;
}

export type VerifyPaidTxOptions = {
  /** Base Account universal address when `walletAddress` is the sub-account smart wallet. */
  alternateWalletAddress?: string;
};

async function readSessionCounterAtBlock(blockNumber: bigint): Promise<string | null> {
  const urls = getPaidVerificationRpcUrls();
  const trivia = TRIVIA_CONTRACT_ADDRESS as `0x${string}`;

  for (const url of urls) {
    try {
      const client = createPublicClient({
        chain: base,
        transport: http(url, { timeout: 25_000 }),
      });
      const counter = await client.readContract({
        address: trivia,
        abi: TRIVIA_ABI,
        functionName: 'sessionCounter',
        blockNumber,
      });
      return (counter as bigint).toString();
    } catch {
      // try next
    }
  }
  return null;
}

function candidateSetHas(candidates: Set<string>, addr: string): boolean {
  const n = normalizeAddress(addr);
  return n.length > 0 && candidates.has(n);
}

async function findPlayerJoinedViaGetLogs(
  hash: Hash,
  blockNumber: bigint,
  candidateSet: Set<string>
): Promise<{ player: string; sessionId: string } | null> {
  const urls = getPaidVerificationRpcUrls();
  const trivia = TRIVIA_CONTRACT_ADDRESS as `0x${string}`;
  const hashLower = hash.toLowerCase();

  for (const url of urls) {
    try {
      const client = createPublicClient({
        chain: base,
        transport: http(url, { timeout: 25_000 }),
      });
      const logs = await client.getLogs({
        address: trivia,
        fromBlock: blockNumber,
        toBlock: blockNumber,
      });
      for (const log of logs) {
        if (log.transactionHash?.toLowerCase() !== hashLower) continue;
        const parsed = decodePlayerJoinedFromLog(log);
        if (parsed && candidateSetHas(candidateSet, parsed.player)) {
          return parsed;
        }
      }
    } catch {
      // try next URL
    }
  }
  return null;
}

function extractSessionIdFromReceipt(
  receipt: { logs: readonly { address: string; data: `0x${string}`; topics: readonly `0x${string}`[] }[] },
  candidateSet: Set<string>,
  triviaAddress: string
): string | null {
  for (const log of receipt.logs) {
    if (normalizeAddress(log.address) !== triviaAddress) continue;
    const parsed = decodePlayerJoinedFromLog(log);
    if (parsed && candidateSetHas(candidateSet, parsed.player) && parsed.sessionId) {
      return parsed.sessionId;
    }
  }
  return null;
}

async function resolveOnChainSessionId(
  receipt: { logs: readonly { address: string; data: `0x${string}`; topics: readonly `0x${string}`[] }[]; blockNumber?: bigint | null },
  hash: Hash,
  candidateSet: Set<string>,
  triviaAddress: string
): Promise<string | null> {
  const fromReceipt = extractSessionIdFromReceipt(receipt, candidateSet, triviaAddress);
  if (fromReceipt) return fromReceipt;

  if (receipt.blockNumber != null && receipt.blockNumber > BigInt(0)) {
    const fromLogs = await findPlayerJoinedViaGetLogs(hash, receipt.blockNumber, candidateSet);
    if (fromLogs?.sessionId) return fromLogs.sessionId;
    const atBlock = await readSessionCounterAtBlock(receipt.blockNumber);
    if (atBlock) return atBlock;
  }
  return null;
}

export type VerifyPaidTxSuccess = {
  ok: true;
  onChainSessionId: string;
};

export type VerifyPaidTxResult = VerifyPaidTxSuccess | { ok: false; error: string };

/**
 * Verify that paidTxHash is a successful on-chain transaction that registered the player
 * on the Trivia contract (joinBattle or PlayerJoined). Supports smart wallets where
 * `transaction.from` may be the sub-account, universal account, or a bundler/entry point:
 * PlayerJoined(player) matching either supplied address is accepted.
 */
export async function verifyPaidTxHash(
  paidTxHash: string,
  walletAddress: string,
  options?: VerifyPaidTxOptions
): Promise<VerifyPaidTxResult> {
  const txHash = paidTxHash?.trim();
  const candidates = uniqueCandidates(walletAddress, options?.alternateWalletAddress);
  const candidateSet = new Set(candidates);

  if (!txHash || candidates.length === 0) {
    return { ok: false, error: 'Missing paidTxHash or walletAddress' };
  }
  if (!txHash.startsWith('0x') || txHash.length !== 66) {
    return { ok: false, error: 'Invalid transaction hash format' };
  }

  const hash = txHash as Hash;

  const loaded = await (async () => {
    try {
      const data = await getReceiptAndTransaction(hash);
      return { ok: true as const, data };
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Unknown error';
      return {
        ok: false as const,
        error: `Could not load transaction from RPC (${message}). If you already paid, try again in a moment — verification will retry other RPCs. You can set PAID_VERIFY_RPC_URL (optional primary; always falls back to Base public RPC).`,
      };
    }
  })();

  if (!loaded.ok) {
    return { ok: false, error: loaded.error };
  }

  const { receipt, transaction } = loaded.data;

  try {
    if (!receipt) {
      return { ok: false, error: 'Transaction not found (may still be pending)' };
    }
    if (!transaction) {
      return { ok: false, error: 'Transaction details not found' };
    }
    if (receipt.status !== 'success') {
      return { ok: false, error: 'Transaction did not succeed on-chain' };
    }

    const triviaAddress = normalizeAddress(TRIVIA_CONTRACT_ADDRESS);
    const txFrom = normalizeAddress(transaction.from);

    let verified = false;

    // Case 1: PlayerJoined / PlayerRejoined from Trivia — strongest signal for AA / batched flows
    for (const log of receipt.logs) {
      if (normalizeAddress(log.address) !== triviaAddress) continue;
      const eventPlayer = decodePlayerJoinedPlayerFromLog(log);
      if (eventPlayer && candidateSetHas(candidateSet, eventPlayer)) {
        verified = true;
        break;
      }
    }

    // Case 2: Direct call to Trivia joinBattle from a known player address
    if (
      !verified &&
      transaction.to &&
      normalizeAddress(transaction.to) === triviaAddress &&
      transaction.input &&
      transaction.input.toLowerCase().startsWith(JOIN_BATTLE_SELECTOR)
    ) {
      if (candidateSetHas(candidateSet, txFrom)) {
        verified = true;
      } else {
        return {
          ok: false,
          error:
            'Transaction called joinBattle but sender does not match your connected wallet (try reconnecting)',
        };
      }
    }

    // Case 3: Receipt.logs truncated for bundled txs — same block + tx hash via eth_getLogs
    if (
      !verified &&
      receipt.blockNumber != null &&
      receipt.blockNumber > BigInt(0)
    ) {
      const okViaLogs = await findPlayerJoinedPlayerViaGetLogs(
        hash,
        receipt.blockNumber,
        candidateSet
      );
      if (okViaLogs) verified = true;
    }

    if (!verified) {
      return { ok: false, error: 'Transaction did not call joinBattle or emit PlayerJoined for this wallet' };
    }

    const onChainSessionId = await resolveOnChainSessionId(
      receipt,
      hash,
      candidateSet,
      triviaAddress
    );
    if (!onChainSessionId) {
      return { ok: false, error: 'Could not determine on-chain session id from payment transaction' };
    }

    return { ok: true, onChainSessionId };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Verification failed: ${message}` };
  }
}
