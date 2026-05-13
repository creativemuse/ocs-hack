import crypto from 'crypto';

// Minimal HS256 JWT utilities without external deps.

const base64url = (input: Buffer | string): string => {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
};

const b64uJson = (obj: unknown): string => base64url(Buffer.from(JSON.stringify(obj)));

function getSecret(): Buffer {
  const secret = process.env.ENTRY_TOKEN_SECRET;
  if (!secret) {
    throw new Error(
      'ENTRY_TOKEN_SECRET is required. Generate one with: openssl rand -hex 32'
    );
  }
  return Buffer.from(secret);
}

export type EntryTokenPayload = {
  entryId: string;
  sessionId: string;
  identity: { walletAddress?: string; anonId?: string };
  isTrial: boolean;
  playerType: 'trial' | 'paid';
  paidTxHash?: string; // Transaction hash for paid players
  spacetimeIdentity?: string; // SpacetimeDB identity
  exp: number; // seconds since epoch
};

export function signEntryToken(payload: EntryTokenPayload): string {
  const header = { alg: 'HS256', typ: 'JWT' };
  const unsigned = `${b64uJson(header)}.${b64uJson(payload)}`;
  const sig = crypto
    .createHmac('sha256', getSecret())
    .update(unsigned)
    .digest();
  return `${unsigned}.${base64url(sig)}`;
}

export function verifyEntryToken(token: string): EntryTokenPayload | null {
  try {
    const [h, p, s] = token.split('.');
    if (!h || !p || !s) {
      console.error('JWT token malformed - missing parts');
      return null;
    }
    const unsigned = `${h}.${p}`;
    const expected = base64url(crypto.createHmac('sha256', getSecret()).update(unsigned).digest());
    if (expected !== s) {
      console.error('JWT token signature verification failed');
      return null;
    }
    const payload = JSON.parse(Buffer.from(p, 'base64').toString()) as EntryTokenPayload;
    if (typeof payload.exp !== 'number' || Date.now() / 1000 > payload.exp) {
      console.error('JWT token expired', { exp: payload.exp, now: Date.now() / 1000 });
      return null;
    }
    return payload;
  } catch (error) {
    console.error('JWT token verification error:', error);
    return null;
  }
}

/**
 * Helper function to get player information from JWT token
 */
export function getPlayerInfoFromToken(token: string): {
  isTrial: boolean;
  playerType: 'trial' | 'paid';
  walletAddress?: string;
  anonId?: string;
  sessionId: string;
  entryId: string;
} | null {
  const payload = verifyEntryToken(token);
  if (!payload) return null;

  return {
    isTrial: payload.isTrial,
    playerType: payload.playerType || (payload.isTrial ? 'trial' : 'paid'),
    walletAddress: payload.identity.walletAddress,
    anonId: payload.identity.anonId,
    sessionId: payload.sessionId,
    entryId: payload.entryId,
  };
}

/**
 * Helper function to validate player access based on JWT token
 */
export function validatePlayerAccess(token: string, requiredPlayerType?: 'trial' | 'paid'): {
  isValid: boolean;
  playerInfo: ReturnType<typeof getPlayerInfoFromToken>;
  error?: string;
} {
  const playerInfo = getPlayerInfoFromToken(token);
  
  if (!playerInfo) {
    return {
      isValid: false,
      playerInfo: null,
      error: 'Invalid or expired token'
    };
  }

  if (requiredPlayerType && playerInfo.playerType !== requiredPlayerType) {
    return {
      isValid: false,
      playerInfo,
      error: `Access denied: ${requiredPlayerType} player required, but token is for ${playerInfo.playerType} player`
    };
  }

  return {
    isValid: true,
    playerInfo
  };
}


