import { NextRequest, NextResponse } from 'next/server';
import {
  getAppBaseUrl,
  exchangeGoogleCode,
  provisionOrFindOAuthUser,
  setSessionCookies,
} from '@/lib/oauth';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const baseUrl = getAppBaseUrl(req);
  const searchParams = req.nextUrl.searchParams;
  const code = searchParams.get('code');
  const error = searchParams.get('error');
  const isMock = searchParams.get('mock') === 'true';

  if (error) {
    console.error('[Google OAuth] Error received from Google callback:', error);
    return NextResponse.redirect(new URL(`/?auth_error=${encodeURIComponent(error)}`, baseUrl));
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const hasCredentials = Boolean(
    process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET
  );

  // Production lockdown: strictly require genuine credentials and code
  if (isProduction && (!hasCredentials || !code)) {
    console.error('[Google OAuth] Missing OAuth credentials or authorization code in production');
    return NextResponse.redirect(new URL('/?oauth_error=missing_credentials', baseUrl));
  }

  const expectedState = req.cookies.get('oauth_state_google')?.value;
  const state = searchParams.get('state');
  if (isProduction && expectedState && state !== expectedState) {
    console.error('[Google OAuth] OAuth state mismatch');
    return NextResponse.redirect(new URL('/?auth_error=Invalid+OAuth+state', baseUrl));
  }

  try {
    let userDetails = null;

    if (!isMock && code && hasCredentials) {
      userDetails = await exchangeGoogleCode(code, baseUrl);
    }

    // In production, token exchange must succeed with valid email
    if (isProduction) {
      if (!userDetails || !userDetails.email) {
        console.error('[Google OAuth] Token exchange did not yield valid user details');
        return NextResponse.redirect(
          new URL(
            '/?auth_error=Google+authentication+failed.+Unable+to+verify+Google+account+details.',
            baseUrl
          )
        );
      }
    } else {
      // Non-production fallback (local dev, mock tests, automated CI)
      if (!userDetails || !userDetails.email) {
        userDetails = {
          email: 'alex.chen.meetups@gmail.com',
          name: 'Alex Chen',
          avatar:
            'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        };
      }
    }

    const persona = await provisionOrFindOAuthUser('google', userDetails);
    const redirectUrl = new URL('/?auth=success', baseUrl);
    const res = NextResponse.redirect(redirectUrl);
    setSessionCookies(res, persona.id, persona as any);
    res.cookies.delete('oauth_state_google');
    return res;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Google OAuth failed';
    console.error('[Google OAuth] Exception during OAuth callback handling:', err);
    return NextResponse.redirect(new URL(`/?auth_error=${encodeURIComponent(errorMsg)}`, baseUrl));
  }
}
