import { NextRequest, NextResponse } from 'next/server';
import { isCloudDatabaseConnected, readDb, resetDb, withDbMutation } from '@/lib/db';
import { optionalAuth, requireAuth, errorResponse, AuthError, sanitizePersonas } from '@/lib/auth-guard';
import { getDefaultCoverForCategory, getMapPinLabelForCategory } from '@/lib/geo';
import {
  ActivityCategory,
  AgeRangeOption,
  JoinMode,
  Lobby,
  Participant,
  RoomStatus,
  SkillCompatibility,
  StartTimeOption,
} from '@/types/lobby';

export const dynamic = 'force-dynamic';

function getStartTimeBadge(startTime: StartTimeOption): string {
  switch (startTime) {
    case 'Now':
      return 'Live Now';
    case 'In 30 mins':
      return 'In 30m';
    case 'In 1 hour':
      return 'In 1h';
    case 'Later today':
      return 'Later today';
    default:
      return typeof startTime === 'string' && startTime.trim() ? startTime : 'Live Now';
  }
}

function getRoomStatusFromStartTime(startTime: StartTimeOption): RoomStatus {
  return startTime === 'Now' ? 'LIVE' : 'UPCOMING';
}

export async function GET(req: NextRequest) {
  if (req) await optionalAuth(req);
  const db = await readDb();
  return NextResponse.json({
    personas: sanitizePersonas(db.personas),
    lobbies: db.lobbies,
    ratings: db.ratings || [],
    notifications: db.notifications || [],
    cloudDb: isCloudDatabaseConnected(),
  });
}

export async function POST(req: NextRequest) {
  try {
    const { user: authUser } = await requireAuth(req);

    const body = await req.json();
    const {
      category,
      title,
      equipmentNote,
      venueName,
      venueAddress,
      lat,
      lng,
      startTime,
      skillCompatibility,
      spotClue,
      maxParticipants,
      joinMode,
      coHost,
      coverImage,
    } = body as {
      category: ActivityCategory;
      title: string;
      equipmentNote?: string;
      venueName: string;
      venueAddress?: string;
      lat: number;
      lng: number;
      startTime?: StartTimeOption;
      skillCompatibility?: SkillCompatibility;
      spotClue?: string;
      maxParticipants?: number;
      joinMode?: JoinMode;
      coHost?: Participant | null;
      coverImage?: string;
    };

    if (
      !category ||
      !title ||
      !venueName ||
      typeof lat !== 'number' ||
      typeof lng !== 'number'
    ) {
      return errorResponse('Missing required meetup fields', 400);
    }

    return await withDbMutation(async (db) => {
      const nowIso = new Date().toISOString();
      const lobbyId = `lobby-${crypto.randomUUID()}`;
      const clampedMax = Math.max(2, Math.min(16, Number(maxParticipants) || 4));
      const chosenStart = startTime || 'Now';

      const hostPersona = db.personas.find((p) => p.id === authUser.id) || authUser;

      const initialParticipants: Participant[] = [
        {
          id: authUser.id,
          name: authUser.name,
          age: authUser.age,
          avatar: authUser.avatar,
          skillBadge: authUser.skillBadge || 'Host',
          tagline: authUser.tagline,
          joinedAt: nowIso,
          arrivalStatus: chosenStart === 'Now' ? 'ARRIVED' : 'ON_MY_WAY',
          spotClue: spotClue?.trim() || undefined,
          reliabilityScore: hostPersona?.reliabilityScore ?? 98,
          ratingAvg: hostPersona?.ratingAvg ?? 4.9,
        },
      ];

      if (coHost && coHost.id && coHost.id !== authUser.id && initialParticipants.length < clampedMax) {
        const coHostPersona = db.personas.find((p) => p.id === coHost.id);
        if (coHostPersona) {
          initialParticipants.push({
            id: coHostPersona.id,
            name: coHostPersona.name,
            age: coHostPersona.age,
            avatar: coHostPersona.avatar,
            skillBadge: coHostPersona.skillBadge || 'Co-Host',
            tagline: coHostPersona.tagline,
            joinedAt: nowIso,
            arrivalStatus: 'ON_MY_WAY',
            reliabilityScore: coHostPersona.reliabilityScore ?? 97,
            ratingAvg: coHostPersona.ratingAvg ?? 4.8,
          });
        }
      }

      const newLobby: Lobby = {
        id: lobbyId,
        category,
        mapPinLabel: getMapPinLabelForCategory(category),
        title: title.trim(),
        equipmentNote: (
          equipmentNote || 'All equipment ready. Drop a message in chat when you arrive.'
        ).trim(),
        coverImage: coverImage || getDefaultCoverForCategory(category),
        venueName: venueName.trim(),
        venueAddress: (venueAddress || venueName).trim(),
        lat,
        lng,
        startTime: chosenStart,
        startTimeBadge: getStartTimeBadge(chosenStart),
        roomStatus: getRoomStatusFromStartTime(chosenStart),
        preferredAgeRange: (body as { preferredAgeRange?: AgeRangeOption | string }).preferredAgeRange || 'All Ages (18+)',
        isRecurring: (body as { isRecurring?: boolean }).isRecurring ?? false,
        recurringSchedule: (body as { recurringSchedule?: string }).recurringSchedule || undefined,
        skillCompatibility: skillCompatibility || 'ALL_LEVELS',
        maxParticipants: clampedMax,
        joinMode: joinMode || 'OPEN',
        hostId: authUser.id,
        bannedUserIds: hostPersona?.bannedUserIds ? [...hostPersona.bannedUserIds] : [],
        participants: initialParticipants,
        pendingRequests: [],
        createdAt: nowIso,
      };

      db.lobbies.unshift(newLobby);
      db.messages.push({
        id: `msg-${crypto.randomUUID()}`,
        lobbyId,
        senderId: authUser.id,
        senderName: authUser.name,
        senderAvatar: authUser.avatar,
        text: spotClue?.trim()
          ? `Meetup live at ${newLobby.venueName}. Spot clue: "${spotClue.trim()}".`
          : `Meetup live at ${newLobby.venueName}. Let me know here when you are heading over.`,
        createdAt: nowIso,
        isSystem: true,
      });

      // Notify any users whose Radar Beacon matches this activity
      db.notifications = db.notifications || [];
      db.personas.forEach((persona) => {
        if (
          persona.id !== authUser.id &&
          persona.beacon?.active &&
          persona.beacon.categories.includes(category)
        ) {
          db.notifications!.unshift({
            id: `notif-${crypto.randomUUID()}-${persona.id}`,
            userId: persona.id,
            type: 'BEACON_MATCH',
            title: `Radar Beacon Match · ${category}`,
            body: `${authUser.name} just started "${newLobby.title}" at ${newLobby.venueName}.`,
            lobbyId,
            read: false,
            createdAt: nowIso,
          });
        }
      });

      return NextResponse.json(
        {
          success: true,
          data: {
            lobby: newLobby,
            notifications: db.notifications,
          },
          lobby: newLobby,
          notifications: db.notifications,
          cloudDb: isCloudDatabaseConnected(),
        },
        { status: 201 }
      );
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return errorResponse(err.message, err.status, err.code);
    }
    return errorResponse(
      err instanceof Error ? err.message : 'Failed to create meetup',
      500
    );
  }
}

export async function PUT(req: NextRequest) {
  try {
    // 1. Production safeguard
    if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DB_RESET !== 'true') {
      return errorResponse('Database reset is disabled in production', 403, 'FORBIDDEN');
    }

    // 2. Authentication & Admin role guard
    const { user: authUser } = await requireAuth(req);
    const effectiveRole = authUser.role || (authUser.id === 'user-maya' ? 'ADMIN' : 'USER');
    if (effectiveRole !== 'ADMIN') {
      return errorResponse('Admin privileges required to reset database', 403, 'FORBIDDEN');
    }

    const db = await resetDb();
    return NextResponse.json({
      personas: sanitizePersonas(db.personas),
      lobbies: db.lobbies,
      ratings: db.ratings || [],
      notifications: db.notifications || [],
      cloudDb: isCloudDatabaseConnected(),
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return errorResponse(err.message, err.status, err.code);
    }
    return errorResponse(
      err instanceof Error ? err.message : 'Failed to reset database',
      500
    );
  }
}
