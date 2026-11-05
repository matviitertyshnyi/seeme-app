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
  if (req) {
    const url = new URL(req.url);
    const host = req.headers.get('x-forwarded-host') || req.headers.get('host') || url.host;
    const proto = req.headers.get('x-forwarded-proto') || url.protocol.replace(':', '') || 'http';
    if (host) {
      return `${proto}://${host}`.replace(/\/+$/, '');
    }
  }
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL.replace(/\/+$/, '');
  }
  return 'http://localhost:3000';
}

const SESSION_SECRET =
  process.env.SESSION_SECRET ||
  process.env.GOOGLE_CLIENT_SECRET ||
  'ltr-signed-session-fallback-secret';

export function signUserSessionToken(persona: UserPersona): string {
  const safeAvatar =
    persona.avatar && !persona.avatar.startsWith('data:') && persona.avatar.length < 1024
      ? persona.avatar
      : undefined;
  const payload = {
    id: persona.id,
    email: persona.email,
    name: persona.name,
    age: persona.age,
    avatar: safeAvatar,
    neighborhood: persona.neighborhood,
    onboarded: persona.onboarded,
    photoVerified: persona.photoVerified,
    authProvider: persona.authProvider,
  };
  const b64 = Buffer.from(JSON.stringify(payload), 'utf8').toString('base64url');
  const crypto = require('crypto') as typeof import('crypto');
  const sig = crypto.createHmac('sha256', SESSION_SECRET).update(b64).digest('base64url');
  return `${b64}.${sig}`;
}

export function verifyUserSessionToken(token?: string): Partial<UserPersona> | null {
  if (!token || !token.includes('.')) return null;
  try {
    const [b64, sig] = token.split('.');
    if (!b64 || !sig) return null;
    const crypto = require('crypto') as typeof import('crypto');
    const expected = crypto.createHmac('sha256', SESSION_SECRET).update(b64).digest('base64url');
    if (sig !== expected) return null;
    return JSON.parse(Buffer.from(b64, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
}

export function setSessionCookies(
  response: NextResponse,
  userId: string,
  persona?: UserPersona
) {
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
  };
  response.cookies.set('ltr_session', userId, cookieOptions);
  response.cookies.set('leavetheroom_session', userId, cookieOptions);
  response.cookies.set('seeme_session', userId, cookieOptions);
  if (persona) {
    response.cookies.set('ltr_user_token', signUserSessionToken(persona), cookieOptions);
  }
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
  if (!clientId || !clientSecret) {
    console.error('[Google OAuth] Missing GOOGLE_CLIENT_ID or GOOGLE_CLIENT_SECRET in environment');
    return null;
  }

  const redirectUri = `${baseUrl}/api/auth/callback/google`;
  console.log('[Google OAuth] Exchanging auth code at redirectUri:', redirectUri);

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
    const errorBody = await tokenRes.text().catch(() => '');
    console.error(`[Google OAuth] Token exchange failed with HTTP ${tokenRes.status}:`, errorBody);
    return null;
  }

  const tokenData = await tokenRes.json();
  const accessToken = tokenData.access_token;
  if (!accessToken) {
    console.error('[Google OAuth] No access_token returned by Google token endpoint');
    return null;
  }

  const userinfoRes = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${accessToken}` },
  });

  if (!userinfoRes.ok) {
    const errorBody = await userinfoRes.text().catch(() => '');
    console.error(`[Google OAuth] Userinfo request failed with HTTP ${userinfoRes.status}:`, errorBody);
    return null;
  }

  const userinfo = await userinfoRes.json();
  if (!userinfo.email) {
    console.error('[Google OAuth] No email found in Google userinfo payload:', userinfo);
    return null;
  }

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
      if (cleanEmail === 'vladtratata10@gmail.com') {
        persona.role = 'ADMIN';
        persona.photoVerified = true;
      }
      if (details.name && !persona.name) {
        persona.name = details.name;
      }
      if (details.avatar && (!persona.avatar || persona.avatar.includes('unsplash'))) {
        persona.avatar = details.avatar;
      }
      return persona;
    }

    const isFounder = cleanEmail === 'vladtratata10@gmail.com';
    const isRealPhoto = Boolean(
      details.avatar &&
      details.avatar.trim() !== '' &&
      !details.avatar.includes('unsplash')
    );

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
      age: 0,
      avatar: defaultAvatar,
      skillBadge: 'New Member',
      tagline: '',
      neighborhood: 'Select your city',
      onboarded: false,
      verified: true,
      verificationStatus: 'VERIFIED',
      photoVerified: false,
      role: isFounder ? 'ADMIN' : 'USER',
      isBanned: false,
      favoriteActivities: ['Coffee', 'Tennis'],
      reliabilityScore: 100,
      meetupsAttended: 0,
      hoursPlayed: 0,
      ratingAvg: 5.0,
      ratingCount: 0,
      streakWeeks: 1,
      bannedUserIds: [],
      regularPartnerIds: [],
      friendIds: [],
      incomingFriendRequestIds: [],
      outgoingFriendRequestIds: [],
      savedLobbyIds: [],
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
