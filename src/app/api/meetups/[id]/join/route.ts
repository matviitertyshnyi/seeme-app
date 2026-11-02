import { NextRequest, NextResponse } from 'next/server';
import { withDbMutation } from '@/lib/db';
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

    return await withDbMutation(async (db) => {
      const meetup = db.lobbies.find((item) => item.id === params.id);

    if (!meetup) {
      return errorResponse('Meetup not found', 404);
    }

    const nowIso = new Date().toISOString();
    db.notifications = db.notifications || [];
    const isHost = meetup.hostId === authUser.id;
    const isAdmin = authUser.role === 'ADMIN';

    // ------------------------------------------------------------------------
    // 1. CHECK_IN: Only confirmed participant (for themselves) or Admin
    // ------------------------------------------------------------------------
    if (action === 'CHECK_IN') {
      const uid = targetUserId || authUser.id;

      if (authUser.id !== uid && !isAdmin) {
        return errorResponse('You can only check in for your own profile', 403, 'FORBIDDEN');
      }

      const participant = meetup.participants.find((p) => p.id === uid);
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
        lobbyId: meetup.id,
        senderId: participant.id,
        senderName: participant.name,
        senderAvatar: participant.avatar,
        text: `${participant.name}: ${statusPhrase}${cluePhrase}`,
        createdAt: nowIso,
        isSystem: true,
      });

      // Notify other participants in the room
      meetup.participants.forEach((other) => {
        if (other.id !== participant.id) {
          db.notifications!.unshift({
            id: `notif-${Date.now()}-${other.id}`,
            userId: other.id,
            type: 'CHECK_IN',
            title: `${participant.name.split(' ')[0]} Checked In`,
            body: `${statusPhrase}${cluePhrase} at ${meetup.venueName}.`,
            lobbyId: meetup.id,
            read: false,
            createdAt: nowIso,
          });
        }
      });

      return NextResponse.json({
        success: true,
        data: {
          meetup,
          status: 'CHECKED_IN',
          notifications: db.notifications,
        },
        lobby: meetup,
        notifications: db.notifications,
        status: 'CHECKED_IN',
      });
    }

    // ------------------------------------------------------------------------
    // 2. BAN_FROM_LOBBY: Host-only permission (or Admin)
    // ------------------------------------------------------------------------
    if (action === 'BAN_FROM_LOBBY' || action === 'KICK_OR_BAN') {
      if (!isHost && !isAdmin) {
        return errorResponse('Only the host can ban participants from this meetup', 403, 'FORBIDDEN');
      }

      if (!targetUserId || targetUserId === meetup.hostId) {
        return errorResponse('Invalid user to ban: host cannot be banned from their own meetup.', 400);
      }

      meetup.bannedUserIds = meetup.bannedUserIds || [];
      if (!meetup.bannedUserIds.includes(targetUserId)) {
        meetup.bannedUserIds.push(targetUserId);
      }

      const kickedPerson =
        meetup.participants.find((p) => p.id === targetUserId) ||
        meetup.pendingRequests.find((r) => r.user.id === targetUserId)?.user;

      meetup.participants = meetup.participants.filter((p) => p.id !== targetUserId);
      meetup.pendingRequests = meetup.pendingRequests.filter((r) => r.user.id !== targetUserId);

      // Add to host's personal blocked list
      const hostPersona = db.personas.find((p) => p.id === meetup.hostId);
      if (hostPersona) {
        hostPersona.bannedUserIds = hostPersona.bannedUserIds || [];
        if (!hostPersona.bannedUserIds.includes(targetUserId)) {
          hostPersona.bannedUserIds.push(targetUserId);
        }
      }

      if (kickedPerson) {
        db.messages.push({
          id: `msg-${Date.now()}`,
          lobbyId: meetup.id,
          senderId: meetup.hostId,
          senderName: 'System',
          senderAvatar: '',
          text: `${kickedPerson.name} was removed and banned from this meetup by the host.`,
          createdAt: nowIso,
          isSystem: true,
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          meetup,
          status: 'BANNED',
          personas: db.personas,
        },
        lobby: meetup,
        personas: db.personas,
        status: 'BANNED',
      });
    }

    // ------------------------------------------------------------------------
    // 3. LEAVE: Participant-only permission (must match targetUserId)
    // ------------------------------------------------------------------------
    if (action === 'LEAVE') {
      const uid = targetUserId || authUser.id;

      if (authUser.id !== uid && !isAdmin) {
        return errorResponse('You can only remove yourself from the meetup', 403, 'FORBIDDEN');
      }

      // Host cannot leave without transferring or cancelling
      if (uid === meetup.hostId && !isAdmin) {
        return errorResponse(
          'The host cannot leave without transferring host role or cancelling the meetup.',
          400
        );
      }

      meetup.participants = meetup.participants.filter((p) => p.id !== uid);
      meetup.pendingRequests = meetup.pendingRequests.filter((r) => r.user.id !== uid);
      return NextResponse.json({
        success: true,
        data: {
          meetup,
          status: 'LEFT',
        },
        lobby: meetup,
        status: 'LEFT',
      });
    }

    // ------------------------------------------------------------------------
    // 4. ACCEPT_REQUEST: Host-only permission + Capacity Guard
    // ------------------------------------------------------------------------
    if (action === 'ACCEPT_REQUEST') {
      if (!isHost && !isAdmin) {
        return errorResponse('Only the host can accept join requests', 403, 'FORBIDDEN');
      }

      const reqIndex = meetup.pendingRequests.findIndex(
        (r) => r.id === requestId || (targetUserId && r.user.id === targetUserId)
      );
      if (reqIndex === -1) {
        return errorResponse('Pending request not found', 404, 'NOT_FOUND');
      }

      // Capacity limit guard
      if (meetup.participants.length >= meetup.maxParticipants) {
        return errorResponse('Meetup is already at full capacity', 400);
      }

      const [acceptedReq] = meetup.pendingRequests.splice(reqIndex, 1);
      const alreadyIn = meetup.participants.some((p) => p.id === acceptedReq.user.id);
      if (!alreadyIn) {
        const reqPersona = db.personas.find((p) => p.id === acceptedReq.user.id);
        meetup.participants.push({
          ...acceptedReq.user,
          skillBadge: acceptedReq.user.skillBadge || reqPersona?.skillBadge || 'Active',
          arrivalStatus: 'ON_MY_WAY',
          reliabilityScore: reqPersona?.reliabilityScore ?? 98,
          ratingAvg: reqPersona?.ratingAvg ?? 4.9,
          joinedAt: nowIso,
        });

        db.messages.push({
          id: `msg-${Date.now()}`,
          lobbyId: meetup.id,
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
          title: `Spot Approved · ${meetup.category}`,
          body: `You are confirmed for "${meetup.title}" at ${meetup.venueName}!`,
          lobbyId: meetup.id,
          read: false,
          createdAt: nowIso,
        });
      }

      return NextResponse.json({
        success: true,
        data: {
          meetup,
          status: 'ACCEPTED',
          notifications: db.notifications,
        },
        lobby: meetup,
        notifications: db.notifications,
        status: 'ACCEPTED',
      });
    }

    // ------------------------------------------------------------------------
    // 5. DECLINE_REQUEST: Host-only permission
    // ------------------------------------------------------------------------
    if (action === 'DECLINE_REQUEST') {
      if (!isHost && !isAdmin) {
        return errorResponse('Only the host can decline join requests', 403, 'FORBIDDEN');
      }

      const reqIndex = meetup.pendingRequests.findIndex(
        (r) => r.id === requestId || (targetUserId && r.user.id === targetUserId)
      );
      if (reqIndex === -1) {
        return errorResponse('Pending request not found', 404, 'NOT_FOUND');
      }

      meetup.pendingRequests.splice(reqIndex, 1);
      return NextResponse.json({
        success: true,
        data: {
          meetup,
          status: 'DECLINED',
        },
        lobby: meetup,
        status: 'DECLINED',
      });
    }

    // ------------------------------------------------------------------------
    // 6. JOIN / REQUEST_JOIN / JOIN_OR_REQUEST
    // ------------------------------------------------------------------------
    const joiningUser = authUser;

    // Check if banned from this meetup or by the host
    const hostPersona = db.personas.find((p) => p.id === meetup.hostId);
    if (
      meetup.bannedUserIds?.includes(joiningUser.id) ||
      hostPersona?.bannedUserIds?.includes(joiningUser.id)
    ) {
      return errorResponse("You are restricted from joining this host's meetup.", 403, 'FORBIDDEN');
    }

    // Already joined check
    if (meetup.participants.some((p) => p.id === joiningUser.id)) {
      return NextResponse.json({
        success: true,
        data: {
          meetup,
          status: 'ALREADY_JOINED',
        },
        lobby: meetup,
        status: 'ALREADY_JOINED',
      });
    }

    // Capacity limit guard: strictly enforce maxParticipants ceiling
    if (meetup.participants.length >= meetup.maxParticipants) {
      return errorResponse('Meetup is already at full capacity', 400);
    }

    const effectiveJoinMode =
      action === 'REQUEST_JOIN'
        ? 'APPROVAL_REQUIRED'
        : action === 'JOIN'
        ? 'OPEN'
        : meetup.joinMode;

    if (effectiveJoinMode === 'OPEN') {
      meetup.pendingRequests = meetup.pendingRequests.filter((r) => r.user.id !== joiningUser.id);

      meetup.participants.push({
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
        lobbyId: meetup.id,
        senderId: joiningUser.id,
        senderName: joiningUser.name,
        senderAvatar: joiningUser.avatar,
        text: `${joiningUser.name} claimed a seat in the meetup.`,
        createdAt: nowIso,
        isSystem: true,
      });

      db.notifications.unshift({
        id: `notif-${Date.now()}-${meetup.hostId}`,
        userId: meetup.hostId,
        type: 'APPROVED',
        title: `New Player Joined · ${meetup.category}`,
        body: `${joiningUser.name} (${joiningUser.skillBadge || 'Active'}) claimed a seat in "${meetup.title}".`,
        lobbyId: meetup.id,
        read: false,
        createdAt: nowIso,
      });

      return NextResponse.json({
        success: true,
        data: {
          meetup,
          status: 'JOINED',
          notifications: db.notifications,
        },
        lobby: meetup,
        notifications: db.notifications,
        status: 'JOINED',
      });
    } else {
      const existingReq = meetup.pendingRequests.find((r) => r.user.id === joiningUser.id);
      if (existingReq) {
        if (note && note.trim()) {
          existingReq.note = note.trim();
        }
        return NextResponse.json({
          success: true,
          data: {
            meetup,
            status: 'ALREADY_REQUESTED',
          },
          lobby: meetup,
          status: 'ALREADY_REQUESTED',
        });
      }

      meetup.pendingRequests.push({
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
        id: `notif-${Date.now()}-${meetup.hostId}`,
        userId: meetup.hostId,
        type: 'REQUEST',
        title: `New Join Request · ${meetup.category}`,
        body: `${joiningUser.name} (${joiningUser.skillBadge || 'Active'}) requested to join "${meetup.title}".`,
        lobbyId: meetup.id,
        read: false,
        createdAt: nowIso,
      });

      return NextResponse.json({
        success: true,
        data: {
          meetup,
          status: 'REQUESTED',
          notifications: db.notifications,
        },
        lobby: meetup,
        notifications: db.notifications,
        status: 'REQUESTED',
      });
    }
  });
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
