import { NextRequest, NextResponse } from 'next/server';
import { getWeeklyLeaderboardEntries } from '@/lib/game/weeklyLeaderboardServer';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10', 10);

    const { sessionCounter, entries } = await getWeeklyLeaderboardEntries(
      Math.min(Math.max(limit, 1), 50),
    );

    return NextResponse.json({
      success: true,
      sessionCounter,
      entries,
      count: entries.length,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('Error fetching weekly leaderboard:', error);
    return NextResponse.json(
      {
        success: false,
        error: 'Failed to fetch weekly leaderboard',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
