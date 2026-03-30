import { NextResponse } from 'next/server';

/**
 * Health check endpoint for monitoring and load balancer checks
 * Returns 200 OK with basic system information
 */
export async function GET() {
  const healthData = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    uptime: process.uptime(),
    version: process.env.npm_package_version || '1.0.0',
    checks: {
      api: 'ok',
      // Add more health checks as needed
    }
  };

  return NextResponse.json(healthData, {
    status: 200,
    headers: {
      'Cache-Control': 'no-cache, no-store, must-revalidate',
      'X-Content-Type-Options': 'nosniff',
    },
  });
}
