import { NextRequest, NextResponse } from 'next/server';
import { createHash, timingSafeEqual } from 'crypto';
import { logger } from './logger';

/**
 * Admin authentication middleware
 * Validates admin API requests using Bearer token
 */

export function validateAdminAuth(req: NextRequest): boolean {
  const authHeader = req.headers.get('authorization');
  const adminSecret = process.env.ADMIN_API_SECRET;

  // Check if admin secret is configured
  if (!adminSecret) {
    logger.error('ADMIN_API_SECRET not configured in environment variables');
    return false;
  }

  // Check if authorization header is present
  if (!authHeader) {
    logger.warn('Admin request missing authorization header');
    return false;
  }

  // Validate Bearer token format
  const [type, token] = authHeader.split(' ');
  if (type !== 'Bearer' || !token) {
    logger.warn('Invalid authorization header format');
    return false;
  }

  // Validate token matches admin secret using timing-safe comparison
  const tokenHash = createHash('sha256').update(token).digest();
  const secretHash = createHash('sha256').update(adminSecret).digest();
  if (!timingSafeEqual(tokenHash, secretHash)) {
    logger.warn('Invalid admin token provided');
    return false;
  }

  return true;
}

/**
 * Middleware wrapper for admin routes
 * Returns unauthorized response if authentication fails
 */
export function withAdminAuth(
  handler: (req: NextRequest) => Promise<NextResponse>
) {
  return async (req: NextRequest): Promise<NextResponse> => {
    if (!validateAdminAuth(req)) {
      return NextResponse.json(
        { 
          error: 'Unauthorized',
          message: 'Valid admin authentication required. Use: Authorization: Bearer <ADMIN_API_SECRET>'
        },
        { 
          status: 401,
          headers: {
            'WWW-Authenticate': 'Bearer realm="Admin API"',
            'X-Content-Type-Options': 'nosniff',
          }
        }
      );
    }

    return handler(req);
  };
}

/**
 * Check admin auth and return appropriate response if unauthorized
 * Use this for inline checks in route handlers
 */
export function checkAdminAuth(req: NextRequest): NextResponse | null {
  if (!validateAdminAuth(req)) {
    return NextResponse.json(
      { 
        error: 'Unauthorized',
        message: 'Valid admin authentication required. Use: Authorization: Bearer <ADMIN_API_SECRET>'
      },
      { 
        status: 401,
        headers: {
          'WWW-Authenticate': 'Bearer realm="Admin API"',
          'X-Content-Type-Options': 'nosniff',
        }
      }
    );
  }
  return null;
}

