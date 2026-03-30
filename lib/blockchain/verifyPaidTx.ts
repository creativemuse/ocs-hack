/**
 * Server-side verification that a paid game entry transaction is valid on-chain.
 * Confirms the tx succeeded, was sent by the given wallet, and involved the Trivia
 * contract (direct joinBattle call or PlayerJoined event from batch).
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

/**
 * Verify that paidTxHash is a successful on-chain transaction from walletAddress
 * that involved the Trivia contract (joinBattle or PlayerJoined event).
 * Returns { ok: true } or { ok: false, error: string }.
 */
export async function verifyPaidTxHash(
  paidTxHash: string,
  walletAddress: string
): Promise<{ ok: true } | { ok: false; error: string }> {
  const txHash = paidTxHash?.trim();
  const wallet = normalizeAddress(walletAddress);

  if (!txHash || !wallet) {
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

    const txFrom = normalizeAddress(transaction.from);
    if (txFrom !== wallet) {
      return { ok: false, error: 'Transaction was not sent by the given wallet' };
    }

    const triviaAddress = normalizeAddress(TRIVIA_CONTRACT_ADDRESS);

    // Case 1: Direct call to Trivia joinBattle
    if (transaction.to && normalizeAddress(transaction.to) === triviaAddress && transaction.input) {
      if (transaction.input.toLowerCase().startsWith(JOIN_BATTLE_SELECTOR)) {
        return { ok: true };
      }
    }

    // Case 2: Batch or indirect call – look for PlayerJoined(player) from Trivia
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
          if (eventPlayer === wallet) {
            return { ok: true };
          }
        }
      } catch {
        // Not our event, skip
      }
    }

    return { ok: false, error: 'Transaction did not call joinBattle or emit PlayerJoined for this wallet' };
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Unknown error';
    return { ok: false, error: `Verification failed: ${message}` };
  }
}
