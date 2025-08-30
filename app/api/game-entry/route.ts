import { NextRequest, NextResponse } from 'next/server';
import { SupabaseDatabase } from '@/lib/apis/supabase';
import { signEntryToken } from '@/lib/utils/jwt';

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
    const { sessionId, isTrial, walletAddress, paidTxHash } = body as {
      sessionId: string;
      isTrial: boolean;
      walletAddress?: string;
      paidTxHash?: string;
    };

    if (!sessionId) {
      return NextResponse.json({ error: 'sessionId required' }, { status: 400 });
    }

    // Determine identity
    let anonId: string | undefined;
    const { anonId: ensuredAnon, resHeaders } = getOrSetAnonId(req);
    if (!walletAddress) {
      anonId = ensuredAnon;
    }

    // Trials: allow only if they have remaining (wallet) or anon games_played < 1
    if (isTrial) {
      if (walletAddress) {
        const status = await SupabaseDatabase.getPlayerTrialStatus(walletAddress);
        const remaining = status?.trial_games_remaining ?? 1;
        if (remaining <= 0) {
          return NextResponse.json({ error: 'No trial games remaining' }, { status: 403 });
        }
      } else if (anonId) {
        const sess = await SupabaseDatabase.getOrCreateAnonymousSession(anonId);
        if ((sess?.games_played || 0) >= 1) {
          return NextResponse.json({ error: 'Trial already used' }, { status: 403, headers: resHeaders });
        }
      }
    } else {
      // Paid: expect a tx hash presence now, full verification can be added later
      if (!walletAddress) {
        return NextResponse.json({ error: 'walletAddress required for paid entry' }, { status: 400, headers: resHeaders });
      }
    }

    const entry = await SupabaseDatabase.upsertGameEntry({
      sessionId,
      isTrial,
      walletAddress,
      anonId,
      paidTxHash,
    });

    // Create short-lived JWT (10 minutes)
    const token = signEntryToken({
      entryId: entry!.id,
      sessionId,
      identity: { walletAddress, anonId },
      isTrial,
      exp: Math.floor(Date.now() / 1000) + 10 * 60,
    });

    const response = NextResponse.json({ entryId: entry?.id, token });
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


