import { NextRequest, NextResponse } from 'next/server';
import { readDb, withDbMutation } from '@/lib/db';
import {
  optionalAuth,
  requireAuth,
  errorResponse,
  AuthError,
  sanitizePersona,
  sanitizePersonas,
} from '@/lib/auth-guard';
import { setSessionCookies } from '@/lib/oauth';
import {
  ActivityCategory,
  DirectMessage,
  PlayerRating,
  RadarBeacon,
  UserPersona,
  UserSettings,
} from '@/types/lobby';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (req) await optionalAuth(req);
  const db = await readDb();
  if (Array.isArray(db.personas)) {
    db.personas.forEach((p) => {
      const isPlaceholder =
        !p.avatar ||
        p.avatar.includes('unsplash.com') ||
        p.avatar.startsWith('data:image/svg+xml');
      if (isPlaceholder) {
        p.photoVerified = false;
      }
    });
  }
  return NextResponse.json({
    personas: sanitizePersonas(db.personas),
    ratings: db.ratings || [],
    notifications: db.notifications || [],
    directMessages: db.directMessages || [],
  });
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { action } = body as { action: string };
    const nowIso = new Date().toISOString();

    const AUTH_REQUIRED_ACTIONS = new Set([
      'REQUEST_VERIFICATION',
      'ADMIN_ACTION',
      'UPDATE_PROFILE',
      'UPDATE_SETTINGS',
      'TOGGLE_BEACON',
      'RATE_PLAYER',
      'BAN_USER',
      'UNBAN_USER',
      'TOGGLE_REGULAR_PARTNER',
      'MARK_NOTIFICATIONS_READ',
      'SEND_FRIEND_REQUEST',
      'ACCEPT_FRIEND_REQUEST',
      'DECLINE_OR_REMOVE_FRIEND',
      'SEND_DIRECT_MESSAGE',
      'TOGGLE_SAVE_LOBBY',
      'SUBMIT_PHOTO_VERIFICATION',
    ]);

    let authUser: UserPersona | undefined;
    if (AUTH_REQUIRED_ACTIONS.has(action)) {
      const auth = await requireAuth(req);
      authUser = auth.user;
    }

    return await withDbMutation(async (db) => {

    if (action === 'REGISTER_OR_CREATE_PROFILE') {
      const {
        name,
        email,
        password,
        age,
        avatar,
        skillBadge,
        tagline,
        neighborhood,
        favoriteActivities,
      } = body as {
        name: string;
        email?: string;
        password?: string;
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

      const cleanEmail = (email || `${name.toLowerCase().replace(/\s+/g, '.')}@leavetheroom.app`).trim().toLowerCase();

      // Check if email already registered
      const existingUser = db.personas.find(
        (p) => p.email?.toLowerCase() === cleanEmail
      );
      if (existingUser) {
        return NextResponse.json(
          { error: 'An account with this email already exists. Please log in.' },
          { status: 409 }
        );
      }

      const newUserId = `user-${crypto.randomUUID()}`;
      const newPersona: UserPersona = {
        id: newUserId,
        email: cleanEmail,
        password: password ? password.trim() : undefined,
        name: name.trim(),
        age: Math.max(18, Math.min(99, Number(age) || 25)),
        avatar:
          avatar?.trim() ||
          'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?auto=format&fit=crop&w=400&q=80',
        skillBadge: (skillBadge || 'New Member').trim(),
        tagline: (
          tagline || 'New on Leave The Room! Excited to connect for spontaneous games and meetups.'
        ).trim(),
        neighborhood: (neighborhood || 'Greenwich Village').trim(),
        onboarded: true,
        verified: false,
        verificationStatus: 'UNVERIFIED',
        role: 'USER',
        isBanned: false,
        authProvider: 'email',
        favoriteActivities:
          favoriteActivities && favoriteActivities.length > 0
            ? favoriteActivities
            : ['Coffee'],
        reliabilityScore: 95,
        meetupsAttended: 0,
        hoursPlayed: 0,
        ratingAvg: 5.0,
        ratingCount: 0,
        streakWeeks: 1,
        bannedUserIds: [],
        regularPartnerIds: [],
        beacon: {
          active: true,
          categories:
            favoriteActivities && favoriteActivities.length > 0
              ? favoriteActivities
              : ['Coffee'],
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
        id: `notif-${crypto.randomUUID()}`,
        userId: newUserId,
        type: 'SYSTEM',
        title: 'Welcome to Leave The Room!',
        body: `Your account is created! You can request profile verification anytime from your profile tab.`,
        read: false,
        createdAt: nowIso,
      });

      return NextResponse.json({
        persona: sanitizePersona(newPersona),
        personas: sanitizePersonas(db.personas),
        notifications: db.notifications,
      });
    }

    if (action === 'LOGIN') {
      const { emailOrName, password, userId } = body as {
        emailOrName?: string;
        password?: string;
        userId?: string;
      };

      const found = db.personas.find(
        (p) =>
          (userId && p.id === userId) ||
          (emailOrName &&
            (p.email?.toLowerCase() === emailOrName.toLowerCase().trim() ||
              p.name.toLowerCase() === emailOrName.toLowerCase().trim()))
      );

      if (!found) {
        return NextResponse.json(
          { error: 'No account found with this email or username. Please create an account.' },
          { status: 404 }
        );
      }

      if (found.isBanned) {
        return NextResponse.json(
          { error: `This account has been suspended by an administrator. Reason: ${found.banReason || 'Policy violation'}` },
          { status: 403 }
        );
      }

      // If user has a password set, strictly require it and verify
      if (found.password) {
        if (!password || found.password !== password.trim()) {
          return NextResponse.json(
            { error: 'Incorrect password. Please try again.' },
            { status: 401 }
          );
        }
      }

      return NextResponse.json({
        persona: sanitizePersona(found),
        personas: sanitizePersonas(db.personas),
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
        if (found.isBanned) {
          return NextResponse.json(
            { error: 'This account has been suspended by an administrator.' },
            { status: 403 }
          );
        }
        found.verified = true;
        found.verificationStatus = 'VERIFIED';
        found.authProvider = 'google';
        if (avatar && !found.avatar.includes('unsplash')) {
          found.avatar = avatar;
        }
        if (userEmail === 'vladtratata10@gmail.com') {
          found.role = 'ADMIN';
        }
      } else {
        const isFounder = userEmail === 'vladtratata10@gmail.com';
        const newUserId = `user-g-${crypto.randomUUID()}`;
        found = {
          id: newUserId,
          email: userEmail,
          name: userName,
          age: 0,
          avatar: userAvatar,
          skillBadge: 'New Member',
          tagline: '',
          neighborhood: 'Select your city',
          onboarded: false,
          verified: true,
          verificationStatus: 'VERIFIED',
          photoVerified: false,
          role: isFounder ? 'ADMIN' : 'USER',
          isBanned: false,
          authProvider: 'google',
          favoriteActivities: ['Coffee', 'Tennis'],
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
            categories: ['Coffee', 'Tennis'],
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
          id: `notif-${crypto.randomUUID()}`,
          userId: newUserId,
          type: 'SYSTEM',
          title: 'Google Sign-In Verified',
          body: `Welcome, ${found.name}! Your account is verified with a 100% Reliability Score.`,
          read: false,
          createdAt: nowIso,
        });
      }

      return NextResponse.json({
        persona: sanitizePersona(found),
        personas: sanitizePersonas(db.personas),
        notifications: db.notifications,
      });
    }

    if (action === 'APPLE_AUTH') {
      const { email, name, avatar } = body as {
        email?: string;
        name?: string;
        avatar?: string;
      };

      const userEmail = (email || 'apple.user@icloud.com').toLowerCase().trim();
      const userName = (name || 'Apple Member').trim();
      const userAvatar =
        avatar ||
        'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80';

      let found = db.personas.find(
        (p) => p.email?.toLowerCase() === userEmail || p.name.toLowerCase() === userName.toLowerCase()
      );

      if (found) {
        if (found.isBanned) {
          return NextResponse.json(
            { error: 'This account has been suspended by an administrator.' },
            { status: 403 }
          );
        }
        found.verified = true;
        found.verificationStatus = 'VERIFIED';
        found.authProvider = 'apple';
      } else {
        const newUserId = `user-a-${crypto.randomUUID()}`;
        found = {
          id: newUserId,
          email: userEmail,
          name: userName,
          age: 25,
          avatar: userAvatar,
          skillBadge: 'Verified Member',
          tagline: 'Signed in with Apple! Down for ping pong, tennis, and co-working.',
          neighborhood: 'Select your city',
          onboarded: false,
          verified: true,
          verificationStatus: 'VERIFIED',
          role: 'USER',
          isBanned: false,
          authProvider: 'apple',
          favoriteActivities: ['Coffee', 'Tennis'],
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
            categories: ['Coffee', 'Tennis'],
            radiusKm: 10,
            note: 'Available for games or coffee',
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
          id: `notif-${crypto.randomUUID()}`,
          userId: newUserId,
          type: 'SYSTEM',
          title: 'Apple Sign-In Verified',
          body: `Welcome, ${found.name}! Your Apple ID account is verified with a 100% Reliability Score.`,
          read: false,
          createdAt: nowIso,
        });
      }

      return NextResponse.json({
        persona: sanitizePersona(found),
        personas: sanitizePersonas(db.personas),
        notifications: db.notifications,
      });
    }

    if (action === 'REQUEST_VERIFICATION') {
      const { note } = body as {
        userId?: string;
        note?: string;
      };
      // Authorize against authenticated session identity:
      const targetUserId =
        authUser!.role === 'ADMIN' && body.userId ? body.userId : authUser!.id;

      const persona = db.personas.find((p) => p.id === targetUserId);
      if (!persona) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      persona.verificationStatus = 'PENDING';
      persona.verificationRequestedAt = nowIso;
      persona.verificationNote = note?.trim() || 'Submitted identity verification request';

      db.notifications = db.notifications || [];
      db.notifications.unshift({
        id: `notif-${crypto.randomUUID()}`,
        userId: targetUserId,
        type: 'SYSTEM',
        title: 'Verification Request Received',
        body: 'Your profile verification is under review by the Leave The Room Admin team.',
        read: false,
        createdAt: nowIso,
      });

      return NextResponse.json({
        persona: sanitizePersona(persona),
        personas: sanitizePersonas(db.personas),
        notifications: db.notifications,
      });
    }

    if (action === 'ADMIN_ACTION') {
      const effectiveRole = authUser!.role || (authUser!.id === 'user-maya' ? 'ADMIN' : 'USER');
      if (effectiveRole !== 'ADMIN') {
        return errorResponse('Admin privileges required', 403, 'FORBIDDEN');
      }

      const {
        subAction,
        targetUserId,
        banReason,
        newRole,
      } = body as {
        adminUserId?: string;
        subAction: 'VERIFY_USER' | 'REVOKE_VERIFICATION' | 'BAN_USER' | 'UNBAN_USER' | 'CHANGE_ROLE' | 'DELETE_USER';
        targetUserId: string;
        banReason?: string;
        newRole?: 'ADMIN' | 'USER';
      };

      const target = db.personas.find((p) => p.id === targetUserId);
      if (!target && subAction !== 'DELETE_USER') {
        return errorResponse('Target user not found', 404);
      }

      if (subAction === 'VERIFY_USER' && target) {
        target.verified = true;
        target.verificationStatus = 'VERIFIED';
        target.reliabilityScore = Math.max(98, target.reliabilityScore);

        db.notifications = db.notifications || [];
        db.notifications.unshift({
          id: `notif-${crypto.randomUUID()}`,
          userId: target.id,
          type: 'SYSTEM',
          title: 'Account Verified!',
          body: 'An admin has approved your profile verification. Your verified badge is now active!',
          read: false,
          createdAt: nowIso,
        });
      } else if (subAction === 'REVOKE_VERIFICATION' && target) {
        target.verified = false;
        target.verificationStatus = 'UNVERIFIED';
      } else if (subAction === 'BAN_USER' && target) {
        target.isBanned = true;
        target.banReason = banReason?.trim() || 'Account suspended by administrator';
      } else if (subAction === 'UNBAN_USER' && target) {
        target.isBanned = false;
        target.banReason = undefined;
      } else if (subAction === 'CHANGE_ROLE' && target && newRole) {
        target.role = newRole;
      } else if (subAction === 'DELETE_USER') {
        db.personas = db.personas.filter((p) => p.id !== targetUserId);
      }

      return NextResponse.json({
        success: true,
        target: target ? sanitizePersona(target) : undefined,
        personas: sanitizePersonas(db.personas),
        notifications: db.notifications,
      });
    }

    if (action === 'UPDATE_PROFILE') {
      const {
        name,
        age,
        avatar,
        skillBadge,
        tagline,
        neighborhood,
        favoriteActivities,
        onboarded,
      } = body as {
        userId?: string;
        name?: string;
        age?: number;
        avatar?: string;
        skillBadge?: string;
        tagline?: string;
        neighborhood?: string;
        favoriteActivities?: ActivityCategory[];
        onboarded?: boolean;
      };

      // Authorize against authenticated session identity:
      const targetUserId =
        authUser!.role === 'ADMIN' && body.userId ? body.userId : authUser!.id;

      const persona = db.personas.find((p) => p.id === targetUserId);
      if (!persona) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      if (name?.trim()) persona.name = name.trim();
      if (persona.onboarded === true) {
        // Locked age once onboarded: ignore any attempt to change age
      } else {
        if (age !== undefined && !isNaN(Number(age))) {
          persona.age = Math.max(18, Math.min(99, Number(age)));
          persona.onboarded = true;
        }
      }
      if (onboarded !== undefined) {
        persona.onboarded = Boolean(onboarded);
      }
      if (avatar?.trim()) persona.avatar = avatar.trim();
      if (skillBadge?.trim()) persona.skillBadge = skillBadge.trim();
      if (tagline?.trim()) persona.tagline = tagline.trim();
      if (neighborhood?.trim()) persona.neighborhood = neighborhood.trim();
      if (Array.isArray(favoriteActivities) && favoriteActivities.length > 0) {
        persona.favoriteActivities = favoriteActivities;
      }
      if (body.photoVerified !== undefined) {
        persona.photoVerified = Boolean(body.photoVerified);
        if (
          persona.photoVerified &&
          persona.avatar &&
          !persona.avatar.includes('unsplash.com') &&
          !persona.avatar.startsWith('data:image/svg+xml')
        ) {
          persona.verified = true;
          persona.verificationStatus = 'VERIFIED';
        } else if (
          !persona.avatar ||
          persona.avatar.includes('unsplash.com') ||
          persona.avatar.startsWith('data:image/svg+xml')
        ) {
          persona.photoVerified = false;
        }
      }
      if (body.selfieVerificationUrl) {
        persona.selfieVerificationUrl = body.selfieVerificationUrl;
      }
      if (Array.isArray(body.savedLobbyIds)) {
        persona.savedLobbyIds = body.savedLobbyIds;
      }

      // Sync participant snapshots across active lobbies
      db.lobbies.forEach((lobby) => {
        lobby.participants.forEach((part) => {
          if (part.id === targetUserId) {
            part.name = persona.name;
            part.age = persona.age;
            part.avatar = persona.avatar;
            part.skillBadge = persona.skillBadge;
            part.tagline = persona.tagline;
          }
        });
      });

      const res = NextResponse.json({
        persona: sanitizePersona(persona),
        personas: sanitizePersonas(db.personas),
        lobbies: db.lobbies,
      });
      if (persona.id === authUser!.id) {
        setSessionCookies(res, persona.id, persona);
      }
      return res;
    }

    if (action === 'UPDATE_SETTINGS') {
      const { settings } = body as {
        userId?: string;
        settings: Partial<UserSettings>;
      };
      // Authorize against authenticated session identity:
      const targetUserId =
        authUser!.role === 'ADMIN' && body.userId ? body.userId : authUser!.id;

      const persona = db.personas.find((p) => p.id === targetUserId);
      if (!persona) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }
      persona.settings = { ...persona.settings, ...settings };
      return NextResponse.json({
        persona: sanitizePersona(persona),
        personas: sanitizePersonas(db.personas),
      });
    }

    if (action === 'TOGGLE_BEACON') {
      // Authorize against authenticated session identity:
      const targetUserId =
        authUser!.role === 'ADMIN' && body.userId ? body.userId : authUser!.id;

      const persona = db.personas.find((p) => p.id === targetUserId);
      if (!persona) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      // Support both nested beacon object and flat fields
      const incomingBeacon = (body.beacon as RadarBeacon) || {
        active: Boolean(body.active),
        categories:
          Array.isArray(body.categories) && body.categories.length > 0
            ? body.categories
            : persona.favoriteActivities,
        radiusKm: Number(body.radiusKm) || persona.beacon?.radiusKm || 5,
        note:
          body.note !== undefined
            ? String(body.note)
            : persona.beacon?.note || 'Ready to play',
      };

      persona.beacon = {
        ...persona.beacon,
        ...incomingBeacon,
        updatedAt: nowIso,
      };

      return NextResponse.json({
        persona: sanitizePersona(persona),
        personas: sanitizePersonas(db.personas),
      });
    }

    if (action === 'RATE_PLAYER') {
      const {
        toUserId,
        lobbyId,
        stars,
        showedUp = true,
        comment = '',
      } = body as {
        fromUserId?: string;
        toUserId: string;
        lobbyId: string;
        stars: number;
        showedUp?: boolean;
        comment?: string;
      };

      // Authorize against authenticated session: caller is strictly fromUserId
      const effectiveFromUserId = authUser!.id;
      if (toUserId === effectiveFromUserId) {
        return errorResponse('You cannot rate yourself', 400);
      }

      const fromUser =
        db.personas.find((p) => p.id === effectiveFromUserId) || authUser!;
      const toUser = db.personas.find((p) => p.id === toUserId);
      const lobby = db.lobbies.find((l) => l.id === lobbyId);

      const clampedStars = Math.max(1, Math.min(5, Number(stars) || 5));

      const newRating: PlayerRating = {
        id: `rate-${crypto.randomUUID()}`,
        fromUserId: effectiveFromUserId,
        fromUserName: fromUser.name || 'Player',
        fromUserAvatar:
          fromUser.avatar ||
          'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        toUserId,
        lobbyId,
        lobbyTitle: lobby?.title || 'Recent Meetup',
        stars: clampedStars,
        showedUp,
        comment:
          comment.trim() ||
          (showedUp ? 'Showed up on time, great session!' : 'Missed session'),
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
          id: `notif-${crypto.randomUUID()}`,
          userId: toUserId,
          type: 'RATING',
          title: `New ${clampedStars}-Star Review from ${fromUser.name || 'Player'}`,
          body: newRating.comment,
          lobbyId,
          read: false,
          createdAt: nowIso,
        });
      }

      return NextResponse.json({
        rating: newRating,
        personas: sanitizePersonas(db.personas),
        ratings: db.ratings,
        notifications: db.notifications,
        lobbies: db.lobbies,
      });
    }

    if (action === 'BAN_USER' || action === 'UNBAN_USER') {
      const { targetUserId, lobbyId } = body as {
        userId?: string;
        targetUserId: string;
        lobbyId?: string;
      };

      // Authorize against authenticated session identity:
      const actorId =
        authUser!.role === 'ADMIN' && body.userId ? body.userId : authUser!.id;

      const persona = db.personas.find((p) => p.id === actorId);
      if (!persona) {
        return NextResponse.json({ error: 'User not found' }, { status: 404 });
      }

      if (action === 'BAN_USER' && lobbyId) {
        const targetLobby = db.lobbies.find((l) => l.id === lobbyId);
        if (
          targetLobby &&
          targetLobby.hostId !== authUser!.id &&
          authUser!.role !== 'ADMIN'
        ) {
          return errorResponse(
            'Only the host or an administrator can ban users from this meetup',
            403,
            'FORBIDDEN'
          );
        }
      }

      persona.bannedUserIds = persona.bannedUserIds || [];

      if (action === 'BAN_USER') {
        if (!persona.bannedUserIds.includes(targetUserId)) {
          persona.bannedUserIds.push(targetUserId);
        }
        // Also remove targetUserId from any lobbies hosted by actor or the specified lobbyId
        db.lobbies.forEach((l) => {
          if (l.hostId === actorId || l.id === lobbyId) {
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
          if (l.hostId === actorId && Array.isArray(l.bannedUserIds)) {
            l.bannedUserIds = l.bannedUserIds.filter((id) => id !== targetUserId);
          }
        });
      }

      const res = NextResponse.json({
        persona: sanitizePersona(persona),
        personas: sanitizePersonas(db.personas),
        lobbies: db.lobbies,
      });
      if (persona.id === authUser!.id) {
        setSessionCookies(res, persona.id, persona);
      }
      return res;
    }

    if (action === 'TOGGLE_REGULAR_PARTNER') {
      const { partnerId } = body as {
        userId?: string;
        partnerId: string;
      };
      // Authorize against authenticated session identity:
      const targetUserId =
        authUser!.role === 'ADMIN' && body.userId ? body.userId : authUser!.id;

      const persona = db.personas.find((p) => p.id === targetUserId);
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
      return NextResponse.json({
        persona: sanitizePersona(persona),
        personas: sanitizePersonas(db.personas),
      });
    }

    if (action === 'MARK_NOTIFICATIONS_READ') {
      // Authorize against authenticated session identity:
      const targetUserId =
        authUser!.role === 'ADMIN' && body.userId ? body.userId : authUser!.id;

      db.notifications = (db.notifications || []).map((n) =>
        n.userId === targetUserId ? { ...n, read: true } : n
      );
      return NextResponse.json({ notifications: db.notifications });
    }

    if (action === 'SEND_FRIEND_REQUEST') {
      const { targetUserId } = body as { targetUserId: string };
      if (!targetUserId || targetUserId === authUser!.id) {
        return errorResponse('Invalid target user for friend request', 400);
      }

      const caller = db.personas.find((p) => p.id === authUser!.id);
      const target = db.personas.find((p) => p.id === targetUserId);
      if (!caller) return errorResponse('Caller not found', 404);
      if (!target) return errorResponse('Target user not found', 404);

      caller.friendIds = caller.friendIds || [];
      caller.outgoingFriendRequestIds = caller.outgoingFriendRequestIds || [];
      caller.incomingFriendRequestIds = caller.incomingFriendRequestIds || [];
      target.friendIds = target.friendIds || [];
      target.outgoingFriendRequestIds = target.outgoingFriendRequestIds || [];
      target.incomingFriendRequestIds = target.incomingFriendRequestIds || [];

      db.notifications = db.notifications || [];

      // If already friends, return current state
      if (caller.friendIds.includes(targetUserId)) {
        return NextResponse.json({
          persona: sanitizePersona(caller),
          personas: sanitizePersonas(db.personas),
          notifications: db.notifications,
        });
      }

      // If target already sent caller a friend request, auto-accept both into friendIds!
      if (caller.incomingFriendRequestIds.includes(targetUserId)) {
        caller.incomingFriendRequestIds = caller.incomingFriendRequestIds.filter((id) => id !== targetUserId);
        target.outgoingFriendRequestIds = target.outgoingFriendRequestIds.filter((id) => id !== caller.id);

        if (!caller.friendIds.includes(targetUserId)) caller.friendIds.push(targetUserId);
        if (!target.friendIds.includes(caller.id)) target.friendIds.push(caller.id);

        caller.regularPartnerIds = caller.regularPartnerIds || [];
        target.regularPartnerIds = target.regularPartnerIds || [];
        if (!caller.regularPartnerIds.includes(targetUserId)) caller.regularPartnerIds.push(targetUserId);
        if (!target.regularPartnerIds.includes(caller.id)) target.regularPartnerIds.push(caller.id);

        db.notifications.unshift({
          id: `notif-${crypto.randomUUID()}`,
          userId: targetUserId,
          type: 'FRIEND_ACCEPTED',
          title: 'Friend Request Accepted',
          body: `${caller.name} accepted your friend request! You can now send direct messages.`,
          read: false,
          createdAt: nowIso,
        });
      } else {
        if (!caller.outgoingFriendRequestIds.includes(targetUserId)) {
          caller.outgoingFriendRequestIds.push(targetUserId);
        }
        if (!target.incomingFriendRequestIds.includes(caller.id)) {
          target.incomingFriendRequestIds.push(caller.id);
        }

        db.notifications.unshift({
          id: `notif-${crypto.randomUUID()}`,
          userId: targetUserId,
          type: 'FRIEND_REQUEST',
          title: 'New Friend Request',
          body: `${caller.name} sent you a friend request!`,
          read: false,
          createdAt: nowIso,
        });
      }

      return NextResponse.json({
        persona: sanitizePersona(caller),
        personas: sanitizePersonas(db.personas),
        notifications: db.notifications,
      });
    }

    if (action === 'ACCEPT_FRIEND_REQUEST') {
      const { targetUserId } = body as { targetUserId: string };
      if (!targetUserId || targetUserId === authUser!.id) {
        return errorResponse('Invalid target user', 400);
      }

      const caller = db.personas.find((p) => p.id === authUser!.id);
      const target = db.personas.find((p) => p.id === targetUserId);
      if (!caller) return errorResponse('Caller not found', 404);
      if (!target) return errorResponse('Target user not found', 404);

      caller.friendIds = caller.friendIds || [];
      caller.incomingFriendRequestIds = caller.incomingFriendRequestIds || [];
      caller.outgoingFriendRequestIds = caller.outgoingFriendRequestIds || [];
      caller.regularPartnerIds = caller.regularPartnerIds || [];

      target.friendIds = target.friendIds || [];
      target.incomingFriendRequestIds = target.incomingFriendRequestIds || [];
      target.outgoingFriendRequestIds = target.outgoingFriendRequestIds || [];
      target.regularPartnerIds = target.regularPartnerIds || [];

      caller.incomingFriendRequestIds = caller.incomingFriendRequestIds.filter((id) => id !== targetUserId);
      caller.outgoingFriendRequestIds = caller.outgoingFriendRequestIds.filter((id) => id !== targetUserId);
      target.incomingFriendRequestIds = target.incomingFriendRequestIds.filter((id) => id !== caller.id);
      target.outgoingFriendRequestIds = target.outgoingFriendRequestIds.filter((id) => id !== caller.id);

      if (!caller.friendIds.includes(targetUserId)) caller.friendIds.push(targetUserId);
      if (!target.friendIds.includes(caller.id)) target.friendIds.push(caller.id);
      if (!caller.regularPartnerIds.includes(targetUserId)) caller.regularPartnerIds.push(targetUserId);
      if (!target.regularPartnerIds.includes(caller.id)) target.regularPartnerIds.push(caller.id);

      db.notifications = db.notifications || [];
      db.notifications.unshift({
        id: `notif-${crypto.randomUUID()}`,
        userId: targetUserId,
        type: 'FRIEND_ACCEPTED',
        title: 'Friend Request Accepted',
        body: `${caller.name} accepted your friend request! You can now send direct messages.`,
        read: false,
        createdAt: nowIso,
      });

      return NextResponse.json({
        persona: sanitizePersona(caller),
        personas: sanitizePersonas(db.personas),
        notifications: db.notifications,
      });
    }

    if (action === 'DECLINE_OR_REMOVE_FRIEND') {
      const { targetUserId } = body as { targetUserId: string };
      if (!targetUserId) {
        return errorResponse('Target user ID is required', 400);
      }

      const caller = db.personas.find((p) => p.id === authUser!.id);
      const target = db.personas.find((p) => p.id === targetUserId);
      if (!caller) return errorResponse('Caller not found', 404);

      caller.friendIds = (caller.friendIds || []).filter((id) => id !== targetUserId);
      caller.incomingFriendRequestIds = (caller.incomingFriendRequestIds || []).filter((id) => id !== targetUserId);
      caller.outgoingFriendRequestIds = (caller.outgoingFriendRequestIds || []).filter((id) => id !== targetUserId);

      if (target) {
        target.friendIds = (target.friendIds || []).filter((id) => id !== caller.id);
        target.incomingFriendRequestIds = (target.incomingFriendRequestIds || []).filter((id) => id !== caller.id);
        target.outgoingFriendRequestIds = (target.outgoingFriendRequestIds || []).filter((id) => id !== caller.id);
      }

      return NextResponse.json({
        persona: sanitizePersona(caller),
        personas: sanitizePersonas(db.personas),
      });
    }

    if (action === 'SEND_DIRECT_MESSAGE') {
      const { toUserId, text, lobbyInviteId } = body as {
        toUserId: string;
        text: string;
        lobbyInviteId?: string;
      };

      if (!toUserId || toUserId === authUser!.id) {
        return errorResponse('Valid recipient is required', 400);
      }
      if (!text || !text.trim()) {
        return errorResponse('Message text is required', 400);
      }

      const caller = db.personas.find((p) => p.id === authUser!.id) || authUser!;
      const target = db.personas.find((p) => p.id === toUserId);
      if (!target) {
        return errorResponse('Recipient user not found', 404);
      }

      const newMsg: DirectMessage = {
        id: `dm-${crypto.randomUUID()}`,
        fromUserId: caller.id,
        toUserId,
        senderName: caller.name || 'Friend',
        senderAvatar: caller.avatar || '',
        text: text.trim(),
        lobbyInviteId: lobbyInviteId?.trim() || undefined,
        createdAt: nowIso,
        read: false,
      };

      db.directMessages = db.directMessages || [];
      db.directMessages.push(newMsg);

      db.notifications = db.notifications || [];
      db.notifications.unshift({
        id: `notif-${crypto.randomUUID()}`,
        userId: toUserId,
        type: 'DIRECT_MESSAGE',
        title: `Direct Message from ${caller.name || 'Friend'}`,
        body: text.trim().length > 80 ? `${text.trim().slice(0, 77)}...` : text.trim(),
        read: false,
        createdAt: nowIso,
      });

      return NextResponse.json({
        message: newMsg,
        directMessages: db.directMessages,
        notifications: db.notifications,
      });
    }

    if (action === 'TOGGLE_SAVE_LOBBY') {
      const { lobbyId } = body as { lobbyId: string };
      if (!lobbyId || !lobbyId.trim()) {
        return errorResponse('Lobby ID is required', 400);
      }

      const caller = db.personas.find((p) => p.id === authUser!.id);
      if (!caller) return errorResponse('Caller not found', 404);

      caller.savedLobbyIds = caller.savedLobbyIds || [];
      if (caller.savedLobbyIds.includes(lobbyId)) {
        caller.savedLobbyIds = caller.savedLobbyIds.filter((id) => id !== lobbyId);
      } else {
        caller.savedLobbyIds.push(lobbyId);
      }

      return NextResponse.json({
        persona: sanitizePersona(caller),
        personas: sanitizePersonas(db.personas),
      });
    }

    if (action === 'SUBMIT_PHOTO_VERIFICATION') {
      const { avatar, selfieDataUrl } = body as {
        avatar?: string;
        selfieDataUrl?: string;
      };

      const persona = db.personas.find((p) => p.id === authUser!.id);
      if (!persona) return errorResponse('User not found', 404);

      if (avatar && avatar.trim()) {
        persona.avatar = avatar.trim();
      }
      persona.selfieVerificationUrl = selfieDataUrl || persona.avatar;
      persona.photoVerified = true;
      persona.verified = true;
      persona.verificationStatus = 'VERIFIED';
      persona.verificationSubmittedAt = nowIso;

      // Sync avatar across active lobbies
      db.lobbies.forEach((lobby) => {
        lobby.participants.forEach((part) => {
          if (part.id === persona.id) {
            part.avatar = persona.avatar;
          }
        });
      });

      const res = NextResponse.json({
        persona: sanitizePersona(persona),
        personas: sanitizePersonas(db.personas),
      });
      setSessionCookies(res, persona.id, persona);
      return res;
    }

    return NextResponse.json({ error: 'Unsupported action' }, { status: 400 });
    });
  } catch (err) {
    if (err instanceof AuthError) {
      return errorResponse(err.message, err.status, err.code);
    }
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'User action failed' },
      { status: 500 }
    );
  }
}
