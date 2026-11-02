import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';
import { requireAuth, errorResponse, AuthError } from '@/lib/auth-guard';

export const dynamic = 'force-dynamic';

export { PUT } from '@/app/api/meetups/[id]/route';

export async function GET(
  _req: NextRequest,
  { params }: { params: { id: string } }
) {
  const db = await readDb();
  const lobby = db.lobbies.find((item) => item.id === params.id);

  if (!lobby) {
    return NextResponse.json({ error: 'Lobby not found' }, { status: 404 });
  }

  const messages = db.messages.filter((msg) => msg.lobbyId === params.id);
  return NextResponse.json({ lobby, messages });
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { user } = await requireAuth(req);

    const db = await readDb();
    const index = db.lobbies.findIndex((item) => item.id === params.id);

    if (index === -1) {
      return errorResponse('Lobby not found', 404);
    }

    const lobby = db.lobbies[index];
    const isHost = lobby.hostId === user.id;
    const isAdmin = user.role === 'ADMIN';

    if (!isHost && !isAdmin) {
      return errorResponse(
        'Only the meetup host or an administrator can delete this meetup',
        403,
        'FORBIDDEN'
      );
    }

    db.lobbies.splice(index, 1);
    db.messages = db.messages.filter((msg) => msg.lobbyId !== params.id);
    await writeDb(db);

    return NextResponse.json({ deleted: true, id: params.id, success: true });
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
