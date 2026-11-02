import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';
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
    const body = await req.json();
    const { senderId, senderName, senderAvatar, text } = body as {
      senderId: string;
      senderName: string;
      senderAvatar: string;
      text: string;
    };

    if (!senderId || !senderName || !text || !text.trim()) {
      return NextResponse.json({ error: 'Message text and sender info required' }, { status: 400 });
    }

    const db = await readDb();
    const lobby = db.lobbies.find((item) => item.id === params.id);

    if (!lobby) {
      return NextResponse.json({ error: 'Lobby not found' }, { status: 404 });
    }

    const newMessage: ChatMessage = {
      id: `msg-${Date.now()}`,
      lobbyId: params.id,
      senderId,
      senderName,
      senderAvatar,
      text: text.trim(),
      createdAt: new Date().toISOString(),
    };

    db.messages.push(newMessage);
    await writeDb(db);

    const messages = db.messages.filter((msg) => msg.lobbyId === params.id);
    return NextResponse.json({ message: newMessage, messages }, { status: 201 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to send message' },
      { status: 500 }
    );
  }
}
