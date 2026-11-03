import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';
import { requireAuth, errorResponse, AuthError } from '@/lib/auth-guard';
import { ArrivalStatus, Participant } from '@/types/lobby';

export const dynamic = 'force-dynamic';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authenticate caller session on all join operations
    const { user: authUser } = await requireAuth(req);

    const body = await req.json();
    const {
      action = 'JOIN_OR_REQUEST',
      note = '',
      requestId,
      targetUserId,
      arrivalStatus,
      spotClue,
    } = body as {
      action?:
        | 'JOIN'
        | 'REQUEST_JOIN'
        | 'JOIN_OR_REQUEST'
        | 'ACCEPT_REQUEST'
        | 'DECLINE_REQUEST'
        | 'LEAVE'
        | 'CHECK_IN'
        | 'BAN_FROM_LOBBY'
        | 'KICK_OR_BAN';
      user?: Partial<Participant>;
      note?: string;
      requestId?: string;
      targetUserId?: string;
      arrivalStatus?: ArrivalStatus;
      spotClue?: string;
    };

    const db = await readDb();
    const lobby = db.lobbies.find((item) => item.id === params.id);

    if (!lobby) {
      return errorResponse('Meetup not found', 404);
    }

    const nowIso = new Date().toISOString();
    db.notifications = db.notifications || [];
    const isHost = lobby.hostId === authUser.id;
    const isAdmin = authUser.role === 'ADMIN';

    // 1. CHECK_IN: Only confirmed participant (for themselves) or Admin
    if (action === 'CHECK_IN') {
      const uid = targetUserId || authUser.id;

      // Participant-only guard: caller must match targetUserId unless admin
      if (authUser.id !== uid && !isAdmin) {
        return errorResponse('You can only check in for your own profile', 403, 'FORBIDDEN');
      }

      const participant = lobby.participants.find((p) => p.id === uid);
      if (!participant) {
        return errorResponse('Participant not found in meetup', 404, 'NOT_FOUND');
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
        success: true,
      });
    }

    // 2. BAN_FROM_LOBBY: Host-only permission (or Admin)
    if (action === 'BAN_FROM_LOBBY' || action === 'KICK_OR_BAN') {
      if (!isHost && !isAdmin) {
        return errorResponse('Only the host can ban participants from this meetup', 403, 'FORBIDDEN');
      }

      if (!targetUserId || targetUserId === lobby.hostId) {
        return errorResponse('Invalid user to ban (cannot ban the host)', 400);
      }

      lobby.bannedUserIds = lobby.bannedUserIds || [];
      if (!lobby.bannedUserIds.includes(targetUserId)) {
        lobby.bannedUserIds.push(targetUserId);
      }

      const kickedPerson =
        lobby.participants.find((p) => p.id === targetUserId) ||
        lobby.pendingRequests.find((r) => r.user.id === targetUserId)?.user;

      lobby.participants = lobby.participants.filter((p) => p.id !== targetUserId);
      lobby.pendingRequests = lobby.pendingRequests.filter((r) => r.user.id !== targetUserId);

      // Add to host's personal blocked list
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
        success: true,
      });
    }

    // 3. LEAVE: Participant-only permission (must match targetUserId)
    if (action === 'LEAVE') {
      const uid = targetUserId || authUser.id;

      if (authUser.id !== uid && !isAdmin) {
        return errorResponse('You can only remove yourself from the meetup', 403, 'FORBIDDEN');
      }

      // Host cannot simply leave; host must cancel or delete the meetup
      if (uid === lobby.hostId && !isAdmin) {
        return errorResponse(
          'Meetup hosts must cancel or delete the meetup instead of leaving',
          400
        );
      }

      lobby.participants = lobby.participants.filter((p) => p.id !== uid);
      lobby.pendingRequests = lobby.pendingRequests.filter((r) => r.user.id !== uid);
      await writeDb(db);
      return NextResponse.json({ lobby, status: 'LEFT', success: true });
    }

    // 4. ACCEPT_REQUEST: Host-only permission + Capacity Guard
    if (action === 'ACCEPT_REQUEST') {
      if (!isHost && !isAdmin) {
        return errorResponse('Only the host can accept join requests', 403, 'FORBIDDEN');
      }

      const reqIndex = lobby.pendingRequests.findIndex(
        (r) => r.id === requestId || (targetUserId && r.user.id === targetUserId)
      );
      if (reqIndex === -1) {
        return errorResponse('Pending request not found', 404, 'NOT_FOUND');
      }

      // Capacity limit guard
      if (lobby.participants.length >= lobby.maxParticipants) {
        return errorResponse('Meetup is already at full capacity', 400);
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
        success: true,
      });
    }

    // 5. DECLINE_REQUEST: Host-only permission
    if (action === 'DECLINE_REQUEST') {
      if (!isHost && !isAdmin) {
        return errorResponse('Only the host can decline join requests', 403, 'FORBIDDEN');
      }

      const reqIndex = lobby.pendingRequests.findIndex(
        (r) => r.id === requestId || (targetUserId && r.user.id === targetUserId)
      );
      if (reqIndex === -1) {
        return errorResponse('Pending request not found', 404, 'NOT_FOUND');
      }

      lobby.pendingRequests.splice(reqIndex, 1);
      await writeDb(db);
      return NextResponse.json({ lobby, status: 'DECLINED', success: true });
    }

    // 6. JOIN / REQUEST_JOIN / JOIN_OR_REQUEST
    const joiningUser = authUser;

    // Check if banned from this lobby or by the host
    const hostPersona = db.personas.find((p) => p.id === lobby.hostId);
    if (
      lobby.bannedUserIds?.includes(joiningUser.id) ||
      hostPersona?.bannedUserIds?.includes(joiningUser.id)
    ) {
      return errorResponse("You are restricted from joining this host's meetup", 403, 'FORBIDDEN');
    }

    // Already joined check
    if (lobby.participants.some((p) => p.id === joiningUser.id)) {
      return NextResponse.json({ lobby, status: 'ALREADY_JOINED', success: true });
    }

    // Capacity limit guard: strictly enforce maxParticipants ceiling
    if (lobby.participants.length >= lobby.maxParticipants) {
      return errorResponse('Meetup is already full', 400);
    }

    const effectiveJoinMode =
      action === 'REQUEST_JOIN'
        ? 'APPROVAL_REQUIRED'
        : action === 'JOIN'
        ? 'OPEN'
        : lobby.joinMode;

    if (effectiveJoinMode === 'OPEN') {
      lobby.pendingRequests = lobby.pendingRequests.filter((r) => r.user.id !== joiningUser.id);

      lobby.participants.push({
        id: joiningUser.id,
        name: joiningUser.name,
        age: joiningUser.age,
        avatar: joiningUser.avatar,
        skillBadge: joiningUser.skillBadge || 'Active',
        tagline: joiningUser.tagline,
        arrivalStatus: 'ON_MY_WAY',
        reliabilityScore: joiningUser.reliabilityScore ?? 98,
        ratingAvg: joiningUser.ratingAvg ?? 4.9,
        joinedAt: nowIso,
      });

      db.messages.push({
        id: `msg-${Date.now()}`,
        lobbyId: lobby.id,
        senderId: joiningUser.id,
        senderName: joiningUser.name,
        senderAvatar: joiningUser.avatar,
        text: `${joiningUser.name} claimed a seat in the meetup.`,
        createdAt: nowIso,
        isSystem: true,
      });

      db.notifications.unshift({
        id: `notif-${Date.now()}-${lobby.hostId}`,
        userId: lobby.hostId,
        type: 'APPROVED',
        title: `New Player Joined · ${lobby.category}`,
        body: `${joiningUser.name} (${joiningUser.skillBadge || 'Active'}) claimed a seat in "${lobby.title}".`,
        lobbyId: lobby.id,
        read: false,
        createdAt: nowIso,
      });

      await writeDb(db);
      return NextResponse.json({
        lobby,
        notifications: db.notifications,
        status: 'JOINED',
        success: true,
      });
    } else {
      const existingReq = lobby.pendingRequests.find((r) => r.user.id === joiningUser.id);
      if (existingReq) {
        if (note && note.trim()) {
          existingReq.note = note.trim();
          await writeDb(db);
        }
        return NextResponse.json({ lobby, status: 'ALREADY_REQUESTED', success: true });
      }

      lobby.pendingRequests.push({
        id: `req-${Date.now()}`,
        user: {
          id: joiningUser.id,
          name: joiningUser.name,
          age: joiningUser.age,
          avatar: joiningUser.avatar,
          skillBadge: joiningUser.skillBadge || 'Active',
          tagline: joiningUser.tagline,
          reliabilityScore: joiningUser.reliabilityScore ?? 98,
          ratingAvg: joiningUser.ratingAvg ?? 4.9,
          joinedAt: nowIso,
        },
        note: (note && note.trim()) || 'Hey! Down to join right now if a spot is still open.',
        status: 'PENDING',
        createdAt: nowIso,
      });

      db.notifications.unshift({
        id: `notif-${Date.now()}-${lobby.hostId}`,
        userId: lobby.hostId,
        type: 'REQUEST',
        title: `New Join Request · ${lobby.category}`,
        body: `${joiningUser.name} (${joiningUser.skillBadge || 'Active'}) requested to join "${lobby.title}".`,
        lobbyId: lobby.id,
        read: false,
        createdAt: nowIso,
      });

      await writeDb(db);
      return NextResponse.json({
        lobby,
        notifications: db.notifications,
        status: 'REQUESTED',
        success: true,
      });
    }
  } catch (err) {
    if (err instanceof AuthError) {
      return errorResponse(err.message, err.status, err.code);
    }
    return errorResponse(
      err instanceof Error ? err.message : 'Failed to process join action',
      500
    );
  }
}
