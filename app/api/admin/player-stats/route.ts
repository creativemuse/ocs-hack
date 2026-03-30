import { NextRequest, NextResponse } from 'next/server';
import { spacetimeClient } from '@/lib/apis/spacetime';
import { checkAdminAuth } from '@/lib/utils/adminAuthMiddleware';
import { apiLogger } from '@/lib/utils/logger';

export async function GET(req: NextRequest) {
  try {
    // Admin authentication required
    const authError = checkAdminAuth(req);
    if (authError) return authError;
    
    await spacetimeClient.initialize();
    const playerStats = spacetimeClient.getAllPlayerStats();
    
    apiLogger.success('GET', '/api/admin/player-stats');
    
    return NextResponse.json({ 
      success: true,
      data: playerStats,
      message: 'Player stats retrieved successfully (admin access)',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    apiLogger.error('GET', '/api/admin/player-stats', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve player stats',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
