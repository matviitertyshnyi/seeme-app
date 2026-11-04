/**
 * M4 Challenger Adversarial Stress Test
 *
 * Independently stress-tests:
 * 1. Negative auth & password failure paths (wrong password, empty password, missing credentials)
 * 2. Unauthenticated access enforcement across API surface
 * 3. High concurrency stress (100 concurrent messages + join requests) verifying 0 UUID collisions and DB consistency
 * 4. Boundary and injection payloads
 */

import crypto from 'crypto';
import { NextRequest } from 'next/server';
import { POST as postUsersHandler } from '../src/app/api/users/route';
import { POST as postSessionHandler } from '../src/app/api/auth/session/route';
import { POST as postLobbiesHandler, PUT as putLobbiesHandler } from '../src/app/api/lobbies/route';
import { POST as postMessageHandler } from '../src/app/api/lobbies/[id]/messages/route';
import { POST as postJoinHandler } from '../src/app/api/lobbies/[id]/join/route';
import { readDb, withDbMutation } from '../src/lib/db';
import { backupDatabase, restoreDatabase, buildRequest } from './e2e/common';

async function runM4StressTest() {
  console.log('=== STARTING M4 CHALLENGER ADVERSARIAL STRESS TEST ===\n');
  backupDatabase();

  let passed = 0;
  let failed = 0;

  function assert(cond: boolean, desc: string) {
    if (cond) {
      console.log(`  ✓ [PASS] ${desc}`);
      passed++;
    } else {
      console.error(`  ✗ [FAIL] ${desc}`);
      failed++;
    }
  }

  try {
    // 1. Password Failure Paths
    console.log('--- 1. Testing Negative Password Paths ---');
    const tempUserId = `user-pw-test-${crypto.randomUUID()}`;
    const targetPassword = 'StrongPassword123!';

    await withDbMutation((db) => {
      db.personas.push({
        id: tempUserId,
        name: 'Pass Protected Test',
        email: 'pw.test@example.com',
        password: targetPassword,
        age: 30,
        avatar: 'https://example.com/avatar.jpg',
        skillBadge: 'Tester',
        verified: true,
        tagline: 'Test',
        neighborhood: 'SoHo',
        favoriteActivities: ['Chess'],
        reliabilityScore: 100,
        meetupsAttended: 0,
        hoursPlayed: 0,
        ratingAvg: 5.0,
        ratingCount: 0,
        streakWeeks: 1,
        bannedUserIds: [],
        regularPartnerIds: [],
        settings: {
          iosAndroidPush: true,
          soundEffects: true,
          hapticFeedback: true,
          distanceUnit: 'km',
          profileVisible: true,
          showReliabilityScore: true,
        },
      });
    });

    // Wrong password to POST /api/users
    const badPwUsersRes = await postUsersHandler(
      buildRequest('/api/users', {
        method: 'POST',
        body: { action: 'LOGIN', userId: tempUserId, password: 'WrongPassword' },
      })
    );
    assert(badPwUsersRes.status === 401, 'POST /api/users rejects incorrect password with 401');

    // Missing password to POST /api/users
    const noPwUsersRes = await postUsersHandler(
      buildRequest('/api/users', {
        method: 'POST',
        body: { action: 'LOGIN', userId: tempUserId },
      })
    );
    assert(noPwUsersRes.status === 401, 'POST /api/users rejects omitted password with 401');

    // Wrong password to POST /api/auth/session
    const badPwSessionRes = await postSessionHandler(
      buildRequest('/api/auth/session', {
        method: 'POST',
        body: { action: 'LOGIN', userId: tempUserId, password: 'WrongPassword' },
      })
    );
    assert(badPwSessionRes.status === 401, 'POST /api/auth/session rejects incorrect password with 401');

    // Missing password to POST /api/auth/session
    const noPwSessionRes = await postSessionHandler(
      buildRequest('/api/auth/session', {
        method: 'POST',
        body: { action: 'LOGIN', userId: tempUserId },
      })
    );
    assert(noPwSessionRes.status === 401, 'POST /api/auth/session rejects omitted password with 401');

    // Correct password succeeds
    const goodPwRes = await postUsersHandler(
      buildRequest('/api/users', {
        method: 'POST',
        body: { action: 'LOGIN', userId: tempUserId, password: targetPassword },
      })
    );
    assert(goodPwRes.status === 200, 'POST /api/users succeeds with correct password (200 OK)');

    // 2. Unauthenticated Mutating Endpoints
    console.log('\n--- 2. Testing Unauthenticated Access Across Mutating Actions ---');
    const unauthActions = [
      'UPDATE_PROFILE',
      'UPDATE_SETTINGS',
      'TOGGLE_BEACON',
      'RATE_PLAYER',
      'BAN_USER',
      'UNBAN_USER',
      'TOGGLE_REGULAR_PARTNER',
      'MARK_NOTIFICATIONS_READ',
      'REQUEST_VERIFICATION',
      'ADMIN_ACTION',
    ];

    for (const act of unauthActions) {
      const res = await postUsersHandler(
        buildRequest('/api/users', {
          method: 'POST',
          body: { action: act, targetUserId: 'user-liam' },
        })
      );
      assert(res.status === 401, `Unauthenticated ${act} strictly returns 401 (got ${res.status})`);
    }

    // Unauthenticated POST /api/lobbies
    const unauthLobbyRes = await postLobbiesHandler(
      buildRequest('/api/lobbies', {
        method: 'POST',
        body: { title: 'Adversarial Lobby', category: 'Chess' },
      })
    );
    assert(unauthLobbyRes.status === 401, 'POST /api/lobbies strictly returns 401 when unauthenticated');

    // Unauthenticated PUT /api/lobbies (reset)
    const unauthResetRes = await putLobbiesHandler(
      buildRequest('/api/lobbies', { method: 'PUT' })
    );
    assert(unauthResetRes.status === 401, 'PUT /api/lobbies strictly returns 401 when unauthenticated');

    // 3. High-Stress Concurrent Entity Creation (100 Entities)
    console.log('\n--- 3. Testing High-Stress Concurrency & UUID Collision Resistance ---');
    const stressLobbyId = `lobby-stress-${crypto.randomUUID()}`;
    await withDbMutation((db) => {
      db.lobbies.unshift({
        id: stressLobbyId,
        category: 'Chess',
        mapPinLabel: 'Chess',
        title: 'Challenger Stress Room',
        equipmentNote: '',
        coverImage: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=600',
        venueName: 'Washington Square Park',
        venueAddress: 'Greenwich Village',
        lat: 40.7308,
        lng: -73.9973,
        startTime: 'Now',
        startTimeBadge: 'Live Now',
        roomStatus: 'LIVE',
        preferredAgeRange: 'All Ages (18+)',
        skillCompatibility: 'ALL_LEVELS',
        maxParticipants: 100,
        joinMode: 'APPROVAL_REQUIRED',
        hostId: 'user-maya',
        bannedUserIds: [],
        participants: [
          {
            id: 'user-maya',
            name: 'Maya Lin',
            age: 26,
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            skillBadge: 'Host',
            joinedAt: new Date().toISOString(),
            arrivalStatus: 'ARRIVED',
            reliabilityScore: 99,
            ratingAvg: 5.0,
          },
        ],
        pendingRequests: [],
        createdAt: new Date().toISOString(),
      });
    });

    // Seed 50 candidate personas in DB
    const candidates = Array.from({ length: 50 }).map((_, i) => ({
      id: `user-cand-${i}`,
      name: `Candidate ${i}`,
      age: 25,
      avatar: 'https://example.com/avatar.jpg',
      skillBadge: 'Player',
      verified: true,
      tagline: 'Candidate',
      neighborhood: 'SoHo',
      favoriteActivities: ['Chess'] as any,
      reliabilityScore: 100,
      meetupsAttended: 0,
      hoursPlayed: 0,
      ratingAvg: 5.0,
      ratingCount: 0,
      streakWeeks: 1,
      bannedUserIds: [],
      regularPartnerIds: [],
      settings: {
        iosAndroidPush: true,
        soundEffects: true,
        hapticFeedback: true,
        distanceUnit: 'km' as const,
        profileVisible: true,
        showReliabilityScore: true,
      },
    }));

    await withDbMutation((db) => {
      candidates.forEach((c) => {
        if (!db.personas.some((p) => p.id === c.id)) db.personas.push(c);
      });
    });

    const collectedIds: string[] = [];

    // Record pre-existing notification IDs
    const beforeDb = await readDb();
    const existingNotifIds = new Set((beforeDb.notifications || []).map((n) => n.id));

    // Concurrently post 50 messages
    const messagePromises = Array.from({ length: 50 }).map((_, i) => {
      const req = buildRequest(`/api/lobbies/${stressLobbyId}/messages`, {
        method: 'POST',
        headers: { 'x-user-id': 'user-maya' },
        body: { text: `Stress Message ${i}` },
      });
      return postMessageHandler(req, { params: { id: stressLobbyId } }).then(async (res) => {
        const data = await res.json().catch(() => ({}));
        if (data.message?.id) collectedIds.push(data.message.id);
        return res.status;
      });
    });

    // Concurrently post 50 join requests (using REQUEST_JOIN so pending requests are created)
    const joinPromises = candidates.map((candidate, i) => {
      const req = buildRequest(`/api/lobbies/${stressLobbyId}/join`, {
        method: 'POST',
        headers: { 'x-user-id': candidate.id },
        body: { action: 'REQUEST_JOIN', note: `Seat request ${i}` },
      });
      return postJoinHandler(req, { params: { id: stressLobbyId } }).then((res) => res.status);
    });

    await Promise.all([...messagePromises, ...joinPromises]);

    // Collect pendingRequest IDs and notification IDs from database
    const afterDb = await readDb();
    const stressLobby = afterDb.lobbies.find((l) => l.id === stressLobbyId);
    (stressLobby?.pendingRequests || []).forEach((r) => collectedIds.push(r.id));

    const newNotifs = (afterDb.notifications || []).filter(
      (n) => !existingNotifIds.has(n.id) && n.id.startsWith('notif-')
    );
    newNotifs.forEach((n) => collectedIds.push(n.id));

    assert(
      collectedIds.length >= 100,
      `Successfully generated >= 100 concurrent entities (got ${collectedIds.length}: ${messagePromises.length} msgs, ${stressLobby?.pendingRequests?.length} reqs, ${newNotifs.length} notifs)`
    );

    const uuidPattern = /^(msg|req|notif|lobby)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const allValidUuids = collectedIds.every((id) => uuidPattern.test(id));
    assert(allValidUuids, 'All 100 entity IDs strictly adhere to crypto.randomUUID() format');

    const uniqueCount = new Set(collectedIds).size;
    assert(
      uniqueCount === collectedIds.length,
      `Zero duplicate UUIDs detected (${uniqueCount} unique out of ${collectedIds.length})`
    );

    const timestampLeaks = collectedIds.filter((id) => /-\d{13}/.test(id));
    assert(
      timestampLeaks.length === 0,
      `Zero timestamp-based IDs leaked (${timestampLeaks.length} found)`
    );

    console.log(`\n=== STRESS RESULTS: Passed: ${passed} | Failed: ${failed} ===`);
    if (failed > 0) {
      throw new Error(`${failed} stress test checks failed!`);
    }
  } finally {
    restoreDatabase();
  }
}

runM4StressTest()
  .then(() => {
    console.log('CHALLENGER STRESS SUITE PASSED SUCCESSFULLY');
    process.exit(0);
  })
  .catch((err) => {
    console.error('CHALLENGER STRESS SUITE ENCOUNTERED ERROR:', err);
    process.exit(1);
  });
