import { NextRequest, NextResponse } from 'next/server';
import { readDb, withDbMutation } from '@/lib/db';
import { requireAuth, optionalAuth, errorResponse, AuthError, sanitizePersona } from '@/lib/auth-guard';
import { UpdateProfileInputSchema, validatePayload } from '@/lib/types';
import { UserPersona } from '@/types/lobby';

export const dynamic = 'force-dynamic';

function sanitizePublicProfile(user: UserPersona): Partial<UserPersona> {
  const { email, password, bannedUserIds, settings, ...publicProfile } = user;
  return {
    ...publicProfile,
    settings: settings
      ? {
          profileVisible: settings.profileVisible,
          showReliabilityScore: settings.showReliabilityScore,
          distanceUnit: settings.distanceUnit,
          iosAndroidPush: false,
          soundEffects: false,
          hapticFeedback: false,
        }
      : undefined,
  };
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const requestedUserId = searchParams.get('userId');

    const db = await readDb();

    if (!requestedUserId) {
      // If no userId query param, return active session user's full profile
      const { user } = await requireAuth(req);
      const freshUser = db.personas.find((p) => p.id === user.id) || user;
      const safeFreshUser = sanitizePersona(freshUser);
      return NextResponse.json({
        success: true,
        data: {
          user: safeFreshUser,
        },
        user: safeFreshUser,
      });
    }

    const targetUser = db.personas.find((p) => p.id === requestedUserId);
    if (!targetUser) {
      return errorResponse('User not found', 404);
    }

    // Check caller session for privacy sanitization
    const { user: sessionUser } = await optionalAuth(req);
    const isSelf = sessionUser?.id === targetUser.id;
    const isAdmin = sessionUser?.role === 'ADMIN';

    if (isSelf || isAdmin) {
      const safeTargetUser = sanitizePersona(targetUser);
      return NextResponse.json({
        success: true,
        data: {
          user: safeTargetUser,
        },
        user: safeTargetUser,
      });
    }

    const sanitized = sanitizePublicProfile(targetUser);
    return NextResponse.json({
      success: true,
      data: {
        user: sanitized,
      },
      user: sanitized,
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return errorResponse(err.message, err.status, err.code);
    }
    return errorResponse(
      err instanceof Error ? err.message : 'Failed to retrieve profile',
      500
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    const { user: authUser } = await requireAuth(req);

    const body = await req.json();
    const validation = validatePayload(UpdateProfileInputSchema, body);
    if ('error' in validation) {
      return errorResponse(validation.error!, 400);
    }
    const updates = validation.data!;

    const targetId = updates.userId || authUser.id;
    const isSelf = authUser.id === targetId;
    const isAdmin = authUser.role === 'ADMIN';

    if (!isSelf && !isAdmin) {
      return errorResponse('You do not have permission to edit this profile', 403, 'FORBIDDEN');
    }

    return await withDbMutation(async (db) => {
      const index = db.personas.findIndex((p) => p.id === targetId);
      if (index === -1) {
        return errorResponse('User not found', 404);
      }

      const current = db.personas[index];
      if (updates.name) current.name = updates.name;
      if (updates.age) current.age = updates.age;
      if (updates.avatar) current.avatar = updates.avatar;
      if (updates.skillBadge) current.skillBadge = updates.skillBadge;
      if (updates.tagline !== undefined) current.tagline = updates.tagline;
      if (updates.neighborhood) current.neighborhood = updates.neighborhood;
      if (updates.favoriteActivities) current.favoriteActivities = updates.favoriteActivities;
      if (updates.beacon) current.beacon = updates.beacon;
      if (updates.settings) {
        current.settings = {
          ...current.settings,
          ...updates.settings,
        };
      }
      (current as any).updatedAt = new Date().toISOString();

      // Synchronize participant snapshots across active meetups
      db.lobbies.forEach((lobby) => {
        lobby.participants.forEach((part) => {
          if (part.id === targetId) {
            if (updates.name) part.name = updates.name;
            if (updates.avatar) part.avatar = updates.avatar;
            if (updates.age) part.age = updates.age;
            if (updates.skillBadge) part.skillBadge = updates.skillBadge;
            if (updates.tagline !== undefined) part.tagline = updates.tagline;
          }
        });
      });

      const safeUser = sanitizePersona(current);
      return NextResponse.json({
        success: true,
        data: {
          user: safeUser,
        },
        user: safeUser,
      });
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return errorResponse(err.message, err.status, err.code);
    }
    return errorResponse(
      err instanceof Error ? err.message : 'Failed to update profile',
      500
    );
  }
}
