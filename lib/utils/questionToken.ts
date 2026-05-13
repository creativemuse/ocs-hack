import crypto from 'crypto';

/**
 * HMAC-signed question token for server-side answer verification.
 *
 * The token is sent to the client along with each question (without the
 * correct answer). When the player submits an answer, they send the token
 * back to /api/verify-answer which validates the HMAC, checks expiration,
 * and compares the answer server-side.
 */

// 30s window is safe because questions are fetched one at a time.
// If batching is added later, each question's token must be signed individually
// at serve time so iat reflects when the player actually sees the question.
const MAX_ANSWER_TIME_SECONDS = 30;

interface QuestionTokenPayload {
  /** Question identifier */
  qid: string;
  /** Correct answer index */
  ans: number;
  /** Timestamp when question was served (ms since epoch) */
  iat: number;
  /** Time limit for this question (seconds) */
  tl: number;
  /** Difficulty level */
  dif: string;
}

function getSecret(): Buffer {
  const secret = process.env.ENTRY_TOKEN_SECRET;
  if (!secret) {
    throw new Error(
      'ENTRY_TOKEN_SECRET is required. Set it in your .env file.'
    );
  }
  return Buffer.from(secret);
}

function hmacSign(payload: string): string {
  return crypto
    .createHmac('sha256', getSecret())
    .update(payload)
    .digest('base64url');
}

/**
 * Create a signed question token embedding the correct answer.
 * The payload is base64url-encoded (not encrypted) but tamper-proof via HMAC.
 */
export function signQuestionToken(
  questionId: string,
  correctAnswer: number,
  timeLimit: number,
  difficulty: string,
): string {
  const payload: QuestionTokenPayload = {
    qid: questionId,
    ans: correctAnswer,
    iat: Date.now(),
    tl: timeLimit,
    dif: difficulty,
  };
  const payloadStr = Buffer.from(JSON.stringify(payload)).toString('base64url');
  const sig = hmacSign(payloadStr);
  return `${payloadStr}.${sig}`;
}

export interface VerifiedQuestion {
  questionId: string;
  correctAnswer: number;
  issuedAt: number;
  timeLimit: number;
  difficulty: string;
}

/**
 * Verify and decode a question token.
 *
 * Returns null if the token is invalid, tampered, or expired (>30s old).
 */
export function verifyQuestionToken(token: string): VerifiedQuestion | null {
  try {
    const dotIdx = token.lastIndexOf('.');
    if (dotIdx === -1) return null;

    const payloadStr = token.slice(0, dotIdx);
    const sig = token.slice(dotIdx + 1);

    // Verify HMAC
    const expected = hmacSign(payloadStr);
    if (expected !== sig) return null;

    const payload: QuestionTokenPayload = JSON.parse(
      Buffer.from(payloadStr, 'base64url').toString(),
    );

    // Check expiration — reject answers submitted more than 30s after question served
    const elapsedMs = Date.now() - payload.iat;
    if (elapsedMs > MAX_ANSWER_TIME_SECONDS * 1000) return null;
    if (elapsedMs < 0) return null; // clock skew / replay

    return {
      questionId: payload.qid,
      correctAnswer: payload.ans,
      issuedAt: payload.iat,
      timeLimit: payload.tl,
      difficulty: payload.dif,
    };
  } catch {
    return null;
  }
}
