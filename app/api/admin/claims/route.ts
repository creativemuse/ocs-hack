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
    const pendingClaims = spacetimeClient.getPendingClaims();
    
    apiLogger.success('GET', '/api/admin/claims');
    
    return NextResponse.json({ 
      success: true, 
      data: pendingClaims,
      message: 'Pending claims retrieved successfully (admin access)',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    apiLogger.error('GET', '/api/admin/claims', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve pending claims',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
