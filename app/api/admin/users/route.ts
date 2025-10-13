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
    const players = spacetimeClient.getAllPlayers();
    
    apiLogger.success('GET', '/api/admin/users');
    
    return NextResponse.json({ 
      success: true,
      data: players,
      message: 'All players retrieved successfully (admin access)',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    apiLogger.error('GET', '/api/admin/users', error);
    return NextResponse.json(
      { 
        error: 'Failed to retrieve users',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // Admin authentication required
    const authError = checkAdminAuth(req);
    if (authError) return authError;
    
    const body = await req.json();
    const { action, targetIdentity, adminLevel } = body;
    
    await spacetimeClient.initialize();
    
    if (action === 'grant') {
      if (!targetIdentity || !adminLevel) {
        return NextResponse.json(
          { error: 'targetIdentity and adminLevel are required for grant action' },
          { status: 400 }
        );
      }
      await spacetimeClient.grantAdminPrivileges(targetIdentity, adminLevel);
      return NextResponse.json({ 
        success: true, 
        message: `Admin privileges granted to ${targetIdentity}`,
        action: 'grant',
        targetIdentity,
        adminLevel
      });
    } else if (action === 'revoke') {
      if (!targetIdentity) {
        return NextResponse.json(
          { error: 'targetIdentity is required for revoke action' },
          { status: 400 }
        );
      }
      await spacetimeClient.revokeAdminPrivileges(targetIdentity);
      return NextResponse.json({ 
        success: true, 
        message: `Admin privileges revoked from ${targetIdentity}`,
        action: 'revoke',
        targetIdentity
      });
    } else if (action === 'list') {
      const admins = spacetimeClient.getAllAdmins();
      return NextResponse.json({ 
        success: true,
        data: admins,
        message: 'Admin list retrieved successfully',
        action: 'list'
      });
    } else {
      return NextResponse.json(
        { error: 'Invalid action. Supported actions: grant, revoke, list' },
        { status: 400 }
      );
    }
  } catch (error) {
    apiLogger.error('POST', '/api/admin/users', error);
    return NextResponse.json(
      { 
        error: 'Failed to manage admin users',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
