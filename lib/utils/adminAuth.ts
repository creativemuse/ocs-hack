import { NextRequest } from 'next/server';
import { spacetimeClient } from '@/lib/apis/spacetime';
import { verifyEntryToken, type EntryTokenPayload } from './jwt';

export interface AdminAuthResult {
  isAdmin: boolean;
  adminLevel?: string;
  identity?: string;
  walletAddress?: string;
  error?: string;
}

/**
 * Admin authentication middleware
 * Checks if the requesting user has admin privileges
 */
export async function validateAdminAuth(req: NextRequest, requiredLevel: 'moderator' | 'admin' | 'super_admin' = 'moderator'): Promise<AdminAuthResult> {
  try {
    // Get authorization header
    const authHeader = req.headers.get('authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return {
        isAdmin: false,
        error: 'Missing or invalid authorization header'
      };
    }

    // Extract JWT token
    const token = authHeader.substring(7);
    
    // Validate the JWT token using our existing JWT utilities
    const payload = verifyEntryToken(token);
    if (!payload) {
      return {
        isAdmin: false,
        error: 'Invalid or expired JWT token'
      };
    }

    // Extract spacetime identity from the payload
    // Note: Admin privileges are tied to SpacetimeDB Identity, not wallet address
    const spacetimeIdentity = payload.spacetimeIdentity;
    
    if (!spacetimeIdentity) {
      return {
        isAdmin: false,
        error: 'No SpacetimeDB identity found in token. Admin auth requires SpacetimeDB connection.'
      };
    }

    // Check admin privileges in SpacetimeDB
    const privilegeResult = await checkAdminPrivileges(
      spacetimeIdentity, 
      payload.identity.walletAddress,
      requiredLevel
    );
    
    return privilegeResult;
  } catch (error) {
    console.error('❌ Admin authentication failed:', error);
    return {
      isAdmin: false,
      error: 'Authentication error'
    };
  }
}

/**
 * Check if user has admin privileges in SpacetimeDB
 * This queries the admins table to verify admin status and level
 * Note: Admins are identified by their SpacetimeDB Identity, not wallet address
 */
export async function checkAdminPrivileges(
  spacetimeIdentity: string, 
  walletAddress: string | undefined,
  requiredLevel: 'moderator' | 'admin' | 'super_admin' = 'moderator'
): Promise<AdminAuthResult> {
  try {
    await spacetimeClient.initialize();
    
    // Check if the user is an admin in SpacetimeDB by their spacetime identity
    const adminRecord = await spacetimeClient.getAdminByIdentity(spacetimeIdentity);
    
    if (!adminRecord) {
      return {
        isAdmin: false,
        error: 'User does not have admin privileges'
      };
    }

    // Map admin levels to hierarchy for comparison
    // AdminLevel is a tagged union with Moderator, Admin, SuperAdmin variants
    const levelHierarchy: Record<string, number> = {
      'SuperAdmin': 3,
      'Admin': 2,
      'Moderator': 1
    };

    const userLevel = levelHierarchy[adminRecord.adminLevel.tag] || 0;
    const requiredLevelValue = levelHierarchy[requiredLevel === 'super_admin' ? 'SuperAdmin' : 
                                                requiredLevel === 'admin' ? 'Admin' : 'Moderator'] || 0;

    if (userLevel < requiredLevelValue) {
      return {
        isAdmin: false,
        error: `Insufficient privileges. Required: ${requiredLevel}, has: ${adminRecord.adminLevel.tag}`
      };
    }
    
    return {
      isAdmin: true,
      adminLevel: adminRecord.adminLevel.tag,
      identity: spacetimeIdentity,
      walletAddress: walletAddress
    };
  } catch (error) {
    console.error('❌ Admin privilege check failed:', error);
    return {
      isAdmin: false,
      error: 'Failed to verify admin privileges'
    };
  }
}

/**
 * Admin authentication middleware for API routes
 */
export function withAdminAuth(requiredLevel: 'moderator' | 'admin' | 'super_admin' = 'moderator') {
  return async function adminAuthMiddleware(req: NextRequest) {
    const authResult = await validateAdminAuth(req, requiredLevel);
    
    if (!authResult.isAdmin) {
      return {
        success: false,
        error: authResult.error || 'Unauthorized',
        status: 401
      };
    }
    
    return {
      success: true,
      adminLevel: authResult.adminLevel,
      identity: authResult.identity
    };
  };
}
