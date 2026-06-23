import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http, type Hash } from 'viem';
import { base } from 'viem/chains';
import { checkAdminAuth } from '@/lib/utils/adminAuthMiddleware';
import { spacetimeClient } from '@/lib/apis/spacetime';
import { submitScoresOnChain } from '@/lib/blockchain/submitScoresOnChain';
import {
  readOnChainPlayerScores,
  scoresAlreadySyncedOnChain,
  waitForNonZeroOnChainScores,
} from '@/lib/blockchain/onChainScoreSync';
import { TRIVIA_ABI, TRIVIA_CONTRACT_ADDRESS } from '@/lib/blockchain/contracts';
import { safeErrorMessage } from '@/lib/utils/safeErrorMessage';

/**
 * POST /api/submit-onchain-scores
 *
 * Admin-protected endpoint that syncs player scores from SpacetimeDB to on-chain.
 * Must be called before Chainlink CRE distributes prizes so that _findTopPlayers()
 * sees real scores instead of all-zero defaults.
 *
 * Requires:
 *   - Authorization: Bearer <ADMIN_API_SECRET>
 *   - CONTRACT_OWNER_PRIVATE_KEY env var (or PRIVATE_KEY fallback)
 */

const BASE_RPC = process.env.BASE_RPC_URL || 'https://mainnet.base.org';

export async function POST(req: NextRequest) {
  const authError = checkAdminAuth(req);
  if (authError) return authError;

  const ownerKey = process.env.CONTRACT_OWNER_PRIVATE_KEY || process.env.PRIVATE_KEY;
  if (!ownerKey) {
    return NextResponse.json(
      { error: 'CONTRACT_OWNER_PRIVATE_KEY not configured' },
      { status: 500 }
    );
  }

  try {
    const publicClient = createPublicClient({ chain: base, transport: http(BASE_RPC) });

    const players = (await publicClient.readContract({
      address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
      abi: TRIVIA_ABI,
      functionName: 'getCurrentPlayers',
    })) as `0x${string}`[];

    if (players.length === 0) {
      return NextResponse.json({ success: true, message: 'No players in current session', submitted: 0 });
    }

    if (await scoresAlreadySyncedOnChain(publicClient, players)) {
      const onChain = await readOnChainPlayerScores(publicClient, players);
      return NextResponse.json({
        success: true,
        message: 'Scores already on-chain; sync skipped (idempotent)',
        submitted: 0,
        skipped: true,
        scores: onChain.map((entry) => ({
          address: entry.address,
          score: Number(entry.score),
        })),
      });
    }

    await spacetimeClient.ensurePlayerDataReady();

    const addresses: `0x${string}`[] = [];
    const scores: bigint[] = [];
    const missingProfiles: string[] = [];

    for (const addr of players) {
      const profile = spacetimeClient.getPlayerProfile(addr);
      if (!profile) {
        missingProfiles.push(addr);
      }
      const score = profile
        ? BigInt(profile.weeklyBestScore > 0 ? profile.weeklyBestScore : profile.bestScore)
        : BigInt(0);
      addresses.push(addr);
      scores.push(score);
    }

    if (missingProfiles.length > 0) {
      console.warn(
        `submit-onchain-scores: ${missingProfiles.length} player(s) missing from Spacetime cache; submitting 0 for:`,
        missingProfiles
      );
    }

    const txHash = (await submitScoresOnChain(addresses, scores)) as Hash | null;

    if (!txHash) {
      const syncedAfterRace = await waitForNonZeroOnChainScores(publicClient, players);
      if (syncedAfterRace) {
        const onChain = await readOnChainPlayerScores(publicClient, players);
        return NextResponse.json({
          success: true,
          message: 'Scores synced by concurrent request; no new tx required',
          submitted: 0,
          skipped: true,
          scores: onChain.map((entry) => ({
            address: entry.address,
            score: Number(entry.score),
          })),
        });
      }

      return NextResponse.json({
        success: true,
        message: 'No active on-chain session — scores not submitted',
        submitted: 0,
      });
    }

    const receipt = await publicClient.waitForTransactionReceipt({ hash: txHash, confirmations: 1 });
    await waitForNonZeroOnChainScores(publicClient, players, { attempts: 4, delayMs: 1000 });

    return NextResponse.json({
      success: receipt.status === 'success',
      txHash,
      blockNumber: Number(receipt.blockNumber),
      submitted: addresses.length,
      missingProfiles: missingProfiles.length,
      scores: addresses.map((a, i) => ({ address: a, score: Number(scores[i]) })),
    });
  } catch (error) {
    const details = safeErrorMessage(error);
    console.error('Error submitting on-chain scores:', error);
    return NextResponse.json(
      {
        error: 'Failed to submit on-chain scores',
        details,
      },
      { status: 500 }
    );
  }
}
