import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';
import { requireAuth, errorResponse, AuthError } from '@/lib/auth-guard';
import { ChatMessage } from '@/types/lobby';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = await readDb();
  const messages = db.messages.filter((msg) => msg.lobbyId === params.id);
  return NextResponse.json({ messages });
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // 1. Authenticate caller session
    const { user: authUser } = await requireAuth(req);

    const body = await req.json();
    const text = (body.text || body.content || '').trim();

    if (!text) {
      return errorResponse('Message text is required', 400);
    }

    if (text.length > 1000) {
      return errorResponse('Message exceeds 1000 character limit', 400);
    }

    const db = await readDb();
    const lobby = db.lobbies.find((item) => item.id === params.id);

    if (!lobby) {
      return errorResponse('Lobby not found', 404);
    }

    // 2. Chat sender verification: Must be participant or host (or admin)
    const isHost = lobby.hostId === authUser.id;
    const isParticipant = lobby.participants.some((p) => p.id === authUser.id);
    const isAdmin = authUser.role === 'ADMIN';

    if (!isHost && !isParticipant && !isAdmin) {
      return errorResponse(
        'You must join this meetup to send messages',
        403,
        'FORBIDDEN'
      );
    }

    // 3. Sender info derived securely from authenticated session user (never trust client body)
    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      lobbyId: params.id,
      senderId: authUser.id,
      senderName: authUser.name,
      senderAvatar: authUser.avatar,
      text,
      createdAt: new Date().toISOString(),
      isSystem: false,
    };

    db.messages.push(newMessage);
    await writeDb(db);

    const messages = db.messages.filter((msg) => msg.lobbyId === params.id);
    return NextResponse.json(
      { message: newMessage, messages, success: true },
      { status: 201 }
    );
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
