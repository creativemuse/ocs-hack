import { NextRequest, NextResponse } from 'next/server';
import { spacetimeClient } from '@/lib/apis/spacetime';

export async function GET(req: NextRequest) {
  try {
    // TODO: Add admin authentication middleware here
    // For now, we'll implement basic admin access
    
    await spacetimeClient.initialize();
    await spacetimeClient.getAllPendingClaimsAdmin();
    
    return NextResponse.json({ 
      success: true, 
      message: 'Pending claims retrieved successfully (admin access)',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Admin claims access failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve pending claims',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
