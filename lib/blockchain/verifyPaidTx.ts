/**
 * Server-side verification that a paid game entry transaction is valid on-chain.
 * Confirms the tx succeeded, was sent by the given wallet (or alternate Base universal
 * account), and involved the Trivia contract (direct joinBattle call or PlayerJoined event).
 */

import { createPublicClient, http, decodeEventLog, encodeFunctionData } from 'viem';
import { base } from 'viem/chains';
import { TRIVIA_CONTRACT_ADDRESS, TRIVIA_ABI } from '@/lib/blockchain/contracts';

const RPC_URL = process.env.BASE_RPC_URL || process.env.NEXT_PUBLIC_BASE_RPC_URL || 'https://mainnet.base.org';

const publicClient = createPublicClient({
  chain: base,
  transport: http(RPC_URL),
});

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

  try {
    const [receipt, transaction] = await Promise.all([
      publicClient.getTransactionReceipt({ hash: txHash as `0x${string}` }),
      publicClient.getTransaction({ hash: txHash as `0x${string}` }),
    ]);

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
      try {
        const decoded = decodeEventLog({
          abi: TRIVIA_ABI,
          data: log.data,
          topics: log.topics,
        });
        if (decoded.eventName === 'PlayerJoined' && decoded.args?.player) {
          const eventPlayer = normalizeAddress(decoded.args.player as string);
          if (candidateSetHas(candidateSet, eventPlayer)) {
            return { ok: true };
          }
        }
      } catch {
        // Not our event, skip
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

    return { ok: false, error: 'Transaction did not call joinBattle or emit PlayerJoined for this wallet' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Verification failed: ${message}` };
  }
}
