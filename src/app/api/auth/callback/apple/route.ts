import { NextRequest, NextResponse } from 'next/server';
import {
  getAppBaseUrl,
  parseAppleIdToken,
  provisionOrFindOAuthUser,
  setSessionCookies,
} from '@/lib/oauth';

export const dynamic = 'force-dynamic';

async function handleAppleAuth(
  baseUrl: string,
  idToken?: string | null,
  userJson?: string | null,
  error?: string | null,
  isMock: boolean = false
) {
  if (error) {
    console.error('[Apple OAuth] Error received from Apple callback:', error);
    return NextResponse.redirect(new URL(`/?auth_error=${encodeURIComponent(error)}`, baseUrl));
  }

  const isProduction = process.env.NODE_ENV === 'production';
  const hasCredentials = Boolean(process.env.APPLE_CLIENT_ID);

  // Production lockdown: strictly require genuine credentials and identity token
  if (isProduction && (!hasCredentials || !idToken)) {
    console.error('[Apple OAuth] Missing OAuth credentials or identity token in production');
    return NextResponse.redirect(new URL('/?oauth_error=missing_credentials', baseUrl));
  }

  try {
    let email: string | null = null;
    let name = 'Apple Member';
    const avatar =
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80';

    if (!isMock && idToken) {
      const parsed = parseAppleIdToken(idToken);
      if (parsed) {
        if (parsed.email) {
          email = parsed.email;
        } else if (parsed.sub) {
          email = `apple.${parsed.sub.slice(0, 10)}@leavetheroom.app`;
        }
      }
    }

    if (isProduction) {
      if (!email) {
        console.error('[Apple OAuth] Failed to parse valid email or sub from Apple identity token');
        return NextResponse.redirect(
          new URL('/?auth_error=Failed+to+parse+Apple+identity+token', baseUrl)
        );
      }
    } else {
      // Non-production fallback (local dev, mock tests, automated CI)
      if (!email) {
        email = 'jordan.miller.meetups@icloud.com';
        name = 'Jordan Miller';
      }
    }

    if (userJson) {
      try {
        const parsedUser = typeof userJson === 'string' ? JSON.parse(userJson) : userJson;
        const firstName = parsedUser?.name?.firstName || '';
        const lastName = parsedUser?.name?.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim();
        if (fullName) {
          name = fullName;
        }
      } catch {
        // Keep current name fallback
      }
    }

    const persona = await provisionOrFindOAuthUser('apple', {
      email,
      name,
      avatar,
    });

    const redirectUrl = new URL('/?auth=success', baseUrl);
    const res = NextResponse.redirect(redirectUrl);
    setSessionCookies(res, persona.id, persona as any);
    res.cookies.delete('oauth_state_apple');
    return res;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Apple ID authentication failed';
    console.error('[Apple OAuth] Exception during Apple auth handling:', err);
    return NextResponse.redirect(new URL(`/?auth_error=${encodeURIComponent(errorMsg)}`, baseUrl));
  }
}

export async function POST(req: NextRequest) {
  const baseUrl = getAppBaseUrl(req);
  try {
    const formData = await req.formData();
    const idToken = formData.get('id_token') as string | null;
    const userJson = formData.get('user') as string | null;
    const error = formData.get('error') as string | null;
    const isMock = req.nextUrl.searchParams.get('mock') === 'true';

    return await handleAppleAuth(baseUrl, idToken, userJson, error, isMock);
  } catch {
    const searchParams = req.nextUrl.searchParams;
    const idToken = searchParams.get('id_token');
    const userJson = searchParams.get('user');
    const error = searchParams.get('error');
    const isMock = searchParams.get('mock') === 'true';

    return await handleAppleAuth(baseUrl, idToken, userJson, error, isMock);
  }
}

export async function GET(req: NextRequest) {
  const baseUrl = getAppBaseUrl(req);
  const searchParams = req.nextUrl.searchParams;
  const idToken = searchParams.get('id_token');
  const userJson = searchParams.get('user');
  const error = searchParams.get('error');
  const isMock = searchParams.get('mock') === 'true';

  return await handleAppleAuth(baseUrl, idToken, userJson, error, isMock);
}
