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
  error?: string | null
) {
  if (error) {
    return NextResponse.redirect(new URL(`/?auth_error=${encodeURIComponent(error)}`, baseUrl));
  }

  if (!idToken) {
    return NextResponse.redirect(
      new URL('/?auth_error=No+identity+token+received+from+Apple', baseUrl)
    );
  }

  try {
    const parsed = parseAppleIdToken(idToken);
    if (!parsed || (!parsed.email && !parsed.sub)) {
      return NextResponse.redirect(
        new URL('/?auth_error=Failed+to+parse+Apple+identity+token', baseUrl)
      );
    }

    const email = parsed.email || `apple.${parsed.sub.slice(0, 10)}@leavetheroom.app`;
    let name = 'Apple Member';
    const avatar =
      'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80';

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

    return await handleAppleAuth(baseUrl, idToken, userJson, error);
  } catch {
    const searchParams = req.nextUrl.searchParams;
    const idToken = searchParams.get('id_token');
    const userJson = searchParams.get('user');
    const error = searchParams.get('error');

    return await handleAppleAuth(baseUrl, idToken, userJson, error);
  }
}

export async function GET(req: NextRequest) {
  const baseUrl = getAppBaseUrl(req);
  const searchParams = req.nextUrl.searchParams;
  const idToken = searchParams.get('id_token');
  const userJson = searchParams.get('user');
  const error = searchParams.get('error');

  return await handleAppleAuth(baseUrl, idToken, userJson, error);
}
