import { NextRequest, NextResponse } from 'next/server';
import { checkAdminAuth } from '@/lib/utils/adminAuthMiddleware';
import { submitScoresOnChain } from '@/lib/blockchain/submitScoresOnChain';
import {
  createBasePublicClient,
  readOnChainPlayerScores,
  scoresAlreadySyncedOnChain,
  waitForNonZeroOnChainScores,
} from '@/lib/blockchain/onChainScoreSync';
import { TRIVIA_ABI, TRIVIA_CONTRACT_ADDRESS } from '@/lib/blockchain/contracts';
import {
  getWeeklyScoresForPlayers,
  hasResolvableWeeklyScores,
} from '@/lib/game/weeklyScoresForPlayers';
import { safeErrorMessage } from '@/lib/utils/safeErrorMessage';
import { type Hash } from 'viem';

/**
 * POST /api/submit-onchain-scores
 *
 * Admin-protected endpoint that syncs player scores from SpacetimeDB to on-chain.
 * Must be called before Chainlink CRE distributes prizes so that _findTopPlayers()
 * sees real scores instead of all-zero defaults.
 */

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

  // Parse optional sessionId from request body (v5 per-session).
  // CRE workflow sends { sessionId: "N" } to target a specific closed session.
  let targetSessionId: bigint | undefined;
  try {
    const body = await req.json();
    if (body?.sessionId !== undefined && body?.sessionId !== null && body?.sessionId !== '') {
      targetSessionId = BigInt(body.sessionId);
    }
  } catch {
    // Body may be empty or not JSON — that's fine, use live session.
  }

  try {
    const publicClient = createBasePublicClient();

    // Use per-session player list if a target session is specified (v5).
    const players = targetSessionId !== undefined
      ? (await publicClient.readContract({
          address: TRIVIA_CONTRACT_ADDRESS as `0x${string}`,
          abi: TRIVIA_ABI,
          functionName: 'getCurrentPlayersForSession',
          args: [targetSessionId],
        })) as `0x${string}`[]
      : (await publicClient.readContract({
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

    const { sessionCounter, scores: resolvedScores } = await getWeeklyScoresForPlayers(players);
    const addresses = resolvedScores.map((entry) => entry.address);
    const scores = resolvedScores.map((entry) => entry.score);
    const zeroScoreAddresses = resolvedScores
      .filter((entry) => entry.score === BigInt(0))
      .map((entry) => entry.address);

    if (!hasResolvableWeeklyScores(resolvedScores)) {
      return NextResponse.json(
        {
          error: 'No resolvable weekly scores for current session players',
          sessionCounter,
          players: players.length,
          zeroScoreAddresses,
        },
        { status: 409 },
      );
    }

    if (zeroScoreAddresses.length > 0) {
      console.warn(
        `submit-onchain-scores: ${zeroScoreAddresses.length} player(s) have no Spacetime score for session ${sessionCounter}:`,
        zeroScoreAddresses,
      );
    }

    const txHash = (await submitScoresOnChain(addresses, scores, targetSessionId)) as Hash | null;

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
    const verified = await waitForNonZeroOnChainScores(publicClient, players, { attempts: 6, delayMs: 2000 });

    if (!verified) {
      return NextResponse.json(
        {
          error: 'Transaction mined but on-chain scores still zero',
          txHash,
          sessionCounter,
        },
        { status: 500 },
      );
    }

    return NextResponse.json({
      success: receipt.status === 'success',
      txHash,
      blockNumber: Number(receipt.blockNumber),
      submitted: addresses.length,
      sessionCounter,
      zeroScoreAddresses: zeroScoreAddresses.length,
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
