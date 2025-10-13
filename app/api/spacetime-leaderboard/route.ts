import { NextRequest, NextResponse } from 'next/server';
import { spacetimeClient } from '@/lib/apis/spacetime';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const limit = parseInt(searchParams.get('limit') || '10');
    const type = searchParams.get('type') as 'paid' | 'trial' || 'paid';
    
    await spacetimeClient.initialize();
    
    const leaderboard = type === 'paid'
      ? await spacetimeClient.getLeaderboard(limit)
      : await spacetimeClient.getTrialLeaderboard(limit);
    
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
      { status: 500 }
    );
  }
}

