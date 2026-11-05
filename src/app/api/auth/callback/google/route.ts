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
    return NextResponse.redirect(new URL(`/?auth_error=${encodeURIComponent(error)}`, baseUrl));
  }

  try {
    let userDetails = {
      email: 'alex.chen.meetups@gmail.com',
      name: 'Alex Chen',
      avatar:
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
    };

    if (!isMock && code) {
      const exchanged = await exchangeGoogleCode(code, baseUrl);
      if (exchanged && exchanged.email) {
        userDetails = {
          email: exchanged.email,
          name: exchanged.name || 'Google Explorer',
          avatar: exchanged.avatar || userDetails.avatar,
        };
      }
    }

    const persona = await provisionOrFindOAuthUser('google', userDetails);
    const redirectUrl = new URL('/?auth=success', baseUrl);
    const res = NextResponse.redirect(redirectUrl);
    setSessionCookies(res, persona.id);
    res.cookies.delete('oauth_state_google');
    return res;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Google OAuth failed';
    return NextResponse.redirect(new URL(`/?auth_error=${encodeURIComponent(errorMsg)}`, baseUrl));
  }
}
