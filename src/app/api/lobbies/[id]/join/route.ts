import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';
import { ArrivalStatus, Participant } from '@/types/lobby';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const body = await req.json();
    const {
      action = 'JOIN_OR_REQUEST',
      user,
      note = '',
      requestId,
      targetUserId,
      arrivalStatus,
      spotClue,
    } = body as {
      action?:
        | 'JOIN_OR_REQUEST'
        | 'ACCEPT_REQUEST'
        | 'DECLINE_REQUEST'
        | 'LEAVE'
        | 'CHECK_IN'
        | 'BAN_FROM_LOBBY';
      user?: Participant;
      note?: string;
      requestId?: string;
      targetUserId?: string;
      arrivalStatus?: ArrivalStatus;
      spotClue?: string;
    };

    const db = await readDb();
    const lobby = db.lobbies.find((item) => item.id === params.id);

    if (!lobby) {
      return NextResponse.json({ error: 'Meetup not found' }, { status: 404 });
    }

    const nowIso = new Date().toISOString();
    db.notifications = db.notifications || [];

    // 1. Live Arrival Check-In & Visual Spot Clue
    if (action === 'CHECK_IN') {
      const uid = targetUserId || user?.id;
      const participant = lobby.participants.find((p) => p.id === uid);
      if (!participant) {
        return NextResponse.json({ error: 'Participant not found in meetup' }, { status: 404 });
      }

      if (arrivalStatus) {
        participant.arrivalStatus = arrivalStatus;
      }
      if (typeof spotClue === 'string') {
        participant.spotClue = spotClue.trim();
      }

      const statusTextMap: Record<ArrivalStatus, string> = {
        ARRIVED: 'Arrived at the venue ("I\'m here!")',
        FIVE_MIN_OUT: '5 minutes away',
        ON_MY_WAY: 'On the way',
        LATE: 'Running ~10 mins late',
      };

      const statusPhrase = arrivalStatus ? statusTextMap[arrivalStatus] : 'Updated check-in';
      const cluePhrase = participant.spotClue ? ` · Spot: "${participant.spotClue}"` : '';

      db.messages.push({
        id: `msg-${Date.now()}`,
        lobbyId: lobby.id,
        senderId: participant.id,
        senderName: participant.name,
        senderAvatar: participant.avatar,
        text: `${participant.name}: ${statusPhrase}${cluePhrase}`,
        createdAt: nowIso,
        isSystem: true,
      });

      // Notify other participants in the room
      lobby.participants.forEach((other) => {
        if (other.id !== participant.id) {
          db.notifications!.unshift({
            id: `notif-${Date.now()}-${other.id}`,
            userId: other.id,
            type: 'CHECK_IN',
            title: `${participant.name.split(' ')[0]} Checked In`,
            body: `${statusPhrase}${cluePhrase} at ${lobby.venueName}.`,
            lobbyId: lobby.id,
            read: false,
            createdAt: nowIso,
          });
        }
      });

      await writeDb(db);
      return NextResponse.json({
        lobby,
        notifications: db.notifications,
        status: 'CHECKED_IN',
      });
    }

    // 2. Host Bans / Kicks a User from Meetup
    if (action === 'BAN_FROM_LOBBY') {
      if (!targetUserId || targetUserId === lobby.hostId) {
        return NextResponse.json({ error: 'Invalid user to ban' }, { status: 400 });
      }
      lobby.bannedUserIds = lobby.bannedUserIds || [];
      if (!lobby.bannedUserIds.includes(targetUserId)) {
        lobby.bannedUserIds.push(targetUserId);
      }

      const kickedPerson =
        lobby.participants.find((p) => p.id === targetUserId) ||
        lobby.pendingRequests.find((r) => r.user.id === targetUserId)?.user;

      lobby.participants = lobby.participants.filter((p) => p.id !== targetUserId);
      lobby.pendingRequests = lobby.pendingRequests.filter(
        (r) => r.user.id !== targetUserId
      );

      // Also add to host's blocked/banned list
      const hostPersona = db.personas.find((p) => p.id === lobby.hostId);
      if (hostPersona) {
        hostPersona.bannedUserIds = hostPersona.bannedUserIds || [];
        if (!hostPersona.bannedUserIds.includes(targetUserId)) {
          hostPersona.bannedUserIds.push(targetUserId);
        }
      }

      if (kickedPerson) {
        db.messages.push({
          id: `msg-${Date.now()}`,
          lobbyId: lobby.id,
          senderId: lobby.hostId,
          senderName: 'System',
          senderAvatar: '',
          text: `${kickedPerson.name} was removed and banned from this meetup by the host.`,
          createdAt: nowIso,
          isSystem: true,
        });
      }

      await writeDb(db);
      return NextResponse.json({
        lobby,
        personas: db.personas,
        status: 'BANNED',
      });
    }

    if (action === 'LEAVE') {
      const uid = targetUserId || user?.id;
      if (!uid) {
        return NextResponse.json({ error: 'User ID required to leave' }, { status: 400 });
      }
      lobby.participants = lobby.participants.filter((p) => p.id !== uid);
      lobby.pendingRequests = lobby.pendingRequests.filter((r) => r.user.id !== uid);
      await writeDb(db);
      return NextResponse.json({ lobby, status: 'LEFT' });
    }

    if (action === 'ACCEPT_REQUEST') {
      const reqIndex = lobby.pendingRequests.findIndex(
        (r) => r.id === requestId || (targetUserId && r.user.id === targetUserId)
      );
      if (reqIndex === -1) {
        return NextResponse.json({ error: 'Pending request not found' }, { status: 404 });
      }
      if (lobby.participants.length >= lobby.maxParticipants) {
        return NextResponse.json({ error: 'Meetup is already at full capacity' }, { status: 400 });
      }

      const [acceptedReq] = lobby.pendingRequests.splice(reqIndex, 1);
      const alreadyIn = lobby.participants.some((p) => p.id === acceptedReq.user.id);
      if (!alreadyIn) {
        const reqPersona = db.personas.find((p) => p.id === acceptedReq.user.id);
        lobby.participants.push({
          ...acceptedReq.user,
          skillBadge: acceptedReq.user.skillBadge || reqPersona?.skillBadge || 'Active',
          arrivalStatus: 'ON_MY_WAY',
          reliabilityScore: reqPersona?.reliabilityScore ?? 98,
          ratingAvg: reqPersona?.ratingAvg ?? 4.9,
          joinedAt: nowIso,
        });

        db.messages.push({
          id: `msg-${Date.now()}`,
          lobbyId: lobby.id,
          senderId: acceptedReq.user.id,
          senderName: acceptedReq.user.name,
          senderAvatar: acceptedReq.user.avatar,
          text: acceptedReq.note
            ? `Joined the meetup: "${acceptedReq.note}"`
            : `${acceptedReq.user.name} was approved and joined the meetup.`,
          createdAt: nowIso,
          isSystem: true,
        });

        db.notifications.unshift({
          id: `notif-${Date.now()}-${acceptedReq.user.id}`,
          userId: acceptedReq.user.id,
          type: 'APPROVED',
          title: `Spot Approved · ${lobby.category}`,
          body: `You are confirmed for "${lobby.title}" at ${lobby.venueName}!`,
          lobbyId: lobby.id,
          read: false,
          createdAt: nowIso,
        });
      }

      await writeDb(db);
      return NextResponse.json({
        lobby,
        notifications: db.notifications,
        status: 'ACCEPTED',
      });
    }

    if (action === 'DECLINE_REQUEST') {
      const reqIndex = lobby.pendingRequests.findIndex(
        (r) => r.id === requestId || (targetUserId && r.user.id === targetUserId)
      );
      if (reqIndex === -1) {
        return NextResponse.json({ error: 'Pending request not found' }, { status: 404 });
      }
      lobby.pendingRequests.splice(reqIndex, 1);
      await writeDb(db);
      return NextResponse.json({ lobby, status: 'DECLINED' });
    }

    if (!user || !user.id) {
      return NextResponse.json({ error: 'Valid user profile is required' }, { status: 400 });
    }

    // Check if banned from this lobby or by the host
    const hostPersona = db.personas.find((p) => p.id === lobby.hostId);
    if (
      lobby.bannedUserIds?.includes(user.id) ||
      hostPersona?.bannedUserIds?.includes(user.id)
    ) {
      return NextResponse.json(
        { error: 'You are restricted from joining this host\'s meetup.' },
        { status: 403 }
      );
    }

    if (lobby.participants.some((p) => p.id === user.id)) {
      return NextResponse.json({ lobby, status: 'ALREADY_JOINED' });
    }

    if (lobby.participants.length >= lobby.maxParticipants) {
      return NextResponse.json({ error: 'Meetup is already full' }, { status: 400 });
    }

    const userPersona = db.personas.find((p) => p.id === user.id);

    if (lobby.joinMode === 'OPEN') {
      lobby.pendingRequests = lobby.pendingRequests.filter((r) => r.user.id !== user.id);

      lobby.participants.push({
        id: user.id,
        name: user.name,
        age: user.age,
        avatar: user.avatar,
        skillBadge: user.skillBadge || userPersona?.skillBadge || 'Active',
        tagline: user.tagline,
        arrivalStatus: 'ON_MY_WAY',
        reliabilityScore: userPersona?.reliabilityScore ?? 98,
        ratingAvg: userPersona?.ratingAvg ?? 4.9,
        joinedAt: nowIso,
      });

      db.messages.push({
        id: `msg-${Date.now()}`,
        lobbyId: lobby.id,
        senderId: user.id,
        senderName: user.name,
        senderAvatar: user.avatar,
        text: `${user.name} claimed a seat in the meetup.`,
        createdAt: nowIso,
        isSystem: true,
      });

      db.notifications.unshift({
        id: `notif-${Date.now()}-${lobby.hostId}`,
        userId: lobby.hostId,
        type: 'APPROVED',
        title: `New Player Joined · ${lobby.category}`,
        body: `${user.name} (${user.skillBadge || 'Active'}) claimed a seat in "${lobby.title}".`,
        lobbyId: lobby.id,
        read: false,
        createdAt: nowIso,
      });

      await writeDb(db);
      return NextResponse.json({
        lobby,
        notifications: db.notifications,
        status: 'JOINED',
      });
    } else {
      const existingReq = lobby.pendingRequests.find((r) => r.user.id === user.id);
      if (existingReq) {
        if (note.trim()) {
          existingReq.note = note.trim();
          await writeDb(db);
        }
        return NextResponse.json({ lobby, status: 'ALREADY_REQUESTED' });
      }

      lobby.pendingRequests.push({
        id: `req-${Date.now()}`,
        user: {
          id: user.id,
          name: user.name,
          age: user.age,
          avatar: user.avatar,
          skillBadge: user.skillBadge || userPersona?.skillBadge || 'Active',
          tagline: user.tagline,
          reliabilityScore: userPersona?.reliabilityScore ?? 98,
          ratingAvg: userPersona?.ratingAvg ?? 4.9,
          joinedAt: nowIso,
        },
        note: note.trim() || 'Hey! Down to join right now if a spot is still open.',
        status: 'PENDING',
        createdAt: nowIso,
      });

      db.notifications.unshift({
        id: `notif-${Date.now()}-${lobby.hostId}`,
        userId: lobby.hostId,
        type: 'REQUEST',
        title: `New Join Request · ${lobby.category}`,
        body: `${user.name} (${user.skillBadge || 'Active'}) requested to join "${lobby.title}".`,
        lobbyId: lobby.id,
        read: false,
        createdAt: nowIso,
      });

      await writeDb(db);
      return NextResponse.json({
        lobby,
        notifications: db.notifications,
        status: 'REQUESTED',
      });
    }
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to process join request' },
      { status: 500 }
    );
  }
}
