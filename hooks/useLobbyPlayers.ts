'use client';

import { useMemo } from 'react';
import { useSpacetime } from '@/components/providers/SpacetimeProvider';
import type { Player } from '@/lib/spacetime/database';
import type { PoolPlayer } from '@/lib/spacetime/types';
import type { SocialIdentity } from '@/lib/spacetime/types';
import { formatWalletAddress } from '@/lib/identity/resolveBaseProfile';
import { Timestamp } from 'spacetimedb';

const timestampToIso = (ts: unknown): string => {
  if (!ts) {
    return new Date().toISOString();
  }

  let micros: bigint | undefined;
  if (ts instanceof Timestamp) {
    micros = ts.microsSinceUnixEpoch;
  } else if (typeof ts === 'object' && ts !== null && 'microsSinceUnixEpoch' in ts) {
    const raw = (ts as { microsSinceUnixEpoch: unknown }).microsSinceUnixEpoch;
    micros = typeof raw === 'bigint' ? raw : BigInt(String(raw));
  }

  if (micros !== undefined) {
    return new Date(Number(micros / BigInt(1000))).toISOString();
  }

  return new Date().toISOString();
};

export type LobbyPlayer = {
  playerId: string;
  address: string;
  username: string;
  avatarUrl: string | null;
  handle: string | null;
  isWalletUser: boolean;
  joinedAt: string;
};

type UseLobbyPlayersOptions = {
  sessionId?: string | null;
};

const resolveDisplayName = (
  wallet: string,
  player?: Player,
  social?: SocialIdentity,
): { username: string; handle: string | null; avatarUrl: string | null } => {
  if (social?.handle) {
    return {
      username: `@${social.handle}`,
      handle: social.handle,
      avatarUrl: social.avatarUrl ?? player?.avatarUrl ?? null,
    };
  }

  if (player?.username) {
    return {
      username: player.username,
      handle: player.username.startsWith('@') ? player.username.slice(1) : null,
      avatarUrl: player.avatarUrl ?? null,
    };
  }

  return {
    username: formatWalletAddress(wallet),
    handle: null,
    avatarUrl: player?.avatarUrl ?? null,
  };
};

export const useLobbyPlayers = ({ sessionId }: UseLobbyPlayersOptions = {}) => {
  const { connection, isConnected } = useSpacetime();

  const players = useMemo((): LobbyPlayer[] => {
    if (!connection || !isConnected) {
      return [];
    }

    const poolRows = Array.from(connection.db.pool_players.iter()) as PoolPlayer[];
    const playerRows = Array.from(connection.db.players.iter()) as Player[];
    const socialRows = Array.from(connection.db.social_identity.iter()) as SocialIdentity[];

    const playersByWallet = new Map(
      playerRows.map((p) => [p.walletAddress.toLowerCase(), p]),
    );
    const socialByWallet = new Map(
      socialRows.map((s) => [s.walletAddress.toLowerCase(), s]),
    );

    const filteredPool = sessionId
      ? poolRows.filter((row) => row.sessionId === sessionId)
      : poolRows;

    return filteredPool
      .filter((row) => row.walletAddress)
      .map((row) => {
        const wallet = row.walletAddress!.toLowerCase();
        const player = playersByWallet.get(wallet);
        const social = socialByWallet.get(wallet);
        const display = resolveDisplayName(wallet, player, social);

        return {
          playerId: row.playerId,
          address: wallet,
          username: display.username,
          avatarUrl: display.avatarUrl,
          handle: display.handle,
          isWalletUser: true,
          joinedAt: timestampToIso(row.joinedAt),
        };
      });
  }, [connection, isConnected, sessionId]);

  return {
    players,
    isLoading: !isConnected,
    isLive: isConnected && players.length > 0,
  };
};
