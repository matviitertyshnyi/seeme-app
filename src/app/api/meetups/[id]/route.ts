import { NextRequest, NextResponse } from 'next/server';
import { readDb, withDbMutation } from '@/lib/db';
import { requireAuth, errorResponse, AuthError } from '@/lib/auth-guard';
import { UpdateMeetupInputSchema } from '@/lib/types';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = await readDb();
    const meetup = db.lobbies.find((item) => item.id === params.id);

    if (!meetup) {
      return errorResponse('Meetup not found', 404);
    }

    const messages = db.messages.filter((msg) => msg.lobbyId === params.id);
    return NextResponse.json({
      success: true,
      data: {
        meetup,
        messages,
      },
      lobby: meetup,
      messages,
    });
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : 'Failed to retrieve meetup',
      500
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user: authUser } = await requireAuth(req);
    const body = await req.json();

    // 1. Zod input validation
    const parsed = UpdateMeetupInputSchema.safeParse(body);
    if (!parsed.success) {
      const firstIssue = parsed.error.issues[0];
      return errorResponse(firstIssue ? firstIssue.message : 'Invalid meetup update input', 400);
    }

    return await withDbMutation(async (db) => {
      const meetup = db.lobbies.find((item) => item.id === params.id);
      if (!meetup) {
        return errorResponse('Meetup not found', 404);
      }

      const isHost = meetup.hostId === authUser.id;
      const isAdmin = authUser.role === 'ADMIN';

      if (!isHost && !isAdmin) {
        return errorResponse(
          'Only the host or an administrator can update meetup details',
          403,
          'FORBIDDEN'
        );
      }

      const updates = parsed.data;

      if (typeof updates.maxParticipants === 'number') {
        if (updates.maxParticipants < meetup.participants.length) {
          return errorResponse(
            `Cannot reduce capacity below current participant count (${meetup.participants.length})`,
            400
          );
        }
        meetup.maxParticipants = updates.maxParticipants;
      }

      if (updates.title) meetup.title = updates.title;
      if (typeof updates.equipmentNote === 'string') meetup.equipmentNote = updates.equipmentNote;
      if (updates.venueName) meetup.venueName = updates.venueName;
      if (typeof updates.venueAddress === 'string') meetup.venueAddress = updates.venueAddress;
      if (updates.lat !== undefined) meetup.lat = updates.lat;
      if (updates.lng !== undefined) meetup.lng = updates.lng;
      if (updates.startTime) meetup.startTime = updates.startTime;
      if (updates.joinMode) meetup.joinMode = updates.joinMode;
      if (updates.skillCompatibility) meetup.skillCompatibility = updates.skillCompatibility;
      if (updates.preferredAgeRange) (meetup as any).preferredAgeRange = updates.preferredAgeRange;
      if (updates.roomStatus || updates.status) {
        meetup.roomStatus = ((updates.roomStatus || updates.status) as string).toUpperCase() as any;
      }
      if (updates.coverImage) meetup.coverImage = updates.coverImage;

      (meetup as any).updatedAt = new Date().toISOString();

      return NextResponse.json({
        success: true,
        data: {
          meetup,
        },
        lobby: meetup,
      });
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return errorResponse(err.message, err.status, err.code);
    }
    return errorResponse(
      err instanceof Error ? err.message : 'Failed to update meetup',
      500
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user: authUser } = await requireAuth(req);

    return await withDbMutation(async (db) => {
      const meetup = db.lobbies.find((item) => item.id === params.id);
      if (!meetup) {
        return errorResponse('Meetup not found', 404);
      }

      const isHost = meetup.hostId === authUser.id;
      const isAdmin = authUser.role === 'ADMIN';

      if (!isHost && !isAdmin) {
        return errorResponse(
          'Only the meetup host or an administrator can delete this meetup',
          403,
          'FORBIDDEN'
        );
      }

      const index = db.lobbies.findIndex((item) => item.id === params.id);
      db.lobbies.splice(index, 1);
      db.messages = db.messages.filter((msg) => msg.lobbyId !== params.id);

      const nowIso = new Date().toISOString();
      db.notifications = db.notifications || [];
      meetup.participants.forEach((part) => {
        if (part.id !== authUser.id) {
          db.notifications!.unshift({
            id: `notif-${Date.now()}-${part.id}`,
            userId: part.id,
            type: 'SYSTEM',
            title: `Meetup Cancelled · ${meetup.category}`,
            body: `"${meetup.title}" has been cancelled by the host.`,
            lobbyId: meetup.id,
            read: false,
            createdAt: nowIso,
          });
        }
      });

      return NextResponse.json({
        success: true,
        data: {
          deleted: true,
          id: params.id,
        },
        deleted: true,
        id: params.id,
      });
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return errorResponse(err.message, err.status, err.code);
    }
    return errorResponse(
      err instanceof Error ? err.message : 'Failed to delete meetup',
      500
    );
  }
}
