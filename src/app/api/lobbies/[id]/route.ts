import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = readDb();
  const lobby = db.lobbies.find((item) => item.id === params.id);

  if (!lobby) {
    return NextResponse.json({ error: 'Lobby not found' }, { status: 404 });
  }

  const messages = db.messages.filter((msg) => msg.lobbyId === params.id);
  return NextResponse.json({ lobby, messages });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = readDb();
  const index = db.lobbies.findIndex((item) => item.id === params.id);

  if (index === -1) {
    return NextResponse.json({ error: 'Lobby not found' }, { status: 404 });
  }

  db.lobbies.splice(index, 1);
  db.messages = db.messages.filter((msg) => msg.lobbyId !== params.id);
  writeDb(db);

  return NextResponse.json({ deleted: true, id: params.id });
}
