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
    const gameSessions = spacetimeClient.getAllGameSessions();
    
    apiLogger.success('GET', '/api/admin/game-sessions');
    
    return NextResponse.json({ 
      success: true,
      data: gameSessions,
      message: 'Game sessions retrieved successfully (admin access)',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    apiLogger.error('GET', '/api/admin/game-sessions', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve game sessions',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
