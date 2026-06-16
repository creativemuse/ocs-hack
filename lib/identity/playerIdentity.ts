import { resolveLensMediaUrl } from '@/lib/identity/resolveLensMedia';
import {
  formatWalletAddress,
  resolveBaseProfile,
  type BaseProfile,
} from '@/lib/identity/resolveBaseProfile';

export type PlayerIdentityCache = {
  username?: string | null;
  avatarUrl?: string | null;
  handle?: string | null;
  displayName?: string | null;
  source?: 'spacetime' | 'lens' | 'base';
  universalWalletAddress?: string | null;
};

export type ResolvedPlayerIdentity = {
  walletAddress: string;
  displayName: string;
  avatarUrl: string | null;
  handle: string | null;
  basename: string | null;
  source: 'lens' | 'base' | 'wallet';
};

export const normalizeWallet = (address: string): string =>
  address.trim().toLowerCase();

export const mergeCachedIdentity = (
  walletAddress: string,
  cache?: PlayerIdentityCache | null,
): Partial<ResolvedPlayerIdentity> => {
  if (!cache) {
    return {};
  }

  const handle =
    cache.handle ??
    (cache.username?.startsWith('@') ? cache.username.slice(1) : null);

  return {
    displayName: cache.displayName ?? cache.username ?? undefined,
    avatarUrl: cache.avatarUrl ?? null,
    handle: handle ?? null,
    source: cache.source === 'lens' ? 'lens' : cache.source === 'base' ? 'base' : undefined,
  };
};

export const resolvePlayerIdentity = async (
  walletAddress: string,
  cache?: PlayerIdentityCache | null,
): Promise<ResolvedPlayerIdentity> => {
  const wallet = normalizeWallet(walletAddress);
  const cached = mergeCachedIdentity(wallet, cache);

  if (cached.displayName && cached.avatarUrl) {
    return {
      walletAddress: wallet,
      displayName: cached.displayName,
      avatarUrl: cached.avatarUrl,
      handle: cached.handle ?? null,
      basename: null,
      source: cached.source ?? 'lens',
    };
  }

  if (cached.displayName) {
    return {
      walletAddress: wallet,
      displayName: cached.displayName,
      avatarUrl: cached.avatarUrl ?? null,
      handle: cached.handle ?? null,
      basename: null,
      source: cached.source ?? 'lens',
    };
  }

  let baseProfile: BaseProfile = { basename: null, avatarUrl: null };
  if (wallet.startsWith('0x')) {
    const universal = cache?.universalWalletAddress ?? null;
    baseProfile = await resolveBaseProfile(
      wallet as `0x${string}`,
      universal as `0x${string}` | null,
    );
  }

  const displayName =
    baseProfile.basename ?? formatWalletAddress(wallet);

  return {
    walletAddress: wallet,
    displayName,
    avatarUrl: cached.avatarUrl ?? baseProfile.avatarUrl,
    handle: cached.handle ?? null,
    basename: baseProfile.basename,
    source: baseProfile.basename ? 'base' : 'wallet',
  };
};

export const resolveAvatarFromCacheOrBase = (
  walletAddress: string,
  cache?: PlayerIdentityCache | null,
  baseProfile?: BaseProfile | null,
): string | null => {
  const resolvedCache = cache?.avatarUrl;
  if (resolvedCache) {
    return resolveLensMediaUrl(resolvedCache) ?? resolvedCache;
  }
  return baseProfile?.avatarUrl ?? null;
};

export const getInitials = (displayName: string): string => {
  const cleaned = displayName.replace(/^@/, '').trim();
  if (!cleaned) {
    return '?';
  }
  const parts = cleaned.split(/[.\s_-]+/).filter(Boolean);
  if (parts.length >= 2) {
    return `${parts[0]![0] ?? ''}${parts[1]![0] ?? ''}`.toUpperCase();
  }
  return cleaned.slice(0, 2).toUpperCase();
};

export const gradientClassForWallet = (walletAddress: string): string => {
  const hash = walletAddress
    .split('')
    .reduce((acc, char) => acc + char.charCodeAt(0), 0);
  const gradients = [
    'from-purple-400 to-pink-400',
    'from-blue-400 to-cyan-400',
    'from-green-400 to-emerald-400',
    'from-orange-400 to-red-400',
    'from-indigo-400 to-violet-400',
  ];
  return gradients[hash % gradients.length]!;
};
