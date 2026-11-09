import { NextRequest, NextResponse } from 'next/server';
import { readDb, withDbMutation } from '@/lib/db';
import { optionalAuth, errorResponse, sanitizePersona } from '@/lib/auth-guard';
import { setSessionCookies } from '@/lib/oauth';
import { UserPersona } from '@/types/lobby';

export const dynamic = 'force-dynamic';

function clearSessionCookie(response: NextResponse) {
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  };
  response.cookies.set('ltr_session', '', cookieOptions);
  response.cookies.set('ltr_user_token', '', cookieOptions);
  response.cookies.set('leavetheroom_session', '', cookieOptions);
  response.cookies.set('seeme_session', '', cookieOptions);
}

export async function GET(req: NextRequest) {
  try {
    const { user } = await optionalAuth(req);
    if (!user) {
      return NextResponse.json({
        authenticated: false,
        user: null,
      });
    }

    return NextResponse.json({
      authenticated: true,
      user: sanitizePersona(user),
    });
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : 'Failed to inspect session',
      500
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action = 'LOGIN' } = body as { action?: string };
    const db = await readDb();

    // 1. LOGOUT
    if (action === 'LOGOUT') {
      const res = NextResponse.json({
        authenticated: false,
        user: null,
        success: true,
      });
      clearSessionCookie(res);
      return res;
    }

    // 2. SWITCH_DEMO_USER
    if (action === 'SWITCH_DEMO_USER') {
      if (process.env.NODE_ENV === 'production') {
        return errorResponse('Demo user switching is disabled in production', 403, 'FORBIDDEN');
      }
      const { userId } = body as { userId: string };
      if (!userId) {
        return errorResponse('User ID is required', 400);
      }

      const target = db.personas.find((p) => p.id === userId);
      if (!target) {
        return errorResponse('Demo persona not found', 404);
      }

      if (target.isBanned) {
        return errorResponse(
          target.banReason || 'This account has been suspended by an administrator',
          403,
          'FORBIDDEN'
        );
      }

      const safeTarget = sanitizePersona(target);
      const res = NextResponse.json({
        authenticated: true,
        user: safeTarget,
        persona: safeTarget,
        success: true,
      });
      setSessionCookies(res, target.id, target);
      return res;
    }

    // 3. GOOGLE_AUTH & APPLE_AUTH
    if (action === 'GOOGLE_AUTH' || action === 'APPLE_AUTH') {
      if (process.env.NODE_ENV === 'production') {
        return errorResponse('Direct OAuth simulation is disabled in production', 403, 'FORBIDDEN');
      }
      const { email, name, avatar } = body as {
        email?: string;
        name?: string;
        avatar?: string;
      };

      const provider = action === 'GOOGLE_AUTH' ? 'google' : 'apple';
      const cleanEmail = (email || `${provider}.user@leavetheroom.app`).trim().toLowerCase();

      // Wrap auto-provisioning inside withDbMutation for concurrency safety
      const mutationResult = await withDbMutation(async (txDb) => {
        const persona = txDb.personas.find((p) => p.email?.toLowerCase() === cleanEmail);

        if (persona) {
          if (persona.isBanned) {
            return {
              error: persona.banReason || 'This account has been suspended by an administrator',
              status: 403,
              code: 'FORBIDDEN',
            };
          }
          return { persona };
        }

        // Auto-provision verified persona for OAuth per requirements
        const displayName = name?.trim() || (provider === 'google' ? 'Google Explorer' : 'Apple Explorer');
        const defaultAvatar =
          avatar ||
          (provider === 'google'
            ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80'
            : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80');

        const newPersona: UserPersona = {
          id: `user-${provider}-${crypto.randomUUID()}`,
          email: cleanEmail,
          name: displayName,
          age: 26,
          avatar: defaultAvatar,
          skillBadge: 'Verified Member',
          tagline: `Joined via ${provider === 'google' ? 'Google' : 'Apple'}. Ready to meet up!`,
          neighborhood: 'Greenwich Village',
          verified: true,
          verificationStatus: 'VERIFIED',
          role: 'USER',
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
        return { persona: newPersona };
      });

      if ('error' in mutationResult && mutationResult.error) {
        return errorResponse(mutationResult.error, mutationResult.status, mutationResult.code);
      }

      const safePersona = sanitizePersona(mutationResult.persona!);
      const res = NextResponse.json({
        authenticated: true,
        user: safePersona,
        persona: safePersona,
        success: true,
      });
      setSessionCookies(res, safePersona.id, mutationResult.persona!);
      return res;
    }

    // 4. LOGIN
    if (action === 'LOGIN') {
      const { emailOrName, password, userId } = body as {
        emailOrName?: string;
        password?: string;
        userId?: string;
      };

      let persona: UserPersona | undefined;
      if (userId) {
        persona = db.personas.find((p) => p.id === userId);
      } else if (emailOrName) {
        const query = emailOrName.trim().toLowerCase();
        persona = db.personas.find(
          (p) =>
            p.email?.toLowerCase() === query ||
            p.name.toLowerCase() === query ||
            p.id.toLowerCase() === query
        );
      }

      if (!persona) {
        return errorResponse('User account not found', 404);
      }

      if (persona.isBanned) {
        return errorResponse(
          persona.banReason || 'This account has been suspended by an administrator',
          403,
          'FORBIDDEN'
        );
      }

      // If user had a password set (or in production), strictly require it and verify
      if (persona.password || process.env.NODE_ENV === 'production') {
        if (!persona.password || !password || persona.password !== password.trim()) {
          return errorResponse('Incorrect password', 401);
        }
      }

      const safePersona = sanitizePersona(persona);
      const res = NextResponse.json({
        authenticated: true,
        user: safePersona,
        persona: safePersona,
        success: true,
      });
      setSessionCookies(res, safePersona.id, persona);
      return res;
    }

    return errorResponse(`Unsupported session action: ${action}`, 400);
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : 'Failed to process session request',
      500
    );
  }
}
