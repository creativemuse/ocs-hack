import { NextRequest, NextResponse } from 'next/server';
import { spacetimeClient } from '@/lib/apis/spacetime';

export async function GET(req: NextRequest) {
  try {
    // TODO: Add admin authentication middleware here
    // For now, we'll implement basic admin access
    
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'paid'; // 'paid' or 'trial'
    
    await spacetimeClient.initialize();
    
    if (type === 'trial') {
      await spacetimeClient.getTrialLeaderboardAdmin();
    } else {
      await spacetimeClient.getLeaderboardAdmin();
    }
    
    return NextResponse.json({ 
      success: true, 
      message: `${type} leaderboard retrieved successfully (admin access)`,
      type,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Admin leaderboard access failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve leaderboard',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
