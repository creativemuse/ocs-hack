import jwt from 'jsonwebtoken';
import * as crypto from 'crypto';

// CDP API Configuration
interface CDPConfig {
  keyName: string;
  keySecret: string;
  requestMethod: string;
  requestHost: string;
  requestPath: string;
}

// JWT Payload interface
interface JWTPayload {
  iss: string;
  nbf: number;
  exp: number;
  sub: string;
  uri: string;
}

// JWT Header interface
interface JWTHeader {
  alg: string;
  kid: string;
  nonce: string;
}

export class CDPJWTGenerator {
  private config: CDPConfig;
  private algorithm = 'HS256';

  constructor(config: CDPConfig) {
    this.config = config;
  }

  /**
   * Generate a fresh JWT token for CDP API authentication
   * Token expires in 120 seconds (2 minutes)
   */
  generateJWT(): string {
    const { keyName, keySecret, requestMethod, requestHost, requestPath } = this.config;
    
    // Construct the URI
    const uri = `${requestMethod} ${requestHost}${requestPath}`;

    const payload: JWTPayload = {
      iss: 'cdp',
      nbf: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 120, // JWT expires in 120 seconds
      sub: keyName,
      uri,
    };

    const header: JWTHeader = {
      alg: this.algorithm,
      kid: keyName,
      nonce: crypto.randomBytes(16).toString('hex'),
    };

    // Use the key directly for HMAC-SHA256
    return jwt.sign(payload, keySecret, { 
      algorithm: 'HS256' as jwt.Algorithm
    });
  }

  /**
   * Generate JWT and return as environment variable format
   */
  generateJWTExport(): string {
    const token = this.generateJWT();
    return `export JWT=${token}`;
  }

  /**
   * Check if current JWT is expired (with 10 second buffer)
   */
  isJWTExpired(token: string): boolean {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) return true;
      
      const now = Math.floor(Date.now() / 1000);
      return decoded.exp <= (now + 10); // 10 second buffer
    } catch {
      return true;
    }
  }

  /**
   * Get remaining time until JWT expires (in seconds)
   */
  getJWTTimeRemaining(token: string): number {
    try {
      const decoded = jwt.decode(token) as any;
      if (!decoded || !decoded.exp) return 0;
      
      const now = Math.floor(Date.now() / 1000);
      return Math.max(0, decoded.exp - now);
    } catch {
      return 0;
    }
  }
}

// Factory function to create JWT generator from environment variables
export function createCDPJWTGenerator(): CDPJWTGenerator {
  const config: CDPConfig = {
    keyName: process.env.CDP_API_KEY || process.env.KEY_NAME!,
    keySecret: process.env.CDP_API_SECRET || process.env.KEY_SECRET!,
    requestMethod: process.env.REQUEST_METHOD || 'POST',
    requestHost: process.env.REQUEST_HOST || 'api.cdp.coinbase.com',
    requestPath: process.env.REQUEST_PATH || '/platform/v2/data/query/run',
  };

  // Validate required environment variables
  const hasNewVars = process.env.CDP_API_KEY && process.env.CDP_API_SECRET;
  const hasOldVars = process.env.KEY_NAME && process.env.KEY_SECRET;
  
  if (!hasNewVars && !hasOldVars) {
    throw new Error('Missing required CDP API credentials. Set CDP_API_KEY and CDP_API_SECRET in .env.local');
  }

  return new CDPJWTGenerator(config);
}

// Utility function to generate JWT and log export command
export function generateAndLogJWT(): string {
  const generator = createCDPJWTGenerator();
  const token = generator.generateJWT();
  const exportCommand = generator.generateJWTExport();
  
  console.log('Generated JWT for CDP API:');
  console.log(exportCommand);
  console.log(`Token expires in: ${generator.getJWTTimeRemaining(token)} seconds`);
  
  return token;
}
