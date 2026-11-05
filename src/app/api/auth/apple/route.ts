import { NextRequest, NextResponse } from 'next/server';
import { getAppBaseUrl, buildAppleAuthUrl } from '@/lib/oauth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const baseUrl = getAppBaseUrl(req);
  const state = crypto.randomUUID();

  // If APPLE_CLIENT_ID is not configured (e.g. local dev before keys are set),
  // gracefully redirect to the callback with mock mode so dev workflow never breaks.
  if (!process.env.APPLE_CLIENT_ID) {
    const mockRedirect = new URL('/api/auth/callback/apple?mock=true', baseUrl);
    return NextResponse.redirect(mockRedirect);
  }

  const authUrl = buildAppleAuthUrl(baseUrl, state);
  const res = NextResponse.redirect(authUrl);
  res.cookies.set('oauth_state_apple', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 10, // 10 minutes
  });
  return res;
}
