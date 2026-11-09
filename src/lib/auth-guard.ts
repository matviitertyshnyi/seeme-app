import { NextRequest, NextResponse } from 'next/server';
import { readDb, withDbMutation } from '@/lib/db';
import { verifyUserSessionToken } from '@/lib/oauth';
import { UserPersona } from '@/types/lobby';

/**
 * Standard Auth Error class holding HTTP status code and standardized error code
 */
export class AuthError extends Error {
  status: number;
  code: string;
  details?: unknown;

  constructor(
    message: string,
    status: number = 401,
    code: string = 'UNAUTHORIZED',
    details?: unknown
  ) {
    super(message);
    this.name = 'AuthError';
    this.status = status;
    this.code = code;
    this.details = details;
  }
}

/**
 * Strips sensitive fields (such as plaintext password) from a UserPersona before returning it in API responses.
 */
export function sanitizePersona<T extends UserPersona>(persona: T): Omit<T, 'password'> {
  if (!persona || typeof persona !== 'object') {
    return persona as Omit<T, 'password'>;
  }
  const { password: _password, ...safePersona } = persona;
  return safePersona;
}

/**
 * Strips sensitive fields from an array of UserPersonas.
 */
export function sanitizePersonas<T extends UserPersona>(personas: T[]): Omit<T, 'password'>[] {
  if (!Array.isArray(personas)) {
    return [];
  }
  return personas.map(sanitizePersona);
}

function parseSessionCookieValue(rawValue?: string): string | null {
  if (!rawValue) return null;
  const trimmed = rawValue.trim();
  if (!trimmed || trimmed === 'signed_out' || trimmed === 'null' || trimmed === 'undefined') {
    return null;
  }
  if (trimmed.startsWith('{')) {
    try {
      const parsed = JSON.parse(trimmed);
      if (parsed.userId && typeof parsed.userId === 'string') {
        const parsedId = parsed.userId.trim();
        return parsedId && parsedId !== 'signed_out' ? parsedId : null;
      }
    } catch {
      // Not valid JSON, continue to raw string check
    }
  }
  return trimmed;
}

/**
 * Extract authenticated user ID from request headers or cookies.
 * Priority:
 * 1. Cookie: `ltr_session`, `leavetheroom_session`, or `seeme_session` (string ID or JSON `{ userId: string }`)
 * 2. Header: `Authorization: Bearer <userId_or_token>`
 * 3. Header: `x-user-id: <userId>` (gated strictly to non-production dev/test environments)
 */
export function extractSessionUserId(req: NextRequest): string | null {
  // 1. Verify HMAC-signed session token cookie (`ltr_user_token`) first
  const signedCookieToken = req.cookies.get('ltr_user_token')?.value;
  if (signedCookieToken) {
    const verified = verifyUserSessionToken(signedCookieToken);
    if (verified?.id && verified.id !== 'signed_out') {
      return verified.id;
    }
    if (process.env.NODE_ENV === 'production') {
      return null;
    }
  }

  // 2. Check Authorization Bearer header (supports signed token in prod, or userId in dev/test)
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token && token !== 'null' && token !== 'undefined' && token !== 'signed_out') {
      if (token.includes('.')) {
        const verified = verifyUserSessionToken(token);
        if (verified?.id) return verified.id;
        if (process.env.NODE_ENV === 'production') return null;
      } else if (process.env.NODE_ENV !== 'production') {
        return token;
      }
    }
  }

  // 3. Non-production fallback cookies and headers (local dev and E2E test harness)
  if (process.env.NODE_ENV !== 'production') {
    const ltrCookieId = parseSessionCookieValue(
      req.cookies.get('ltr_session')?.value || req.cookies.get('leavetheroom_session')?.value
    );
    if (ltrCookieId) return ltrCookieId;

    const seemeCookieId = parseSessionCookieValue(req.cookies.get('seeme_session')?.value);
    if (seemeCookieId) return seemeCookieId;

    const xUserId = req.headers.get('x-user-id');
    if (xUserId && xUserId.trim()) {
      const trimmed = xUserId.trim();
      if (trimmed !== 'signed_out' && trimmed !== 'null' && trimmed !== 'undefined') {
        return trimmed;
      }
    }
  }

  return null;
}

async function findOrRehydrateUser(req: NextRequest, userId: string): Promise<UserPersona | undefined> {
  const db = await readDb();
  let user = db.personas.find((p) => p.id === userId);
  if (user) return user;

  // Serverless cold-start resilience: re-hydrate from signed ltr_user_token if available
  const signedToken = req.cookies.get('ltr_user_token')?.value;
  const verified = verifyUserSessionToken(signedToken);
  if (verified && verified.id === userId && verified.email) {
    user = await withDbMutation(async (txDb) => {
      const existing = txDb.personas.find((p) => p.id === userId || p.email === verified.email);
      if (existing) return existing;
      const rehydrated: UserPersona = {
        id: verified.id!,
        email: verified.email!,
        name: verified.name || 'Member',
        age: verified.age || 26,
        avatar:
          verified.avatar ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        skillBadge: 'Verified Member',
        tagline: 'Verified Member. Ready to meet up!',
        neighborhood: verified.neighborhood || 'Select your city',
        onboarded: verified.onboarded ?? false,
        verified: true,
        verificationStatus: 'VERIFIED',
        role: 'USER',
        isBanned: false,
        favoriteActivities: ['Coffee', 'Tennis'],
        reliabilityScore: 100,
        meetupsAttended: 0,
        hoursPlayed: 0,
        ratingAvg: 5.0,
        ratingCount: 0,
        streakWeeks: 1,
        bannedUserIds: [],
        regularPartnerIds: [],
        settings: {
          iosAndroidPush: true,
          soundEffects: true,
          hapticFeedback: true,
          distanceUnit: 'km',
          profileVisible: true,
          showReliabilityScore: true,
        },
        authProvider: verified.authProvider || 'google',
      };
      txDb.personas.unshift(rehydrated);
      return rehydrated;
    });
  }
  return user;
}

/**
 * Resolves the authenticated UserPersona from the request.
 * Throws AuthError(401) if not logged in or account not found.
 * Throws AuthError(403) if account is suspended/banned.
 */
export async function requireAuth(req: NextRequest): Promise<{ user: UserPersona }> {
  const userId = extractSessionUserId(req);
  if (!userId) {
    throw new AuthError('Authentication required', 401, 'UNAUTHORIZED');
  }

  const user = await findOrRehydrateUser(req, userId);

  if (!user) {
    throw new AuthError('User account not found', 401, 'UNAUTHORIZED');
  }

  if (user.isBanned) {
    throw new AuthError(
      user.banReason || 'This account has been suspended by an administrator',
      403,
      'FORBIDDEN'
    );
  }

  return { user };
}

/**
 * Resolves authenticated user, or returns null if not authenticated or banned.
 */
export async function authenticateRequest(
  req: NextRequest
): Promise<{ user: UserPersona } | null> {
  try {
    const { user } = await requireAuth(req);
    return { user };
  } catch {
    return null;
  }
}

/**
 * Optional authentication helper: returns user if present, or null if guest
 */
export async function optionalAuth(req: NextRequest): Promise<{ user: UserPersona | null }> {
  const userId = extractSessionUserId(req);
  if (!userId) {
    return { user: null };
  }

  const user = await findOrRehydrateUser(req, userId);
  if (!user || user.isBanned) {
    return { user: null };
  }

  return { user };
}

/**
 * Standardized JSON error response helper.
 * Dual compatibility:
 * - root `error: message` string for client backward compatibility
 * - structured `errorDetail: { code, message, details }` for API contracts
 */
export function errorResponse(
  message: string,
  status: number = 400,
  code?: string,
  details?: unknown
): NextResponse {
  const defaultCode =
    code ||
    (status === 401
      ? 'UNAUTHORIZED'
      : status === 403
      ? 'FORBIDDEN'
      : status === 404
      ? 'NOT_FOUND'
      : status === 409
      ? 'CONFLICT'
      : status >= 500
      ? 'SERVER_ERROR'
      : 'BAD_REQUEST');

  return NextResponse.json(
    {
      error: message,
      success: false,
      errorDetail: {
        code: defaultCode,
        message,
        details,
      },
    },
    { status }
  );
}

/**
 * Standardized JSON success response helper.
 */
export function successResponse<T extends Record<string, unknown>>(
  data: T,
  status: number = 200
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      ...data,
    },
    { status }
  );
}
