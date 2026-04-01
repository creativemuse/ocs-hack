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

function decodePlayerJoinedPlayerFromLog(log: {
  address: string;
  data: `0x${string}`;
  topics: readonly `0x${string}`[];
}): string | null {
  try {
    const decoded = decodeEventLog({
      abi: TRIVIA_ABI,
      data: log.data,
      topics: [...log.topics] as [signature: `0x${string}`, ...args: `0x${string}`[]],
    });
    if (decoded.eventName === 'PlayerJoined' && decoded.args?.player) {
      return normalizeAddress(decoded.args.player as string);
    }
  } catch {
    /* not our event */
  }
  return null;
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

function candidateSetHas(candidates: Set<string>, addr: string): boolean {
  const n = normalizeAddress(addr);
  return n.length > 0 && candidates.has(n);
}

export type VerifyPaidTxOptions = {
  /** Base Account universal address when `walletAddress` is the sub-account smart wallet. */
  alternateWalletAddress?: string;
};

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
): Promise<{ ok: true } | { ok: false; error: string }> {
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

    // Case 1: PlayerJoined from Trivia — strongest signal for AA / batched flows
    for (const log of receipt.logs) {
      if (normalizeAddress(log.address) !== triviaAddress) continue;
      const eventPlayer = decodePlayerJoinedPlayerFromLog(log);
      if (eventPlayer && candidateSetHas(candidateSet, eventPlayer)) {
        return { ok: true };
      }
    }

    // Case 2: Direct call to Trivia joinBattle from a known player address
    if (
      transaction.to &&
      normalizeAddress(transaction.to) === triviaAddress &&
      transaction.input &&
      transaction.input.toLowerCase().startsWith(JOIN_BATTLE_SELECTOR)
    ) {
      if (candidateSetHas(candidateSet, txFrom)) {
        return { ok: true };
      }
      return {
        ok: false,
        error:
          'Transaction called joinBattle but sender does not match your connected wallet (try reconnecting)',
      };
    }

    // Case 3: Receipt.logs truncated for bundled txs — same block + tx hash via eth_getLogs
    if (receipt.blockNumber != null && receipt.blockNumber > BigInt(0)) {
      const okViaLogs = await findPlayerJoinedPlayerViaGetLogs(
        hash,
        receipt.blockNumber,
        candidateSet
      );
      if (okViaLogs) return { ok: true };
    }

    return { ok: false, error: 'Transaction did not call joinBattle or emit PlayerJoined for this wallet' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Verification failed: ${message}` };
  }
}
