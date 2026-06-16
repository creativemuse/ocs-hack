import { NextResponse } from 'next/server';
import { spacetimeClient } from '@/lib/apis/spacetime';
import { formatWalletAddress } from '@/lib/identity/resolveBaseProfile';

export const runtime = 'nodejs';
export const maxDuration = 30;

export async function GET() {
  try {
    await spacetimeClient.initialize({ syncPlayers: true });
    await spacetimeClient.waitForSync(12000).catch(() => undefined);

    if (!spacetimeClient.isConfigured()) {
      return NextResponse.json({
        players: [],
        count: 0,
        source: 'spacetime-unconfigured',
      });
    }

    const poolRows = spacetimeClient.getPoolPlayersForActiveSessions();
    const seen = new Set<string>();
    const players: Array<{
      address: string;
      username: string;
      avatarUrl: string | null;
      totalScore: number;
      gamesPlayed: number;
      isWalletUser: boolean;
      lastActive: string;
    }> = [];

    for (const row of poolRows) {
      const wallet = row.walletAddress?.trim().toLowerCase();
      if (!wallet || !wallet.startsWith('0x') || seen.has(wallet)) {
        continue;
      }
      seen.add(wallet);

      const player = spacetimeClient.getPlayerByWallet(wallet);
      const social = spacetimeClient.getSocialIdentityByWallet(wallet);

      const username = social?.handle
        ? `@${social.handle}`
        : player?.username ?? formatWalletAddress(wallet);

      players.push({
        address: wallet,
        username,
        avatarUrl: social?.avatarUrl ?? player?.avatarUrl ?? null,
        totalScore: Math.round(player?.totalEarnings ?? 0),
        gamesPlayed: player?.gamesPlayed ?? 0,
        isWalletUser: true,
        lastActive: new Date().toISOString(),
      });
    }

    if (players.length === 0) {
      const connections = spacetimeClient.getActiveConnections(16);
      for (const conn of connections) {
        const wallet = conn.walletAddress?.trim().toLowerCase();
        if (!wallet || !wallet.startsWith('0x') || seen.has(wallet)) {
          continue;
        }
        seen.add(wallet);
        const player = spacetimeClient.getPlayerByWallet(wallet);
        const social = spacetimeClient.getSocialIdentityByWallet(wallet);
        players.push({
          address: wallet,
          username: social?.handle
            ? `@${social.handle}`
            : player?.username ?? formatWalletAddress(wallet),
          avatarUrl: social?.avatarUrl ?? player?.avatarUrl ?? null,
          totalScore: Math.round(player?.totalEarnings ?? 0),
          gamesPlayed: player?.gamesPlayed ?? 0,
          isWalletUser: true,
          lastActive: conn.lastActivity.toISOString(),
        });
      }
    }

    return NextResponse.json({
      players,
      count: players.length,
      source: players.length > 0 ? 'spacetime-live' : 'spacetime-empty',
    });
  } catch (error) {
    console.error('❌ active-players-live failed:', error);
    return NextResponse.json({
      players: [],
      count: 0,
      source: 'spacetime-error',
      error: error instanceof Error ? error.message : 'Failed to load players',
    });
  }
}
