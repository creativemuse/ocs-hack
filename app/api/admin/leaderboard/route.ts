import { NextRequest, NextResponse } from 'next/server';
import { spacetimeClient } from '@/lib/apis/spacetime';
import { checkAdminAuth } from '@/lib/utils/adminAuthMiddleware';
import { apiLogger } from '@/lib/utils/logger';

export async function GET(req: NextRequest) {
  try {
    // Admin authentication required
    const authError = checkAdminAuth(req);
    if (authError) return authError;
    
    const { searchParams } = new URL(req.url);
    const type = searchParams.get('type') || 'paid'; // 'paid' or 'trial'
    const limit = parseInt(searchParams.get('limit') || '10', 10);
    
    await spacetimeClient.initialize();
    
    const leaderboard = type === 'trial' 
      ? spacetimeClient.getTrialLeaderboard(limit)
      : spacetimeClient.getLeaderboard(limit);
    
    apiLogger.success('GET', '/api/admin/leaderboard', { type });
    
    return NextResponse.json({ 
      success: true,
      data: leaderboard,
      message: `${type} leaderboard retrieved successfully (admin access)`,
      type,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    apiLogger.error('GET', '/api/admin/leaderboard', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve leaderboard',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
