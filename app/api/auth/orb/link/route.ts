import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { verifyOrbAccessToken } from '@/lib/orb/lensProfile.server';
import { spacetimeClient } from '@/lib/apis/spacetime';
import { tryInitializeSpacetime } from '@/lib/apis/tryInitializeSpacetime';

export const runtime = 'nodejs';

const baseClient = createPublicClient({
  chain: base,
  transport: http(
    process.env.BASE_RPC_URL ??
      process.env.NEXT_PUBLIC_BASE_RPC_URL ??
      'https://mainnet.base.org',
  ),
});

type LinkBody = {
  accessToken?: string;
  walletAddress?: string;
  message?: string;
  signature?: string;
};

const mapStdbWriteError = (message: string): { status: number; error: string } => {
  if (message.includes('Only admins may set verified social identity')) {
    return {
      status: 503,
      error:
        'Profile linking is not configured on the server. Contact support or try again later.',
    };
  }
  if (message.includes('Not connected to SpacetimeDB')) {
    return {
      status: 503,
      error: 'Profile linking is temporarily unavailable. Please try again.',
    };
  }
  if (message.includes('already linked') || message.includes('already taken')) {
    return { status: 409, error: message };
  }
  return { status: 502, error: message };
};

export async function POST(request: NextRequest) {
  let step: 'validate' | 'lens_verify' | 'stdb_init' | 'stdb_write' = 'validate';

  try {
    const body = (await request.json()) as LinkBody;
    const { accessToken, walletAddress, message, signature } = body;

    if (!accessToken || !walletAddress || !message || !signature) {
      return NextResponse.json(
        { error: 'Missing accessToken, walletAddress, message, or signature' },
        { status: 400 },
      );
    }

    const wallet = walletAddress.trim().toLowerCase();
    if (!wallet.startsWith('0x')) {
      return NextResponse.json({ error: 'Invalid wallet address' }, { status: 400 });
    }

    const isValidSig = await baseClient.verifyMessage({
      address: wallet as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });

    if (!isValidSig) {
      return NextResponse.json({ error: 'Invalid wallet signature' }, { status: 401 });
    }

    const siweAddressMatch = message.match(
      /wants you to sign in with your Ethereum account:\r?\n(0x[a-fA-F0-9]{40})/,
    );
    const signedAddress = siweAddressMatch?.[1]?.toLowerCase();
    if (signedAddress && signedAddress !== wallet) {
      return NextResponse.json(
        { error: 'Signature address does not match walletAddress' },
        { status: 401 },
      );
    }

    step = 'lens_verify';
    const profile = await verifyOrbAccessToken(accessToken);

    if (!process.env.SPACETIME_TOKEN?.trim()) {
      console.error('❌ Orb link blocked: SPACETIME_TOKEN is not configured');
      return NextResponse.json(
        {
          error: 'Server not configured for profile linking',
          code: 'stdb_token_missing',
        },
        { status: 503 },
      );
    }

    step = 'stdb_init';
    const initResult = await tryInitializeSpacetime();
    if (!initResult.configured) {
      console.error('❌ Orb link stdb_init failed:', initResult.error);
      return NextResponse.json(
        {
          error: 'Profile linking is temporarily unavailable',
          code: 'stdb_unavailable',
          details: initResult.error,
        },
        { status: 503 },
      );
    }

    if (!spacetimeClient.isConfigured()) {
      return NextResponse.json(
        { error: 'SpacetimeDB not configured on server', code: 'stdb_unconfigured' },
        { status: 503 },
      );
    }

    step = 'stdb_write';
    await spacetimeClient.setVerifiedSocialIdentity({
      walletAddress: wallet,
      lensAccountId: profile.lensAccountId,
      handle: profile.handle,
      displayName: profile.displayName,
      avatarUrl: profile.avatarUrl,
    });

    return NextResponse.json({
      success: true,
      profile: {
        walletAddress: wallet,
        lensAccountId: profile.lensAccountId,
        handle: profile.handle,
        displayName: profile.displayName ?? `@${profile.handle}`,
        avatarUrl: profile.avatarUrl ?? null,
      },
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Failed to link Orb profile';
    console.error(`❌ Orb link failed at ${step}:`, message);

    if (step === 'lens_verify') {
      return NextResponse.json(
        {
          error: 'Invalid or expired Orb session — scan QR again',
          code: 'lens_verify_failed',
          details: message,
        },
        { status: 401 },
      );
    }

    if (step === 'stdb_write' || step === 'stdb_init') {
      const mapped = mapStdbWriteError(message);
      return NextResponse.json(
        { error: mapped.error, code: 'stdb_write_failed', details: message },
        { status: mapped.status },
      );
    }

    return NextResponse.json(
      { error: message, code: 'link_failed' },
      { status: 401 },
    );
  }
}
