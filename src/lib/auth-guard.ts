import { NextRequest, NextResponse } from 'next/server';
import { readDb } from '@/lib/db';
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
 * 1. Cookie: `leavetheroom_session` or `seeme_session` (string ID or JSON `{ userId: string }`)
 * 2. Header: `Authorization: Bearer <userId_or_token>`
 * 3. Header: `x-user-id: <userId>` (for development simulation, Postman, and automated tests)
 */
export function extractSessionUserId(req: NextRequest): string | null {
  // 1. Check HTTP cookies (new brand prioritized, falling back to legacy brand)
  const ltrCookieId = parseSessionCookieValue(req.cookies.get('leavetheroom_session')?.value);
  if (ltrCookieId) return ltrCookieId;

  const seemeCookieId = parseSessionCookieValue(req.cookies.get('seeme_session')?.value);
  if (seemeCookieId) return seemeCookieId;

  // 2. Check Authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.toLowerCase().startsWith('bearer ')) {
    const token = authHeader.slice(7).trim();
    if (token && token !== 'null' && token !== 'undefined' && token !== 'signed_out') {
      return token;
    }
  }

  // 3. Check x-user-id header (simulation / dev / test)
  const xUserId = req.headers.get('x-user-id');
  if (xUserId && xUserId.trim()) {
    const trimmed = xUserId.trim();
    if (trimmed !== 'signed_out' && trimmed !== 'null' && trimmed !== 'undefined') {
      return trimmed;
    }
  }

  return null;
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

  const db = await readDb();
  const user = db.personas.find((p) => p.id === userId);

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

  const db = await readDb();
  const user = db.personas.find((p) => p.id === userId);
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
