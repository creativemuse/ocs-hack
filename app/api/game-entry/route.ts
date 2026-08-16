import { NextRequest, NextResponse } from 'next/server';
import { spacetimeClient } from '@/lib/apis/spacetime';
import { signEntryToken, PAID_ENTRY_TOKEN_TTL_SEC, TRIAL_ENTRY_TOKEN_TTL_SEC } from '@/lib/utils/jwt';
import { verifyPaidTxHash } from '@/lib/blockchain/verifyPaidTx';
import { initPaidScoreLedger } from '@/lib/game/paidScoreLedger';

// Naive sign/verify using a random token cookie for anon users.
// In production, replace with JWT and proper signing/rotation.
const ANON_COOKIE = 'bm_anon_id';

function getOrSetAnonId(req: NextRequest): { anonId: string; resHeaders: Headers } {
  const resHeaders = new Headers();
  let anonId = req.cookies.get(ANON_COOKIE)?.value;
  if (!anonId) {
    anonId = crypto.randomUUID();
    resHeaders.append('Set-Cookie', `${ANON_COOKIE}=${anonId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=31536000`);
  }
  return { anonId, resHeaders };
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { sessionId, isTrial, walletAddress, paidTxHash, walletUniversalAddress } = body as {
      sessionId: string;
      isTrial: boolean;
      walletAddress?: string;
      paidTxHash?: string;
      /** Optional Base universal account (EOA) when `walletAddress` is the sub-account. */
      walletUniversalAddress?: string;
    };

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }

    // Require JWT signing secret in production to prevent forged entry tokens
    if (process.env.NODE_ENV === 'production' && !process.env.ENTRY_TOKEN_SECRET) {
      console.error('ENTRY_TOKEN_SECRET is required in production');
      return NextResponse.json(
        { error: 'Server configuration error' },
        { status: 500 }
      );
    }
    let anonId: string | undefined;
    let onChainSessionId: string | undefined;
    const { anonId: ensuredAnon, resHeaders } = getOrSetAnonId(req);
    if (!walletAddress) {
      anonId = ensuredAnon;
    }

    // Initialize SpacetimeDB connection (non-fatal — game can proceed without it)
    try {
      await spacetimeClient.initialize();
    } catch (initError) {
      console.warn('⚠️ SpacetimeDB initialization failed (non-fatal):', initError);
    }

    // Trials: allow only if they have remaining games
    if (isTrial) {
      try {
        if (walletAddress) {
          const profile = spacetimeClient.getPlayerProfile(walletAddress);
          if (profile && profile.trialGamesRemaining !== undefined && profile.trialGamesRemaining <= 0) {
            return NextResponse.json(
              { error: 'Trial games exhausted. Connect your wallet to play for USDC.' },
              { status: 403, headers: resHeaders },
            );
          }
        } else if (anonId) {
          const anonSession = spacetimeClient.getAnonymousSession(anonId);
          if (anonSession && (anonSession.gamesPlayed ?? 0) >= 1) {
            return NextResponse.json(
              { error: 'Trial games exhausted. Connect your wallet to play for USDC.' },
              { status: 403, headers: resHeaders },
            );
          }
        }
      } catch (trialCheckError) {
        // If SpacetimeDB is unavailable, allow the trial (fail-open for UX)
        console.warn('Trial validation check failed (allowing):', trialCheckError);
      }
    } else {
      // Paid: require wallet and tx hash; verify on-chain before issuing JWT
      if (!walletAddress) {
        return NextResponse.json({ error: 'walletAddress required for paid entry' }, { status: 400, headers: resHeaders });
      }
      if (!paidTxHash || typeof paidTxHash !== 'string' || !paidTxHash.trim()) {
        return NextResponse.json({ error: 'paidTxHash required for paid entry' }, { status: 400, headers: resHeaders });
      }
      const verification = await verifyPaidTxHash(paidTxHash.trim(), walletAddress, {
        alternateWalletAddress:
          typeof walletUniversalAddress === 'string' && walletUniversalAddress.trim()
            ? walletUniversalAddress.trim()
            : undefined,
      });
      if (!verification.ok) {
        return NextResponse.json(
          { error: verification.error ?? 'Paid transaction could not be verified' },
          { status: 400, headers: resHeaders }
        );
      }
      onChainSessionId = verification.onChainSessionId;
    }

    const entryId = crypto.randomUUID();
    const tokenTtlSec = isTrial ? TRIAL_ENTRY_TOKEN_TTL_SEC : PAID_ENTRY_TOKEN_TTL_SEC;

    // Create game entry in SpaceTimeDB (non-fatal — JWT can still be issued without it)
    try {
      await spacetimeClient.createGameEntry(sessionId, walletAddress, anonId, isTrial, paidTxHash);
    } catch (spacetimeError) {
      console.warn('⚠️ SpacetimeDB createGameEntry failed (non-fatal):', spacetimeError);
    }

    if (!isTrial && walletAddress && onChainSessionId) {
      initPaidScoreLedger({
        entryId,
        walletAddress,
        onChainSessionId,
        paidTxHash: paidTxHash?.trim(),
      });
    }

    const token = signEntryToken({
      entryId,
      sessionId,
      onChainSessionId,
      identity: { walletAddress, anonId },
      isTrial,
      playerType: isTrial ? 'trial' : 'paid',
      paidTxHash: paidTxHash,
      exp: Math.floor(Date.now() / 1000) + tokenTtlSec,
    });

    const response = NextResponse.json({
      entryId,
      token,
      onChainSessionId: onChainSessionId ?? null,
    });
    // propagate cookie set for anon id if needed
    resHeaders.forEach((v, k) => response.headers.append(k, v));
    return response;
  } catch (error) {
    console.error('Error creating game entry:', error);
    const e: any = error;
    const message =
      (e && (e.message || e.error_description || e.hint || e.details || e.code)) ||
      (typeof e === 'string' ? e : 'Unknown error');
    return NextResponse.json({ error: `Failed to create entry: ${message}` }, { status: 500 });
  }
}


