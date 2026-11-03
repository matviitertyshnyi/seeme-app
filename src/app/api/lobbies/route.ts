import { NextRequest, NextResponse } from 'next/server';
import { isCloudDatabaseConnected, readDb, resetDb, writeDb, withDbMutation } from '@/lib/db';
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
      return 'Live Now';
  }
}

function getRoomStatusFromStartTime(startTime: StartTimeOption): RoomStatus {
  return startTime === 'Now' ? 'LIVE' : 'UPCOMING';
}

export async function GET(_req: NextRequest) {
  const db = await readDb();
  return NextResponse.json({
    personas: db.personas,
    lobbies: db.lobbies,
    ratings: db.ratings || [],
    notifications: db.notifications || [],
    cloudDb: isCloudDatabaseConnected(),
  });
}

export async function POST(req: NextRequest) {
  try {
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
      host,
      coHost,
      coverImage,
    } = body as {
      category: ActivityCategory;
      title: string;
      equipmentNote: string;
      venueName: string;
      venueAddress?: string;
      lat: number;
      lng: number;
      startTime: StartTimeOption;
      skillCompatibility?: SkillCompatibility;
      spotClue?: string;
      maxParticipants: number;
      joinMode: JoinMode;
      host: Participant;
      coHost?: Participant | null;
      coverImage?: string;
    };

    if (
      !category ||
      !title ||
      !venueName ||
      !host ||
      typeof lat !== 'number' ||
      typeof lng !== 'number'
    ) {
      return NextResponse.json({ error: 'Missing required meetup fields' }, { status: 400 });
    }

    return await withDbMutation(async () => {
      const db = await readDb();
      const nowIso = new Date().toISOString();
      const lobbyId = `lobby-${Date.now()}`;
      const clampedMax = Math.max(2, Math.min(8, Number(maxParticipants) || 2));
      const chosenStart = startTime || 'Now';

      const hostPersona = db.personas.find((p) => p.id === host.id);

      const initialParticipants: Participant[] = [
        {
          id: host.id,
          name: host.name,
          age: host.age,
          avatar: host.avatar,
          skillBadge: host.skillBadge || 'Host',
          tagline: host.tagline,
          joinedAt: nowIso,
          arrivalStatus: chosenStart === 'Now' ? 'ARRIVED' : 'ON_MY_WAY',
          spotClue: spotClue?.trim() || undefined,
          reliabilityScore: hostPersona?.reliabilityScore ?? 98,
          ratingAvg: hostPersona?.ratingAvg ?? 4.9,
        },
      ];

      if (coHost && coHost.id && coHost.id !== host.id && initialParticipants.length < clampedMax) {
        const coHostPersona = db.personas.find((p) => p.id === coHost.id);
        initialParticipants.push({
          id: coHost.id,
          name: coHost.name,
          age: coHost.age,
          avatar: coHost.avatar,
          skillBadge: coHost.skillBadge || 'Co-Host',
          tagline: coHost.tagline,
          joinedAt: nowIso,
          arrivalStatus: 'ON_MY_WAY',
          reliabilityScore: coHostPersona?.reliabilityScore ?? 97,
          ratingAvg: coHostPersona?.ratingAvg ?? 4.8,
        });
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
        hostId: host.id,
        bannedUserIds: hostPersona?.bannedUserIds ? [...hostPersona.bannedUserIds] : [],
        participants: initialParticipants,
        pendingRequests: [],
        createdAt: nowIso,
      };

      db.lobbies.unshift(newLobby);
      db.messages.push({
        id: `msg-${Date.now()}`,
        lobbyId,
        senderId: host.id,
        senderName: host.name,
        senderAvatar: host.avatar,
        text: spotClue?.trim()
          ? `Meetup live at ${newLobby.venueName}. Spot clue: "${spotClue.trim()}".`
          : `Meetup live at ${newLobby.venueName}. Let me know here when you are heading over.`,
        createdAt: nowIso,
      });

      // Notify any users whose Radar Beacon matches this activity
      db.notifications = db.notifications || [];
      db.personas.forEach((persona) => {
        if (
          persona.id !== host.id &&
          persona.beacon?.active &&
          persona.beacon.categories.includes(category)
        ) {
          db.notifications!.unshift({
            id: `notif-${Date.now()}-${persona.id}`,
            userId: persona.id,
            type: 'BEACON_MATCH',
            title: `Radar Beacon Match · ${category}`,
            body: `${host.name} just started "${newLobby.title}" at ${newLobby.venueName}.`,
            lobbyId,
            read: false,
            createdAt: nowIso,
          });
        }
      });

      await writeDb(db);

      return NextResponse.json(
        { lobby: newLobby, notifications: db.notifications, cloudDb: isCloudDatabaseConnected() },
        { status: 201 }
      );
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to create meetup' },
      { status: 500 }
    );
  }
}

export async function PUT() {
  const db = await resetDb();
  return NextResponse.json({
    personas: db.personas,
    lobbies: db.lobbies,
    ratings: db.ratings || [],
    notifications: db.notifications || [],
    cloudDb: isCloudDatabaseConnected(),
  });
}
