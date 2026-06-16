import { NextRequest, NextResponse } from 'next/server';
import { createPublicClient, http } from 'viem';
import { base } from 'viem/chains';
import { verifyOrbAccessToken } from '@/lib/orb/lensProfile.server';
import { classifyOrbLinkError, type OrbLinkStep } from '@/lib/orb/linkErrors';
import { spacetimeClient } from '@/lib/apis/spacetime';

export const runtime = 'nodejs';

const baseClient = createPublicClient({
  chain: base,
  transport: http(
    process.env.NEXT_PUBLIC_BASE_RPC_URL ?? 'https://mainnet.base.org',
  ),
});

type LinkBody = {
  accessToken?: string;
  walletAddress?: string;
  message?: string;
  signature?: string;
};

const linkErrorResponse = (
  error: string,
  step: OrbLinkStep,
  status: number,
  extra?: Record<string, string | undefined>,
) =>
  NextResponse.json({ error, step, ...extra }, { status });

export async function POST(request: NextRequest) {
  try {
    const body = (await request.json()) as LinkBody;
    const { accessToken, walletAddress, message, signature } = body;

    if (!accessToken || !walletAddress || !message || !signature) {
      return linkErrorResponse(
        'Missing accessToken, walletAddress, message, or signature',
        'signature',
        400,
      );
    }

    const wallet = walletAddress.trim().toLowerCase();
    if (!wallet.startsWith('0x')) {
      return linkErrorResponse('Invalid wallet address', 'signature', 400);
    }

    const isValidSig = await baseClient.verifyMessage({
      address: wallet as `0x${string}`,
      message,
      signature: signature as `0x${string}`,
    });

    if (!isValidSig) {
      console.error('❌ Orb link failed at signature step: invalid wallet signature', {
        wallet,
      });
      return linkErrorResponse('Invalid wallet signature', 'signature', 401);
    }

    const siweAddressMatch = message.match(
      /wants you to sign in with your Ethereum account:\r?\n(0x[a-fA-F0-9]{40})/,
    );
    const signedAddress = siweAddressMatch?.[1]?.toLowerCase();
    if (signedAddress && signedAddress !== wallet) {
      console.error('❌ Orb link failed at signature step: address mismatch', {
        wallet,
        signedAddress,
      });
      return linkErrorResponse(
        'Signature address does not match walletAddress',
        'signature',
        401,
      );
    }

    let profile;
    try {
      profile = await verifyOrbAccessToken(accessToken);
    } catch (lensError) {
      const messageText =
        lensError instanceof Error ? lensError.message : 'Invalid or expired Orb/Lens session';
      console.error('❌ Orb link failed at lens step:', messageText);
      const { step, status } = classifyOrbLinkError(messageText);
      return linkErrorResponse(messageText, step, status);
    }

    try {
      await spacetimeClient.initialize();
    } catch (initError) {
      const messageText =
        initError instanceof Error
          ? initError.message
          : 'SpacetimeDB connection failed';
      console.error('❌ Orb link failed at spacetime_config step:', messageText);
      return linkErrorResponse(messageText, 'spacetime_config', 503);
    }

    if (!spacetimeClient.isConfigured()) {
      console.error('❌ Orb link failed at spacetime_config step: not configured');
      return linkErrorResponse(
        'SpacetimeDB not configured on server',
        'spacetime_config',
        503,
      );
    }

    const identityHex = spacetimeClient.getConnectedIdentityHex();
    const adminRecord = identityHex
      ? await spacetimeClient.getAdminByIdentity(identityHex)
      : null;

    if (!adminRecord) {
      console.error('❌ Orb link failed at spacetime_admin step', {
        identity: identityHex ?? 'unknown',
        module:
          process.env.SPACETIME_MODULE ||
          process.env.NEXT_PUBLIC_SPACETIME_MODULE ||
          'beat-me',
      });
      return linkErrorResponse(
        'Server identity is not an admin on this Spacetime module',
        'spacetime_admin',
        403,
        { identity: identityHex ?? undefined },
      );
    }

    try {
      await spacetimeClient.setVerifiedSocialIdentity({
        walletAddress: wallet,
        lensAccountId: profile.lensAccountId,
        handle: profile.handle,
        displayName: profile.displayName,
        avatarUrl: profile.avatarUrl,
      });
    } catch (writeError) {
      const messageText =
        writeError instanceof Error
          ? writeError.message
          : 'Failed to persist verified social identity';
      console.error('❌ Orb link failed at spacetime_write step:', messageText, {
        identity: identityHex ?? 'unknown',
        wallet,
        handle: profile.handle,
      });
      const { step, status } = classifyOrbLinkError(messageText);
      return linkErrorResponse(messageText, step, status);
    }

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
    const messageText =
      error instanceof Error ? error.message : 'Failed to link Orb profile';
    const { step, status } = classifyOrbLinkError(messageText);
    console.error('❌ Orb link failed:', messageText, { step });
    return linkErrorResponse(messageText, step, status);
  }
}
