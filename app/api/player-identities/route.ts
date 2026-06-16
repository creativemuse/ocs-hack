import { NextRequest, NextResponse } from 'next/server';
import {
  mergeCachedIdentity,
  normalizeWallet,
  resolvePlayerIdentity,
  type PlayerIdentityCache,
  type ResolvedPlayerIdentity,
} from '@/lib/identity/playerIdentity';
import { spacetimeClient } from '@/lib/apis/spacetime';

export const runtime = 'nodejs';

const MAX_WALLETS = 20;

const parseWallets = (raw: string | null): string[] => {
  if (!raw?.trim()) {
    return [];
  }
  return [
    ...new Set(
      raw
        .split(',')
        .map((w) => normalizeWallet(w))
        .filter((w) => w.startsWith('0x')),
    ),
  ].slice(0, MAX_WALLETS);
};

const loadSpacetimeCache = async (
  wallets: string[],
): Promise<Map<string, PlayerIdentityCache>> => {
  const cache = new Map<string, PlayerIdentityCache>();
  if (wallets.length === 0) {
    return cache;
  }

  try {
    await spacetimeClient.initialize({ syncPlayers: true });
    if (!spacetimeClient.isConfigured()) {
      return cache;
    }

    for (const wallet of wallets) {
      const player = spacetimeClient.getPlayerByWallet(wallet);
      const social = spacetimeClient.getSocialIdentityByWallet(wallet);
      const universalWalletAddress =
        spacetimeClient.getUniversalWalletForSubAccount(wallet);

      if (social) {
        cache.set(wallet, {
          username: `@${social.handle}`,
          handle: social.handle,
          displayName: social.displayName ?? `@${social.handle}`,
          avatarUrl: social.avatarUrl ?? null,
          source: 'lens',
          universalWalletAddress,
        });
        continue;
      }

      if (player?.username || player?.avatarUrl) {
        cache.set(wallet, {
          username: player.username ?? undefined,
          avatarUrl: player.avatarUrl ?? null,
          source: 'spacetime',
          universalWalletAddress,
        });
        continue;
      }

      if (universalWalletAddress) {
        cache.set(wallet, {
          universalWalletAddress,
        });
      }
    }
  } catch (error) {
    console.warn('⚠️ Spacetime identity cache unavailable:', error);
  }

  return cache;
};

export async function GET(request: NextRequest) {
  const wallets = parseWallets(
    request.nextUrl.searchParams.get('wallets'),
  );

  if (wallets.length === 0) {
    return NextResponse.json(
      { error: 'Provide wallets query param (comma-separated, max 20)' },
      { status: 400 },
    );
  }

  const spacetimeCache = await loadSpacetimeCache(wallets);
  const identities: Record<string, ResolvedPlayerIdentity> = {};

  for (const wallet of wallets) {
    const cached = spacetimeCache.get(wallet);
    const merged = mergeCachedIdentity(wallet, cached);
    if (merged.displayName && merged.avatarUrl) {
      identities[wallet] = {
        walletAddress: wallet,
        displayName: merged.displayName,
        avatarUrl: merged.avatarUrl,
        handle: merged.handle ?? null,
        basename: null,
        source: merged.source ?? 'lens',
      };
      continue;
    }
    identities[wallet] = await resolvePlayerIdentity(wallet, cached);
  }

  return NextResponse.json({ identities });
}
