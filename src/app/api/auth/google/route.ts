import { NextRequest, NextResponse } from 'next/server';
import { getAppBaseUrl, buildGoogleAuthUrl } from '@/lib/oauth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const baseUrl = getAppBaseUrl(req);
  const state = crypto.randomUUID();

  if (!process.env.GOOGLE_CLIENT_ID) {
    return NextResponse.redirect(
      new URL('/?auth_error=Google+Sign-In+is+not+configured.+Missing+GOOGLE_CLIENT_ID.', baseUrl)
    );
  }

  const authUrl = buildGoogleAuthUrl(baseUrl, state);
  const res = NextResponse.redirect(authUrl);
  res.cookies.set('oauth_state_google', state, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 10, // 10 minutes
  });
  return res;
}
