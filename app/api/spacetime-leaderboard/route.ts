import { NextRequest, NextResponse } from 'next/server';
import {
  isSpacetimeHttpConfigured,
  mapSqlGuestPlayerRow,
  mapSqlPlayerRow,
  querySqlSafe,
} from '@/lib/apis/spacetimeHttp';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    const type = (searchParams.get('type') as 'paid' | 'trial') || 'paid';

    if (!isSpacetimeHttpConfigured()) {
      return NextResponse.json({
        leaderboard: [],
        type,
        count: 0,
        timestamp: new Date().toISOString(),
      });
    }

    const safeLimit = Number.isNaN(limit) ? 10 : Math.min(Math.max(limit, 1), 100);

    const leaderboard =
      type === 'paid'
        ? (
            await querySqlSafe<Record<string, unknown>>(
              `SELECT * FROM players
               WHERE total_earnings >= 0 OR weekly_best_score > 0
               ORDER BY weekly_best_score DESC
               LIMIT ${safeLimit}`,
            )
          ).map(mapSqlPlayerRow)
        : (
            await querySqlSafe<Record<string, unknown>>(
              `SELECT * FROM guest_players
               ORDER BY best_score DESC
               LIMIT ${safeLimit}`,
            )
          ).map(mapSqlGuestPlayerRow);

    return NextResponse.json({
      leaderboard,
      type,
      count: leaderboard.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return NextResponse.json(
      { error: 'Failed to fetch leaderboard' },
      { status: 500 },
    );
  }
}
