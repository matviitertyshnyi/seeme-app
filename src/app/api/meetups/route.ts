import { NextRequest, NextResponse } from 'next/server';
import { isCloudDatabaseConnected, readDb, withDbMutation } from '@/lib/db';
import { requireAuth, errorResponse, successResponse, AuthError } from '@/lib/auth-guard';
import { CreateMeetupInputSchema, validatePayload } from '@/lib/types';
import {
  attachAndSortByDistance,
  getDefaultCoverForCategory,
  getMapPinLabelForCategory,
} from '@/lib/geo';
import {
  ActivityCategory,
  Lobby,
  Participant,
  RoomStatus,
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
      return 'Live Now';
  }
}

function getRoomStatusFromStartTime(startTime: StartTimeOption): RoomStatus {
  return startTime === 'Now' ? 'LIVE' : 'UPCOMING';
}

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const userId = searchParams.get('userId');
    const legacy = searchParams.get('legacy') === 'true';

    // Parse coordinates
    const latParam = searchParams.get('lat') ?? searchParams.get('userLat');
    const lngParam = searchParams.get('lng') ?? searchParams.get('userLng');
    const radiusParam = searchParams.get('radius') ?? searchParams.get('radiusKm');

    let userLat: number | null = null;
    let userLng: number | null = null;
    let radiusKm: number | null = null;

    if (latParam !== null || lngParam !== null) {
      if (latParam === null || lngParam === null) {
        return errorResponse('Both latitude and longitude must be provided', 400);
      }
      userLat = Number(latParam);
      userLng = Number(lngParam);
      if (isNaN(userLat) || isNaN(userLng) || userLat < -90 || userLat > 90 || userLng < -180 || userLng > 180) {
        return errorResponse('Invalid latitude (-90 to 90) or longitude (-180 to 180)', 400);
      }
    }

    if (radiusParam !== null) {
      radiusKm = Number(radiusParam);
      if (isNaN(radiusKm) || radiusKm <= 0) {
        return errorResponse('Invalid radius: must be a positive number', 400);
      }
    }

    const db = await readDb();
    let meetups = [...db.lobbies];

    // Filter by Category
    if (category && category !== 'All' && category !== 'all') {
      meetups = meetups.filter(
        (m) => m.category.toLowerCase() === category.toLowerCase()
      );
    }

    // Filter by Status
    if (status && status !== 'all') {
      const allowedStatuses = status.toLowerCase().split(',');
      meetups = meetups.filter((m) => {
        const roomStat = (m.roomStatus || (m.startTime === 'Now' ? 'LIVE' : 'UPCOMING')).toLowerCase();
        return allowedStatuses.includes(roomStat);
      });
    }

    // Filter by Search text
    if (search && search.trim()) {
      const q = search.toLowerCase().trim();
      meetups = meetups.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.venueName.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q) ||
          (m.equipmentNote && m.equipmentNote.toLowerCase().includes(q))
      );
    }

    // Filter by User (My Meetups: hosting or joined)
    if (userId) {
      meetups = meetups.filter(
        (m) => m.hostId === userId || m.participants.some((p) => p.id === userId)
      );
    }

    // Proximity calculation and sorting if coordinates provided
    let sortedMeetups: any[] = meetups;
    if (userLat !== null && userLng !== null) {
      sortedMeetups = attachAndSortByDistance(meetups, userLat, userLng);
      if (radiusKm !== null) {
        sortedMeetups = sortedMeetups.filter((m) => m.distanceKm <= radiusKm!);
      }
    }

    // Legacy response envelope support
    if (legacy) {
      return NextResponse.json({
        personas: db.personas,
        lobbies: sortedMeetups,
        ratings: db.ratings || [],
        notifications: db.notifications || [],
        cloudDb: isCloudDatabaseConnected(),
      });
    }

    return successResponse({
      data: {
        meetups: sortedMeetups,
      },
      meta: {
        total: sortedMeetups.length,
        page: 1,
        limit: 50,
      },
    });
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : 'Failed to retrieve meetups',
      500
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    // 1. Authenticate session
    const { user: authUser } = await requireAuth(req);

    // 2. Validate payload
    const rawBody = await req.json();
    const validation = validatePayload(CreateMeetupInputSchema, rawBody);
    if ('error' in validation) {
      return errorResponse(validation.error!, 400);
    }
    const body = validation.data!;

    return await withDbMutation(async (db) => {
      const nowIso = new Date().toISOString();
      const meetupId = `lobby-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const clampedMax = Math.max(2, Math.min(16, Number(body.maxParticipants) || 4));
      const chosenStart = body.startTime || 'Now';

      const hostPersona = db.personas.find((p) => p.id === authUser.id) || authUser;

      // 3. Construct host participant record
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
          spotClue: body.spotClue?.trim() || undefined,
          reliabilityScore: hostPersona.reliabilityScore ?? 98,
          ratingAvg: hostPersona.ratingAvg ?? 4.9,
        },
      ];

      // Optional Co-Host (isolated in settings, strictly optional per R3)
      const effectiveCoHostId = body.coHostId || body.coHost?.id;
      if (
        effectiveCoHostId &&
        effectiveCoHostId !== authUser.id &&
        initialParticipants.length < clampedMax
      ) {
        const coHostPersona = db.personas.find((p) => p.id === effectiveCoHostId);
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

      const newMeetup: Lobby = {
        id: meetupId,
        category: body.category,
        mapPinLabel: getMapPinLabelForCategory(body.category),
        title: body.title.trim(),
        equipmentNote: (
          body.equipmentNote || 'All equipment ready. Drop a message in chat when you arrive.'
        ).trim(),
        coverImage: body.coverImage || getDefaultCoverForCategory(body.category),
        venueName: body.venueName.trim(),
        venueAddress: (body.venueAddress || body.venueName).trim(),
        lat: body.lat,
        lng: body.lng,
        startTime: chosenStart,
        startTimeBadge: getStartTimeBadge(chosenStart),
        roomStatus: getRoomStatusFromStartTime(chosenStart),
        skillCompatibility: body.skillCompatibility || 'ALL_LEVELS',
        maxParticipants: clampedMax,
        joinMode: body.joinMode || 'OPEN',
        preferredAgeRange: body.preferredAgeRange || 'All Ages (18+)',
        isRecurring: body.isRecurring ?? false,
        recurringSchedule: body.recurringSchedule || undefined,
        hostId: authUser.id,
        bannedUserIds: hostPersona.bannedUserIds ? [...hostPersona.bannedUserIds] : [],
        participants: initialParticipants,
        pendingRequests: [],
        createdAt: nowIso,
      };

      db.lobbies.unshift(newMeetup);
      db.messages.push({
        id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
        lobbyId: meetupId,
        senderId: authUser.id,
        senderName: authUser.name,
        senderAvatar: authUser.avatar,
        text: body.spotClue?.trim()
          ? `Meetup live at ${newMeetup.venueName}. Spot clue: "${body.spotClue.trim()}".`
          : `Meetup live at ${newMeetup.venueName}. Let me know here when you are heading over.`,
        createdAt: nowIso,
        isSystem: true,
      });

      // Notify any users whose Radar Beacon matches this activity
      db.notifications = db.notifications || [];
      db.personas.forEach((persona) => {
        if (
          persona.id !== authUser.id &&
          persona.beacon?.active &&
          persona.beacon.categories.some((cat) => cat.toLowerCase() === body.category.toLowerCase())
        ) {
          db.notifications!.unshift({
            id: `notif-${Date.now()}-${persona.id}`,
            userId: persona.id,
            type: 'BEACON_MATCH',
            title: `Radar Beacon Match · ${body.category}`,
            body: `${authUser.name} just started "${newMeetup.title}" at ${newMeetup.venueName}.`,
            lobbyId: meetupId,
            read: false,
            createdAt: nowIso,
          });
        }
      });

      return NextResponse.json(
        {
          success: true,
          data: {
            meetup: newMeetup,
            notifications: db.notifications,
          },
          lobby: newMeetup,
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
