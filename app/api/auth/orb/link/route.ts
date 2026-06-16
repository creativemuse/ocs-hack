import { NextRequest, NextResponse } from 'next/server';
import { verifyMessage } from 'viem';
import { verifyOrbAccessToken } from '@/lib/orb/lensProfile.server';
import { spacetimeClient } from '@/lib/apis/spacetime';

export const runtime = 'nodejs';

type LinkBody = {
  accessToken?: string;
  walletAddress?: string;
  message?: string;
  signature?: string;
};

export async function POST(request: NextRequest) {
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

    const isValidSig = await verifyMessage({
      address: wallet as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });

    if (!isValidSig) {
      return NextResponse.json({ error: 'Invalid wallet signature' }, { status: 401 });
    }

    const siweAddressMatch = message.match(
      /wants you to sign in with your Ethereum account:\n(0x[a-fA-F0-9]{40})/,
    );
    const signedAddress = siweAddressMatch?.[1]?.toLowerCase();
    if (signedAddress && signedAddress !== wallet) {
      return NextResponse.json(
        { error: 'Signature address does not match walletAddress' },
        { status: 401 },
      );
    }

    const profile = await verifyOrbAccessToken(accessToken);

    await spacetimeClient.initialize();
    if (!spacetimeClient.isConfigured()) {
      return NextResponse.json(
        { error: 'SpacetimeDB not configured on server' },
        { status: 503 },
      );
    }

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
    console.error('❌ Orb link failed:', error);
    return NextResponse.json(
      {
        error:
          error instanceof Error ? error.message : 'Failed to link Orb profile',
      },
      { status: 401 },
    );
  }
}
