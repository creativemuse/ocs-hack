import crypto from 'crypto';

// Minimal HS256 JWT utilities without external deps.

const base64url = (input: Buffer | string): string => {
  const buf = Buffer.isBuffer(input) ? input : Buffer.from(input);
  return buf.toString('base64').replace(/=/g, '').replace(/\+/g, '-').replace(/\//g, '_');
};

const b64uJson = (obj: unknown): string => base64url(Buffer.from(JSON.stringify(obj)));

function getSecret(): Buffer {
  const secret = process.env.ENTRY_TOKEN_SECRET || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'dev-secret';
  return Buffer.from(secret);
}

export type EntryTokenPayload = {
  entryId: string;
  sessionId: string;
  identity: { walletAddress?: string; anonId?: string };
  isTrial: boolean;
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
    if (!h || !p || !s) return null;
    const unsigned = `${h}.${p}`;
    const expected = base64url(crypto.createHmac('sha256', getSecret()).update(unsigned).digest());
    if (expected !== s) return null;
    const payload = JSON.parse(Buffer.from(p, 'base64').toString()) as EntryTokenPayload;
    if (typeof payload.exp !== 'number' || Date.now() / 1000 > payload.exp) return null;
    return payload;
  } catch {
    return null;
  }
}


