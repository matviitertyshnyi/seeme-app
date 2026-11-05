import { NextRequest, NextResponse } from 'next/server';
import { withDbMutation } from '@/lib/db';
import { sanitizePersona } from '@/lib/auth-guard';
import { UserPersona } from '@/types/lobby';

export interface OAuthUserDetails {
  email: string;
  name?: string;
  avatar?: string;
}

export function getAppBaseUrl(req?: NextRequest | Request): string {
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '');
  }
  if (req) {
    const url = new URL(req.url);
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || url.host;
    const proto = req.headers.get('x-forwarded-proto') || url.protocol.replace(':', '') || 'http';
    return `${proto}://${host}`;
  }
  return 'http://localhost:3000';
}

export function setSessionCookies(response: NextResponse, userId: string) {
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  };
  response.cookies.set('leavetheroom_session', userId, cookieOptions);
  response.cookies.set('seeme_session', userId, cookieOptions);
}

export function buildGoogleAuthUrl(baseUrl: string, state: string): string {
  const clientId = process.env.GOOGLE_CLIENT_ID || '';
  const redirectUri = `${baseUrl}/api/auth/callback/google`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code',
    scope: 'openid email profile',
    access_type: 'offline',
    prompt: 'select_account',
    state,
  });
  return `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;
}

export async function exchangeGoogleCode(
  code: string,
  baseUrl: string
): Promise<OAuthUserDetails | null> {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) return null;

  const redirectUri = `${baseUrl}/api/auth/callback/google`;
  const tokenRes = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: redirectUri,
      grant_type: 'authorization_code',
    }),
  });

  if (!tokenRes.ok) {
    return null;
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;
  if (!accessToken) return null;

  const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!userinfoRes.ok) return null;
  const userinfo = await userinfoRes.json();

  return {
    email: userinfo.email,
    name: userinfo.name || userinfo.given_name || 'Google Explorer',
    avatar: userinfo.picture,
  };
}

export function buildAppleAuthUrl(baseUrl: string, state: string): string {
  const clientId = process.env.APPLE_CLIENT_ID || '';
  const redirectUri = `${baseUrl}/api/auth/callback/apple`;
  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: redirectUri,
    response_type: 'code id_token',
    response_mode: 'form_post',
    scope: 'name email',
    state,
  });
  return `https://appleid.apple.com/auth/authorize?${params.toString()}`;
}

export function parseAppleIdToken(idToken: string): { email?: string; sub: string } | null {
  try {
    const parts = idToken.split('.');
    if (parts.length < 2) return null;
    const payloadJson = Buffer.from(parts[1], 'base64url').toString('utf8');
    const payload = JSON.parse(payloadJson);
    return {
      email: payload.email,
      sub: payload.sub,
    };
  } catch {
    return null;
  }
}

export async function provisionOrFindOAuthUser(
  provider: 'google' | 'apple',
  details: OAuthUserDetails
): Promise<UserPersona> {
  const cleanEmail = (
    details.email || `${provider}.${crypto.randomUUID().slice(0, 8)}@leavetheroom.app`
  )
    .trim()
    .toLowerCase();

  const mutationResult = await withDbMutation(async (txDb) => {
    let persona = txDb.personas.find((p) => p.email?.toLowerCase() === cleanEmail);

    if (persona) {
      persona.verified = true;
      persona.verificationStatus = 'VERIFIED';
      persona.authProvider = provider;
      if (details.name && !persona.name) {
        persona.name = details.name;
      }
      if (details.avatar && (!persona.avatar || persona.avatar.includes('unsplash'))) {
        persona.avatar = details.avatar;
      }
      return persona;
    }

    const displayName =
      details.name?.trim() || (provider === 'google' ? 'Google Explorer' : 'Apple Explorer');
    const defaultAvatar =
      details.avatar ||
      (provider === 'google'
        ? 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80'
        : 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80');

    const newPersona: UserPersona = {
      id: `user-${provider}-${crypto.randomUUID()}`,
      email: cleanEmail,
      name: displayName,
      age: 26,
      avatar: defaultAvatar,
      skillBadge: 'Verified Member',
      tagline: `Joined via ${provider === 'google' ? 'Google' : 'Apple ID'}. Ready to meet up!`,
      neighborhood: '',
      verified: true,
      verificationStatus: 'VERIFIED',
      role: 'USER',
      isBanned: false,
      favoriteActivities: ['Ping Pong', 'Coffee', 'Chess'],
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
      authProvider: provider,
    };

    txDb.personas.unshift(newPersona);

    txDb.notifications = txDb.notifications || [];
    txDb.notifications.unshift({
      id: `notif-${crypto.randomUUID()}`,
      userId: newPersona.id,
      type: 'SYSTEM',
      title: `${provider === 'google' ? 'Google' : 'Apple ID'} Verified`,
      body: `Welcome, ${newPersona.name}! Your account is verified with a 100% Reliability Score.`,
      read: false,
      createdAt: new Date().toISOString(),
    });

    return newPersona;
  });

  return sanitizePersona(mutationResult);
}
