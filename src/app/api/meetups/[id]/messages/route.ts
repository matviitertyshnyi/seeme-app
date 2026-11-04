import { NextRequest, NextResponse } from 'next/server';
import { readDb, withDbMutation } from '@/lib/db';
import { requireAuth, errorResponse, AuthError } from '@/lib/auth-guard';
import { ChatMessage } from '@/types/lobby';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const db = await readDb();
    const messages = db.messages.filter((msg) => msg.lobbyId === params.id);
    return NextResponse.json({
      success: true,
      data: {
        messages,
      },
      messages,
    });
  } catch (err) {
    return errorResponse(
      err instanceof Error ? err.message : 'Failed to retrieve messages',
      500
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user: authUser } = await requireAuth(req);
    const body = await req.json();
    const text = (body.text || body.content || '').trim();

    if (!text) {
      return errorResponse('Message text is required', 400);
    }

    if (text.length > 1000) {
      return errorResponse('Message exceeds 1000 character limit', 400);
    }

    return await withDbMutation(async (db) => {
      const meetup = db.lobbies.find((item) => item.id === params.id);
      if (!meetup) {
        return errorResponse('Meetup not found', 404);
      }

      const isHost = meetup.hostId === authUser.id;
      const isParticipant = meetup.participants.some((p) => p.id === authUser.id);
      const isAdmin = authUser.role === 'ADMIN';

      if (!isHost && !isParticipant && !isAdmin) {
        return errorResponse(
          'You must join this meetup to send messages',
          403,
          'FORBIDDEN'
        );
      }

      const newMessage: ChatMessage = {
        id: `msg-${crypto.randomUUID()}`,
        lobbyId: params.id,
        senderId: authUser.id,
        senderName: authUser.name,
        senderAvatar: authUser.avatar,
        text,
        createdAt: new Date().toISOString(),
        isSystem: false,
      };

      db.messages.push(newMessage);
      const messages = db.messages.filter((msg) => msg.lobbyId === params.id);

      return NextResponse.json(
        {
          success: true,
          data: {
            message: newMessage,
            messages,
          },
          message: newMessage,
          messages,
        },
        { status: 201 }
      );
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return errorResponse(err.message, err.status, err.code);
    }
    return errorResponse(
      err instanceof Error ? err.message : 'Failed to send message',
      500
    );
  }
}
