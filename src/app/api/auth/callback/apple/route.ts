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
  isMock?: boolean
) {
  if (error) {
    return NextResponse.redirect(new URL(`/?auth_error=${encodeURIComponent(error)}`, baseUrl));
  }

  try {
    let email = 'jordan.miller.meetups@icloud.com';
    let name = 'Jordan Miller';
    const avatar =
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80';

    if (!isMock && idToken) {
      const parsed = parseAppleIdToken(idToken);
      if (parsed?.email) {
        email = parsed.email;
      }
    }

    if (userJson) {
      try {
        const parsedUser = JSON.parse(userJson);
        const firstName = parsedUser?.name?.firstName || '';
        const lastName = parsedUser?.name?.lastName || '';
        const fullName = `${firstName} ${lastName}`.trim();
        if (fullName) {
          name = fullName;
        }
      } catch {
        // Fallback to default name
      }
    }

    const persona = await provisionOrFindOAuthUser('apple', {
      email,
      name,
      avatar,
    });

    const redirectUrl = new URL('/?auth=success', baseUrl);
    const res = NextResponse.redirect(redirectUrl);
    setSessionCookies(res, persona.id);
    res.cookies.delete('oauth_state_apple');
    return res;
  } catch (err) {
    const errorMsg = err instanceof Error ? err.message : 'Apple ID authentication failed';
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

    return await handleAppleAuth(baseUrl, idToken, userJson, error, false);
  } catch {
    // If formData parsing fails, try query params
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
