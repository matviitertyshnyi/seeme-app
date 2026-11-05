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

  if (error) {
    console.error('[Google OAuth] Error received from Google callback:', error);
    return NextResponse.redirect(new URL(`/?auth_error=${encodeURIComponent(error)}`, baseUrl));
  }

  if (!code) {
    console.error('[Google OAuth] Callback missing authorization code');
    return NextResponse.redirect(
      new URL('/?auth_error=No+authorization+code+received+from+Google.', baseUrl)
    );
  }

  try {
    const userDetails = await exchangeGoogleCode(code, baseUrl);
    if (!userDetails || !userDetails.email) {
      console.error('[Google OAuth] Token exchange did not yield valid user details');
      return NextResponse.redirect(
        new URL(
          '/?auth_error=Google+authentication+failed.+Unable+to+verify+Google+account+details.',
          baseUrl
        )
      );
    }

    const persona = await provisionOrFindOAuthUser('google', userDetails);
    const redirectUrl = new URL('/?auth=success', baseUrl);
    const res = NextResponse.redirect(redirectUrl);
    setSessionCookies(res, persona.id);
    res.cookies.delete('oauth_state_google');
    return res;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Google OAuth failed';
    console.error('[Google OAuth] Exception during OAuth callback handling:', err);
    return NextResponse.redirect(new URL(`/?auth_error=${encodeURIComponent(errorMsg)}`, baseUrl));
  }
}
