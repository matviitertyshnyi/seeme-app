import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';
import { optionalAuth, errorResponse } from '@/lib/auth-guard';
import { UserPersona } from '@/types/lobby';

export const dynamic = 'force-dynamic';

function setSessionCookie(response: NextResponse, userId: string) {
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

function clearSessionCookie(response: NextResponse) {
  const cookieOptions = {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 0,
  };
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
      user,
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
    const nowIso = new Date().toISOString();

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

      const res = NextResponse.json({
        authenticated: true,
        user: target,
        persona: target,
        success: true,
      });
      setSessionCookie(res, target.id);
      return res;
    }

    // 3. GOOGLE_AUTH & APPLE_AUTH
    if (action === 'GOOGLE_AUTH' || action === 'APPLE_AUTH') {
      const { email, name, avatar } = body as {
        email?: string;
        name?: string;
        avatar?: string;
      };

      const provider = action === 'GOOGLE_AUTH' ? 'google' : 'apple';
      const cleanEmail = (email || `${provider}.user@leavetheroom.app`).trim().toLowerCase();
      let persona = db.personas.find((p) => p.email?.toLowerCase() === cleanEmail);

      if (persona) {
        if (persona.isBanned) {
          return errorResponse(
            persona.banReason || 'This account has been suspended by an administrator',
            403,
            'FORBIDDEN'
          );
        }
      } else {
        // Auto-provision verified persona for OAuth per requirements
        const displayName = name?.trim() || (provider === 'google' ? 'Google Explorer' : 'Apple Explorer');
        const defaultAvatar =
          avatar ||
          (provider === 'google'
            ? 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80'
            : 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=400&q=80');

        persona = {
          id: `user-${provider}-${Date.now()}`,
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

        db.personas.unshift(persona);
        await writeDb(db);
      }

      const res = NextResponse.json({
        authenticated: true,
        user: persona,
        persona,
        success: true,
      });
      setSessionCookie(res, persona.id);
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

      // If user had a password set, verify it
      if (persona.password && password && persona.password !== password) {
        return errorResponse('Incorrect password', 401);
      }

      const res = NextResponse.json({
        authenticated: true,
        user: persona,
        persona,
        success: true,
      });
      setSessionCookie(res, persona.id);
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
