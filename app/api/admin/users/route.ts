import { NextRequest, NextResponse } from 'next/server';
import { spacetimeClient } from '@/lib/apis/spacetime';

export async function GET(req: NextRequest) {
  try {
    // TODO: Add admin authentication middleware here
    // For now, we'll implement basic admin access
    
    await spacetimeClient.initialize();
    await spacetimeClient.getAllPlayersAdmin();
    
    return NextResponse.json({ 
      success: true, 
      message: 'All players retrieved successfully (admin access)',
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('❌ Admin users access failed:', error);
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
    const body = await req.json();
    const { action, targetIdentity, adminLevel } = body;
    
    // TODO: Add admin authentication middleware here
    // For now, we'll implement basic admin access
    
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
      await spacetimeClient.listAdmins();
      return NextResponse.json({ 
        success: true, 
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
    console.error('❌ Admin user management failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to manage admin users',
        details: error instanceof Error ? error.message : 'Unknown error'
      },
      { status: 500 }
    );
  }
}
