import { NextRequest, NextResponse } from 'next/server';
import { readDb, writeDb } from '@/lib/db';
import {
  ActivityCategory,
  PlayerRating,
  RadarBeacon,
  UserPersona,
  UserSettings,
} from '@/types/lobby';

export const dynamic = 'force-dynamic';

export async function GET() {
  const db = readDb();
  return NextResponse.json({
    personas: db.personas,
    ratings: db.ratings || [],
    notifications: db.notifications || [],
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body as { action: string };
    const db = readDb();
    const nowIso = new Date().toISOString();

    if (action === 'REGISTER_OR_CREATE_PROFILE') {
      const {
        name,
        email,
        age,
        avatar,
        skillBadge,
        tagline,
        neighborhood,
        favoriteActivities,
      } = body as {
        name: string;
        email?: string;
        age?: number;
        avatar?: string;
        skillBadge?: string;
        tagline?: string;
        neighborhood?: string;
        favoriteActivities?: ActivityCategory[];
      };

      if (!name || !name.trim()) {
        return NextResponse.json({ error: 'Name is required' }, { status: 400 });
      }

      const newUserId = `user-${Date.now()}`;
      const newPersona: UserPersona = {
        id: newUserId,
        email: (email || `${name.toLowerCase().replace(/\s+/g, '.')}@seeme.app`).trim(),
        name: name.trim(),
        age: Math.max(18, Math.min(99, Number(age) || 25)),
        avatar:
          avatar?.trim() ||
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
        skillBadge: (skillBadge || 'All Levels').trim(),
        tagline: (
          tagline || 'New on SeeMe! Down for spontaneous games and coffee.'
        ).trim(),
        neighborhood: (neighborhood || 'Downtown').trim(),
        verified: true,
        favoriteActivities:
          favoriteActivities && favoriteActivities.length > 0
            ? favoriteActivities
            : ['Ping Pong', 'Chess'],
        reliabilityScore: 100,
        meetupsAttended: 1,
        hoursPlayed: 2,
        ratingAvg: 5.0,
        ratingCount: 1,
        streakWeeks: 1,
        bannedUserIds: [],
        regularPartnerIds: [],
        beacon: {
          active: true,
          categories:
            favoriteActivities && favoriteActivities.length > 0
              ? favoriteActivities
              : ['Ping Pong', 'Chess'],
          radiusKm: 5,
          note: 'Ready to play today',
          updatedAt: nowIso,
        },
        settings: {
          iosAndroidPush: true,
          soundEffects: true,
          hapticFeedback: true,
          distanceUnit: 'km',
          profileVisible: true,
          showReliabilityScore: true,
        },
      };

      db.personas.unshift(newPersona);
      db.notifications = db.notifications || [];
      db.notifications.unshift({
        id: `notif-${Date.now()}`,
        userId: newUserId,
        type: 'SYSTEM',
        title: 'Welcome to SeeMe!',
        body: `Your profile (${newPersona.skillBadge}) is live with a 100% Reliability Score.`,
        read: false,
        createdAt: nowIso,
      });

      writeDb(db);
      return NextResponse.json({
        persona: newPersona,
        personas: db.personas,
        notifications: db.notifications,
      });
    }

    if (action === 'LOGIN') {
      const { emailOrName, userId } = body as {
        emailOrName?: string;
        userId?: string;
      };
      const found = db.personas.find(
        (p) =>
          (userId && p.id === userId) ||
          (emailOrName &&
            (p.email?.toLowerCase() === emailOrName.toLowerCase().trim() ||
              p.name.toLowerCase().includes(emailOrName.toLowerCase().trim())))
      );

      if (!found) {
        return NextResponse.json(
          { error: 'No matching account found. Try registering or signing in with Google.' },
          { status: 404 }
        );
      }

      return NextResponse.json({
        persona: found,
        personas: db.personas,
      });
    }

    if (action === 'GOOGLE_AUTH') {
      const { email, name, avatar } = body as {
        email?: string;
        name?: string;
        avatar?: string;
      };

      const userEmail = (email || 'google.user@gmail.com').toLowerCase().trim();
      const userName = (name || 'Google Player').trim();
      const userAvatar =
        avatar ||
        'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80';

      let found = db.personas.find(
        (p) => p.email?.toLowerCase() === userEmail || p.name.toLowerCase() === userName.toLowerCase()
      );

      if (found) {
        found.verified = true;
        found.authProvider = 'google';
        if (avatar && !found.avatar.includes('unsplash')) {
          found.avatar = avatar;
        }
      } else {
        const newUserId = `user-g-${Date.now()}`;
        found = {
          id: newUserId,
          email: userEmail,
          name: userName,
          age: 26,
          avatar: userAvatar,
          skillBadge: 'Verified Player',
          tagline: 'Signed in with Google! Down for sports, chess, and hanging out.',
          neighborhood: 'Greenwich Village',
          verified: true,
          authProvider: 'google',
          favoriteActivities: ['Ping Pong', 'Chess', 'Run Club', 'Coffee'],
          reliabilityScore: 100,
          meetupsAttended: 1,
          hoursPlayed: 2,
          ratingAvg: 5.0,
          ratingCount: 1,
          streakWeeks: 1,
          bannedUserIds: [],
          regularPartnerIds: [],
          beacon: {
            active: true,
            categories: ['Ping Pong', 'Chess'],
            radiusKm: 15,
            note: 'Open to play nearby',
            updatedAt: nowIso,
          },
          settings: {
            iosAndroidPush: true,
            soundEffects: true,
            hapticFeedback: true,
            distanceUnit: 'km',
            profileVisible: true,
            showReliabilityScore: true,
          },
        };
        db.personas.unshift(found);

        db.notifications = db.notifications || [];
        db.notifications.unshift({
          id: `notif-${Date.now()}`,
          userId: newUserId,
          type: 'SYSTEM',
          title: 'Google Sign-In Successful',
          body: `Welcome, ${found.name}! Your account is verified with a 100% Reliability Score.`,
          read: false,
          createdAt: nowIso,
        });
      }

      writeDb(db);
      return NextResponse.json({
        persona: found,
        personas: db.personas,
        notifications: db.notifications,
      });
    }

    if (action === 'UPDATE_PROFILE') {
      const {
        userId,
        name,
        age,
        avatar,
        skillBadge,
        tagline,
        neighborhood,
        favoriteActivities,
      } = body as {
        userId: string;
        name?: string;
        age?: number;
        avatar?: string;
        skillBadge?: string;
        tagline?: string;
        neighborhood?: string;
        favoriteActivities?: ActivityCategory[];
      };

      const persona = db.personas.find((p) => p.id === userId);
      if (!persona) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      if (name?.trim()) persona.name = name.trim();
      if (age) persona.age = Math.max(18, Math.min(99, Number(age)));
      if (avatar?.trim()) persona.avatar = avatar.trim();
      if (skillBadge?.trim()) persona.skillBadge = skillBadge.trim();
      if (tagline?.trim()) persona.tagline = tagline.trim();
      if (neighborhood?.trim()) persona.neighborhood = neighborhood.trim();
      if (Array.isArray(favoriteActivities) && favoriteActivities.length > 0) {
        persona.favoriteActivities = favoriteActivities;
      }

      // Sync participant snapshots across active lobbies
      db.lobbies.forEach((lobby) => {
        lobby.participants.forEach((part) => {
          if (part.id === userId) {
            part.name = persona.name;
            part.age = persona.age;
            part.avatar = persona.avatar;
            part.skillBadge = persona.skillBadge;
            part.tagline = persona.tagline;
          }
        });
      });

      writeDb(db);
      return NextResponse.json({
        persona,
        personas: db.personas,
        lobbies: db.lobbies,
      });
    }

    if (action === 'UPDATE_SETTINGS') {
      const { userId, settings } = body as {
        userId: string;
        settings: Partial<UserSettings>;
      };
      const persona = db.personas.find((p) => p.id === userId);
      if (!persona) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      persona.settings = { ...persona.settings, ...settings };
      writeDb(db);
      return NextResponse.json({ persona, personas: db.personas });
    }

    if (action === 'TOGGLE_BEACON') {
      const { userId, beacon } = body as {
        userId: string;
        beacon: RadarBeacon;
      };
      const persona = db.personas.find((p) => p.id === userId);
      if (!persona) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      persona.beacon = {
        ...beacon,
        updatedAt: nowIso,
      };
      writeDb(db);
      return NextResponse.json({ persona, personas: db.personas });
    }

    if (action === 'RATE_PLAYER') {
      const {
        fromUserId,
        toUserId,
        lobbyId,
        stars,
        showedUp = true,
        comment = '',
      } = body as {
        fromUserId: string;
        toUserId: string;
        lobbyId: string;
        stars: number;
        showedUp?: boolean;
        comment?: string;
      };

      const fromUser = db.personas.find((p) => p.id === fromUserId);
      const toUser = db.personas.find((p) => p.id === toUserId);
      const lobby = db.lobbies.find((l) => l.id === lobbyId);

      const clampedStars = Math.max(1, Math.min(5, Number(stars) || 5));

      const newRating: PlayerRating = {
        id: `rate-${Date.now()}`,
        fromUserId,
        fromUserName: fromUser?.name || 'Player',
        fromUserAvatar:
          fromUser?.avatar ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        toUserId,
        lobbyId,
        lobbyTitle: lobby?.title || 'Recent Meetup',
        stars: clampedStars,
        showedUp,
        comment: comment.trim() || (showedUp ? 'Showed up on time, great session!' : 'Missed session'),
        createdAt: nowIso,
      };

      db.ratings = db.ratings || [];
      db.ratings.unshift(newRating);

      if (toUser) {
        const totalStars = toUser.ratingAvg * toUser.ratingCount + clampedStars;
        toUser.ratingCount += 1;
        toUser.ratingAvg = Number((totalStars / toUser.ratingCount).toFixed(1));
        if (showedUp) {
          toUser.meetupsAttended += 1;
          toUser.hoursPlayed += 2;
          toUser.reliabilityScore = Math.min(
            100,
            Math.round((toUser.reliabilityScore * 9 + 100) / 10)
          );
        } else {
          toUser.reliabilityScore = Math.max(
            50,
            Math.round((toUser.reliabilityScore * 9 + 40) / 10)
          );
        }

        // Sync participant reliability & rating
        db.lobbies.forEach((l) => {
          l.participants.forEach((part) => {
            if (part.id === toUserId) {
              part.ratingAvg = toUser.ratingAvg;
              part.reliabilityScore = toUser.reliabilityScore;
            }
          });
        });

        db.notifications = db.notifications || [];
        db.notifications.unshift({
          id: `notif-${Date.now()}`,
          userId: toUserId,
          type: 'RATING',
          title: `New ${clampedStars}-Star Review from ${fromUser?.name || 'Player'}`,
          body: newRating.comment,
          lobbyId,
          read: false,
          createdAt: nowIso,
        });
      }

      writeDb(db);
      return NextResponse.json({
        rating: newRating,
        personas: db.personas,
        ratings: db.ratings,
        notifications: db.notifications,
        lobbies: db.lobbies,
      });
    }

    if (action === 'BAN_USER' || action === 'UNBAN_USER') {
      const { userId, targetUserId, lobbyId } = body as {
        userId: string;
        targetUserId: string;
        lobbyId?: string;
      };

      const persona = db.personas.find((p) => p.id === userId);
      if (!persona) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      persona.bannedUserIds = persona.bannedUserIds || [];

      if (action === 'BAN_USER') {
        if (!persona.bannedUserIds.includes(targetUserId)) {
          persona.bannedUserIds.push(targetUserId);
        }
        // Also remove targetUserId from any lobbies hosted by userId or the specified lobbyId
        db.lobbies.forEach((l) => {
          if (l.hostId === userId || l.id === lobbyId) {
            l.bannedUserIds = l.bannedUserIds || [];
            if (!l.bannedUserIds.includes(targetUserId)) {
              l.bannedUserIds.push(targetUserId);
            }
            l.participants = l.participants.filter((p) => p.id !== targetUserId);
            l.pendingRequests = l.pendingRequests.filter(
              (r) => r.user.id !== targetUserId
            );
          }
        });
      } else {
        persona.bannedUserIds = persona.bannedUserIds.filter(
          (id) => id !== targetUserId
        );
        db.lobbies.forEach((l) => {
          if (l.hostId === userId && Array.isArray(l.bannedUserIds)) {
            l.bannedUserIds = l.bannedUserIds.filter((id) => id !== targetUserId);
          }
        });
      }

      writeDb(db);
      return NextResponse.json({
        persona,
        personas: db.personas,
        lobbies: db.lobbies,
      });
    }

    if (action === 'TOGGLE_REGULAR_PARTNER') {
      const { userId, partnerId } = body as {
        userId: string;
        partnerId: string;
      };
      const persona = db.personas.find((p) => p.id === userId);
      if (!persona) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      persona.regularPartnerIds = persona.regularPartnerIds || [];
      if (persona.regularPartnerIds.includes(partnerId)) {
        persona.regularPartnerIds = persona.regularPartnerIds.filter(
          (id) => id !== partnerId
        );
      } else {
        persona.regularPartnerIds.push(partnerId);
      }
      writeDb(db);
      return NextResponse.json({ persona, personas: db.personas });
    }

    if (action === 'MARK_NOTIFICATIONS_READ') {
      const { userId } = body as { userId: string };
      db.notifications = (db.notifications || []).map((n) =>
        n.userId === userId ? { ...n, read: true } : n
      );
      writeDb(db);
      return NextResponse.json({ notifications: db.notifications });
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'User action failed' },
      { status: 500 }
    );
  }
}
