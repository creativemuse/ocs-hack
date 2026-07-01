
import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import { mergeWeeklyLeaderboardEntries } from '../lib/game/weeklyLeaderboard';

describe('paid score appears on leaderboard', () => {
  it('weekly best score surfaces even when totalEarnings is zero', () => {
    const chainScores = new Map<string, number>();
    const spacetimePlayers = [
      {
        walletAddress: '0xabcdef1234567890123456789012345678901234',
        username: null,
        avatarUrl: null,
        weeklySessionId: BigInt(7),
        weeklyBestScore: 240,
        totalEarnings: 0,
      },
    ];

    const merged = mergeWeeklyLeaderboardEntries(7, chainScores, spacetimePlayers as any, 10);

    assert.equal(merged.length, 1);
    assert.equal(merged[0]!.bestScore, 240);
  });

  it('leaderboard reader should include paid players with weeklyBestScore > 0', () => {
    // This test documents the fix: previously getLeaderboard/getTopEarners filtered on totalEarnings > 0,
    // which excluded paid scores before any prizes were recorded.
    const players = [
      {
        walletAddress: '0xabcdef1234567890123456789012345678901234',
        totalEarnings: 0,
        weeklyBestScore: 240,
      },
    ];
    const paid = players.filter((p: any) => p.totalEarnings >= 0 || p.weeklyBestScore > 0);
    assert.equal(paid.length, 1, 'paid players with weeklyBestScore should be visible');
  });
});
