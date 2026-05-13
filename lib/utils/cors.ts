/**
 * CORS utility for API routes
 * Manages allowed origins from environment variables
 */

// Get allowed origins from environment variable or use defaults
const getAllowedOrigins = (): string[] => {
  const envOrigins = process.env.ALLOWED_ORIGINS;

  if (envOrigins) {
    return envOrigins.split(',').map(origin => origin.trim());
  }

  // In production, require explicit ALLOWED_ORIGINS
  if (process.env.NODE_ENV === 'production') {
    console.warn('ALLOWED_ORIGINS not set in production — only the default production origin is allowed');
    return ['https://beatme.creativeplatform.xyz'];
  }

  // Development defaults
  return [
    'https://beatme.creativeplatform.xyz',
    'http://localhost:3000',
    'http://localhost:3001',
  ];
};

export const allowedOrigins = getAllowedOrigins();

/**
 * Check if an origin is allowed
 */
export function isOriginAllowed(origin: string | null): boolean {
  if (!origin) return false;
  return allowedOrigins.includes(origin);
}

/**
 * Get CORS headers for a response
 */
export function getCorsHeaders(origin: string | null): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
  };

  // Only add CORS headers if origin is allowed
  if (origin && isOriginAllowed(origin)) {
    headers['Access-Control-Allow-Origin'] = origin;
    headers['Access-Control-Allow-Methods'] = 'GET, POST, PUT, DELETE, OPTIONS';
    headers['Access-Control-Allow-Headers'] = 'Content-Type, Authorization';
    headers['Access-Control-Max-Age'] = '86400';
    headers['Access-Control-Allow-Credentials'] = 'false';
  }

  // Add HTTPS security header in production
  if (process.env.NODE_ENV === 'production') {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
  }

  return headers;
}

/**
 * Get security-only headers (no CORS)
 */
export function getSecurityHeaders(): Record<string, string> {
  const headers: Record<string, string> = {
    'X-Content-Type-Options': 'nosniff',
    'X-Frame-Options': 'DENY',
    'X-XSS-Protection': '1; mode=block',
  };

  if (process.env.NODE_ENV === 'production') {
    headers['Strict-Transport-Security'] = 'max-age=31536000; includeSubDomains';
  }

  return headers;
}

