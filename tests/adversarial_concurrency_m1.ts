/**
 * Adversarial Concurrency, Mutex & ID Collision Stress Test Suite
 * Milestone M1 Empirical Verification
 */
import { NextRequest } from 'next/server';
import crypto from 'crypto';
import fs from 'fs';
import path from 'path';
import { readDb, writeDb, withDbMutation } from '../src/lib/db';
import { DatabaseSchema, Lobby, Participant, UserPersona } from '../src/types/lobby';

// Endpoints under test
import { POST as postLegacyMessage, GET as getLegacyMessages } from '../src/app/api/lobbies/[id]/messages/route';
import { POST as postLegacyJoin } from '../src/app/api/lobbies/[id]/join/route';
import { PUT as putUserProfile, GET as getUserProfile } from '../src/app/api/users/profile/route';
import { POST as postMeetupJoin } from '../src/app/api/meetups/[id]/join/route';
import { POST as postUsersAction } from '../src/app/api/users/route';
import { POST as postLobbies } from '../src/app/api/lobbies/route';

// ============================================================================
// TEST HARNESS ASSERTION SYSTEM
// ============================================================================

let totalAssertions = 0;
let passedAssertions = 0;
const failureList: string[] = [];

function assert(condition: boolean, testName: string, detail?: string) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    failureList.push(`${testName}${detail ? ` -> ${detail}` : ''}`);
    console.error(`  ✗ [FAIL] ${testName}${detail ? ` -> ${detail}` : ''}`);
  }
}

function makeRequest(
  url: string,
  options: {
    method?: string;
    body?: any;
    userId?: string;
    headers?: Record<string, string>;
  } = {}
): NextRequest {
  const method = options.method || 'GET';
  const headers = new Headers();
  headers.set('content-type', 'application/json');

  if (options.headers) {
    for (const [k, v] of Object.entries(options.headers)) {
      headers.set(k, v);
    }
  }

  if (options.userId) {
    headers.set('x-user-id', options.userId);
  }

  const init: RequestInit = {
    method,
    headers,
  };

  if (options.body !== undefined && method !== 'GET' && method !== 'HEAD') {
    init.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  const fullUrl = url.startsWith('http') ? url : `http://localhost:3000${url.startsWith('/') ? '' : '/'}${url}`;
  return new NextRequest(fullUrl, init as any);
}

// Backup & restore local database
const DB_PATH = path.join(process.cwd(), 'data', 'db.json');
let initialDbSnapshot: string | null = null;

function backupDb() {
  if (fs.existsSync(DB_PATH)) {
    initialDbSnapshot = fs.readFileSync(DB_PATH, 'utf-8');
  }
}

function restoreDb() {
  if (initialDbSnapshot !== null && fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, initialDbSnapshot, 'utf-8');
  }
}

function createTestPersona(id: string, name: string, overrides: Partial<UserPersona> = {}): UserPersona {
  return {
    id,
    name,
    age: 25,
    avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    skillBadge: 'Casual',
    tagline: 'Test persona',
    neighborhood: 'Midtown',
    verified: false,
    verificationStatus: 'UNVERIFIED',
    role: 'USER',
    isBanned: false,
    favoriteActivities: ['Ping Pong', 'Chess'],
    reliabilityScore: 98,
    meetupsAttended: 5,
    hoursPlayed: 10,
    ratingAvg: 4.8,
    ratingCount: 3,
    streakWeeks: 2,
    bannedUserIds: [],
    regularPartnerIds: [],
    beacon: { active: false, categories: [], radiusKm: 10, updatedAt: new Date().toISOString() },
    settings: {
      profileVisible: true,
      showReliabilityScore: true,
      distanceUnit: 'mi',
      iosAndroidPush: false,
      soundEffects: false,
      hapticFeedback: false,
    },
    ...overrides,
  };
}

// ============================================================================
// MAIN ADVERSARIAL RUNNER
// ============================================================================

async function runAdversarialM1() {
  console.log('================================================================================');
  console.log('STARTING EMPIRICAL ADVERSARIAL VERIFICATION: CONCURRENCY, MUTATIONS & ID COLLISIONS');
  console.log('================================================================================\n');

  backupDb();

  try {
    // -------------------------------------------------------------------------
    // CHALLENGE 1: Concurrency Mutex & Transactional Safety (50 Concurrent Requests)
    // -------------------------------------------------------------------------
    console.log('--- CHALLENGE 1: Concurrency Mutex & Transactional Safety (50 Concurrent Requests) ---');

    // 1.1 Provision test users and test lobby in DB
    const testLobbyId = `lobby-concurrency-${Date.now()}`;
    const testUsers: UserPersona[] = [];

    for (let i = 1; i <= 30; i++) {
      const pad = String(i).padStart(2, '0');
      testUsers.push(
        createTestPersona(`user-stress-${pad}`, `Stress User ${pad}`, {
          age: 20 + (i % 20),
          avatar: `https://images.unsplash.com/photo-${1500000000000 + i}?w=150`,
          skillBadge: 'Intermediate',
          tagline: `Initial tagline ${pad}`,
          neighborhood: 'Midtown',
          ratingAvg: 4.9,
          ratingCount: 5,
        })
      );
    }

    const initialParticipants: Participant[] = [
      {
        id: 'user-maya',
        name: 'Maya Lin',
        age: 26,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        skillBadge: 'Host',
        tagline: 'Host',
        joinedAt: new Date().toISOString(),
        arrivalStatus: 'ARRIVED',
        reliabilityScore: 99,
        ratingAvg: 5.0,
      },
    ];

    // Add first 10 test users as existing participants (so they can post messages)
    for (let i = 0; i < 10; i++) {
      initialParticipants.push({
        id: testUsers[i].id,
        name: testUsers[i].name,
        age: testUsers[i].age,
        avatar: testUsers[i].avatar,
        skillBadge: testUsers[i].skillBadge,
        tagline: testUsers[i].tagline,
        joinedAt: new Date().toISOString(),
        arrivalStatus: 'ARRIVED',
        reliabilityScore: testUsers[i].reliabilityScore,
        ratingAvg: testUsers[i].ratingAvg,
      });
    }

    const testLobby: Lobby = {
      id: testLobbyId,
      category: 'Ping Pong',
      mapPinLabel: 'Table Tennis',
      title: 'High-Concurrency Stress Meetup',
      equipmentNote: 'All equipment ready.',
      coverImage: 'https://images.unsplash.com/photo-1534158914592-062992fbe900?w=600',
      venueName: 'Spin Midtown',
      venueAddress: '48 E 23rd St',
      lat: 40.741,
      lng: -73.987,
      startTime: 'Now',
      startTimeBadge: 'Live Now',
      roomStatus: 'LIVE',
      preferredAgeRange: 'All Ages (18+)',
      skillCompatibility: 'ALL_LEVELS',
      maxParticipants: 50,
      joinMode: 'OPEN',
      hostId: 'user-maya',
      bannedUserIds: [],
      participants: initialParticipants,
      pendingRequests: [],
      createdAt: new Date().toISOString(),
    };

    await withDbMutation((db) => {
      testUsers.forEach((u) => {
        if (!db.personas.some((p) => p.id === u.id)) {
          db.personas.push(u);
        }
      });
      db.lobbies.unshift(testLobby);
    });

    console.log('  Seeded test lobby and 30 personas. Preparing 50 simultaneous requests...');

    // Prepare 50 concurrent requests:
    // - 20 requests to POST /api/lobbies/[id]/messages
    // - 15 requests to POST /api/lobbies/[id]/join
    // - 15 requests to PUT /api/users/profile
    const concurrentPromises: Promise<{ endpoint: string; status: number; data: any }>[] = [];
    const expectedMessages: string[] = [];
    const expectedJoinedUserIds: string[] = [];
    const expectedProfileUpdates: { userId: string; tagline: string; neighborhood: string }[] = [];

    // Group A: 20 messages from existing room participants
    for (let i = 0; i < 20; i++) {
      const sender = initialParticipants[i % initialParticipants.length];
      const msgText = `Concurrent msg #${i} from ${sender.name} [nonce-${crypto.randomUUID().slice(0, 8)}]`;
      expectedMessages.push(msgText);

      const req = makeRequest(`/api/lobbies/${testLobbyId}/messages`, {
        method: 'POST',
        userId: sender.id,
        body: { text: msgText },
      });

      concurrentPromises.push(
        postLegacyMessage(req, { params: { id: testLobbyId } }).then(async (res) => {
          const data = await res.json().catch(() => ({}));
          return { endpoint: 'MESSAGES', status: res.status, data };
        })
      );
    }

    // Group B: 15 distinct users joining the open lobby (users index 10 to 24)
    for (let i = 10; i < 25; i++) {
      const joiningUser = testUsers[i];
      expectedJoinedUserIds.push(joiningUser.id);

      const req = makeRequest(`/api/lobbies/${testLobbyId}/join`, {
        method: 'POST',
        userId: joiningUser.id,
        body: { action: 'JOIN' },
      });

      concurrentPromises.push(
        postLegacyJoin(req, { params: { id: testLobbyId } }).then(async (res) => {
          const data = await res.json().catch(() => ({}));
          return { endpoint: 'JOIN', status: res.status, data };
        })
      );
    }

    // Group C: 15 distinct users updating their profile (users index 15 to 29)
    for (let i = 15; i < 30; i++) {
      const targetUser = testUsers[i];
      const newTagline = `Updated tagline #${i} [nonce-${crypto.randomUUID().slice(0, 8)}]`;
      const newNeighborhood = `Neighborhood Zone ${i}`;
      expectedProfileUpdates.push({
        userId: targetUser.id,
        tagline: newTagline,
        neighborhood: newNeighborhood,
      });

      const req = makeRequest('/api/users/profile', {
        method: 'PUT',
        userId: targetUser.id,
        body: {
          tagline: newTagline,
          neighborhood: newNeighborhood,
        },
      });

      concurrentPromises.push(
        putUserProfile(req).then(async (res) => {
          const data = await res.json().catch(() => ({}));
          return { endpoint: 'PROFILE', status: res.status, data };
        })
      );
    }

    assert(concurrentPromises.length === 50, 'Challenge 1: Exactly 50 concurrent requests queued');

    // Fire all 50 simultaneously
    const startTime = Date.now();
    const results = await Promise.allSettled(concurrentPromises);
    const durationMs = Date.now() - startTime;
    console.log(`  Executed 50 concurrent requests across 3 endpoints in ${durationMs}ms.`);

    // 1.2 Verify zero unhandled exceptions
    const rejected = results.filter((r) => r.status === 'rejected');
    assert(rejected.length === 0, 'Challenge 1: Zero unhandled promise rejections', `Found ${rejected.length} rejections`);

    const fulfilled = results
      .filter((r): r is PromiseFulfilledResult<{ endpoint: string; status: number; data: any }> => r.status === 'fulfilled')
      .map((r) => r.value);

    // 1.3 Verify every request succeeded with clean 200/201 HTTP status
    const messageResults = fulfilled.filter((r) => r.endpoint === 'MESSAGES');
    const joinResults = fulfilled.filter((r) => r.endpoint === 'JOIN');
    const profileResults = fulfilled.filter((r) => r.endpoint === 'PROFILE');

    assert(
      messageResults.length === 20 && messageResults.every((r) => r.status === 201),
      'Challenge 1: All 20 concurrent POST /api/lobbies/[id]/messages succeeded with 201'
    );
    assert(
      joinResults.length === 15 && joinResults.every((r) => r.status === 200 && r.data.status === 'JOINED'),
      'Challenge 1: All 15 concurrent POST /api/lobbies/[id]/join succeeded with 200 (JOINED)'
    );
    assert(
      profileResults.length === 15 && profileResults.every((r) => r.status === 200 && r.data.success === true),
      'Challenge 1: All 15 concurrent PUT /api/users/profile succeeded with 200 OK'
    );

    // 1.4 Verify Zero Lost Updates in Persistence Layer
    const verifiedDb = await readDb();
    const persistedLobby = verifiedDb.lobbies.find((l) => l.id === testLobbyId);
    assert(Boolean(persistedLobby), 'Challenge 1: Target lobby found in persisted database');

    // Check all 20 messages exist in db.messages
    const persistedMessages = verifiedDb.messages.filter((m) => m.lobbyId === testLobbyId);
    const allExpectedMessagesPresent = expectedMessages.every((expectedText) =>
      persistedMessages.some((m) => m.text === expectedText)
    );
    assert(
      allExpectedMessagesPresent,
      'Challenge 1: Zero lost updates in messages (all 20 messages persisted in db.messages)',
      `Found ${persistedMessages.length} messages, expected >= 20`
    );

    // Check all 15 joined users exist in lobby.participants
    const allJoinedPresent = expectedJoinedUserIds.every((uid) =>
      persistedLobby!.participants.some((p) => p.id === uid)
    );
    assert(
      allJoinedPresent,
      'Challenge 1: Zero lost updates in participants (all 15 joining users persisted in room)',
      `Participant count: ${persistedLobby?.participants.length}`
    );

    // Check all 15 profile updates were applied in db.personas
    const allProfilesUpdated = expectedProfileUpdates.every((up) => {
      const persona = verifiedDb.personas.find((p) => p.id === up.userId);
      return persona && persona.tagline === up.tagline && persona.neighborhood === up.neighborhood;
    });
    assert(
      allProfilesUpdated,
      'Challenge 1: Zero lost updates in user profiles (all 15 profiles reflect updated taglines & neighborhoods)'
    );

    // Check database file is valid JSON and intact
    const rawDisk = fs.readFileSync(DB_PATH, 'utf-8');
    let validJson = false;
    try {
      JSON.parse(rawDisk);
      validJson = true;
    } catch {
      validJson = false;
    }
    assert(validJson, 'Challenge 1: Database file on disk remains 100% valid, uncorrupted JSON');


    // -------------------------------------------------------------------------
    // CHALLENGE 2: Capacity Ceiling Stress Test (10 Simultaneous Joins on 3/4 Room)
    // -------------------------------------------------------------------------
    console.log('\n--- CHALLENGE 2: Capacity Ceiling Stress Test (10 Simultaneous Joins on 3/4 Room) ---');

    // 2.1 Setup a lobby with maxParticipants: 4 and exactly 3 participants (1 seat open)
    const capLobbyId = `lobby-cap-stress-${Date.now()}`;
    const capCandidates: UserPersona[] = [];
    for (let i = 1; i <= 10; i++) {
      const pad = String(i).padStart(2, '0');
      capCandidates.push(
        createTestPersona(`user-cap-cand-${pad}`, `Candidate ${pad}`, {
          avatar: `https://images.unsplash.com/photo-${1510000000000 + i}?w=150`,
          skillBadge: 'Casual',
          tagline: `Candidate ${pad}`,
        })
      );
    }

    const capLobby: Lobby = {
      id: capLobbyId,
      category: 'Chess',
      mapPinLabel: 'Chess',
      title: 'Capacity Ceiling Verification Meetup',
      equipmentNote: 'Clocks and boards ready.',
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
      maxParticipants: 4, // Strict ceiling of 4
      joinMode: 'OPEN',
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
        {
          id: 'user-liam',
          name: 'Liam Chen',
          age: 27,
          avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
          skillBadge: 'Active',
          joinedAt: new Date().toISOString(),
          arrivalStatus: 'ON_MY_WAY',
          reliabilityScore: 97,
          ratingAvg: 4.9,
        },
        {
          id: 'user-elena',
          name: 'Elena Rostova',
          age: 25,
          avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
          skillBadge: 'Expert',
          joinedAt: new Date().toISOString(),
          arrivalStatus: 'ON_MY_WAY',
          reliabilityScore: 100,
          ratingAvg: 5.0,
        },
      ],
      pendingRequests: [],
      createdAt: new Date().toISOString(),
    };

    await withDbMutation((db) => {
      capCandidates.forEach((c) => {
        if (!db.personas.some((p) => p.id === c.id)) {
          db.personas.push(c);
        }
      });
      db.lobbies.unshift(capLobby);
    });

    assert(capLobby.participants.length === 3, 'Challenge 2: Initial room capacity set to exactly 3/4');

    // 2.2 Fire 10 simultaneous join requests
    const joinCeilingPromises = capCandidates.map((cand) => {
      const req = makeRequest(`/api/lobbies/${capLobbyId}/join`, {
        method: 'POST',
        userId: cand.id,
        body: { action: 'JOIN' },
      });
      return postLegacyJoin(req, { params: { id: capLobbyId } }).then(async (res) => {
        const body = await res.json().catch(() => ({}));
        return { status: res.status, body, userId: cand.id };
      });
    });

    const capJoinResults = await Promise.all(joinCeilingPromises);

    // 2.3 Assert exactly 1 candidate gets 200 JOINED, and exactly 9 candidates get 400
    const successfulJoins = capJoinResults.filter((r) => r.status === 200 && r.body.status === 'JOINED');
    const capacityErrors = capJoinResults.filter((r) => r.status === 400 && String(r.body.error).includes('capacity'));
    const unhandledErrors = capJoinResults.filter((r) => r.status >= 500);

    assert(
      successfulJoins.length === 1,
      'Challenge 2: Exactly 1 simultaneous candidate claimed the remaining seat (HTTP 200)',
      `Got ${successfulJoins.length} successful joins`
    );
    assert(
      capacityErrors.length === 9,
      'Challenge 2: Exactly 9 simultaneous candidates received HTTP 400 capacity ceiling error',
      `Got ${capacityErrors.length} capacity rejections`
    );
    assert(
      unhandledErrors.length === 0,
      'Challenge 2: Zero unhandled 500 errors during high-contention capacity race'
    );

    // 2.4 Verify room strictly never exceeds maxParticipants (cannot become 5/4, 6/4, or 13/4)
    const dbAfterCapTest = await readDb();
    const finalLobby = dbAfterCapTest.lobbies.find((l) => l.id === capLobbyId);
    assert(
      finalLobby !== undefined && finalLobby.participants.length === 4,
      'Challenge 2: Persisted room participants count is strictly equal to maxParticipants (4/4)',
      `Actual participants count: ${finalLobby?.participants.length}`
    );
    assert(
      finalLobby !== undefined && finalLobby.participants.length <= finalLobby.maxParticipants,
      'Challenge 2: Room strictly never exceeded maxParticipants ceiling under race conditions'
    );

    // 2.5 Secondary stress: Fire another 10 simultaneous join requests on now-full room (4/4)
    const secondWaveCandidates: UserPersona[] = [];
    for (let i = 11; i <= 20; i++) {
      const pad = String(i).padStart(2, '0');
      secondWaveCandidates.push(
        createTestPersona(`user-cap-wave2-${pad}`, `Wave2 Candidate ${pad}`, {
          age: 24,
          avatar: `https://images.unsplash.com/photo-${1520000000000 + i}?w=150`,
          skillBadge: 'Casual',
          tagline: `Wave2 Candidate ${pad}`,
        })
      );
    }

    await withDbMutation((db) => {
      secondWaveCandidates.forEach((c) => {
        if (!db.personas.some((p) => p.id === c.id)) {
          db.personas.push(c);
        }
      });
    });

    const wave2Promises = secondWaveCandidates.map((cand) => {
      const req = makeRequest(`/api/lobbies/${capLobbyId}/join`, {
        method: 'POST',
        userId: cand.id,
        body: { action: 'JOIN' },
      });
      return postLegacyJoin(req, { params: { id: capLobbyId } }).then(async (res) => ({
        status: res.status,
        body: await res.json().catch(() => ({})),
      }));
    });

    const wave2Results = await Promise.all(wave2Promises);
    const wave2AllRejected = wave2Results.every((r) => r.status === 400);
    assert(
      wave2AllRejected && wave2Results.length === 10,
      'Challenge 2: All 10 requests against full room (4/4) strictly rejected with HTTP 400'
    );

    const dbAfterWave2 = await readDb();
    const lobbyAfterWave2 = dbAfterWave2.lobbies.find((l) => l.id === capLobbyId);
    assert(
      lobbyAfterWave2?.participants.length === 4,
      'Challenge 2: Room capacity remains strictly capped at 4/4 after second wave'
    );


    // -------------------------------------------------------------------------
    // CHALLENGE 3: ID Collision Resistance (100+ Rapid Concurrent Entities)
    // -------------------------------------------------------------------------
    console.log('\n--- CHALLENGE 3: ID Collision Resistance (100+ Concurrent Entities) ---');

    // Concurrently generate 100+ entities across messages, join requests, and notifications
    // in the same millisecond.
    const idTestLobbyId = `lobby-id-stress-${Date.now()}`;
    const idTestLobby: Lobby = {
      id: idTestLobbyId,
      category: 'Chess',
      mapPinLabel: 'Chess',
      title: 'ID Collision Test Lobby',
      equipmentNote: 'Testing IDs',
      coverImage: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=600',
      venueName: 'Union Square',
      venueAddress: '14th St',
      lat: 40.7359,
      lng: -73.9911,
      startTime: 'Now',
      startTimeBadge: 'Live Now',
      roomStatus: 'LIVE',
      preferredAgeRange: 'All Ages (18+)',
      skillCompatibility: 'ALL_LEVELS',
      maxParticipants: 200,
      joinMode: 'APPROVAL_REQUIRED', // Requests create req- IDs and notif- IDs
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
    };

    // Prepare 60 unique candidate users for join requests
    const idUsers: UserPersona[] = [];
    for (let i = 1; i <= 60; i++) {
      const pad = String(i).padStart(3, '0');
      idUsers.push(
        createTestPersona(`user-idgen-${pad}`, `ID Gen Tester ${pad}`, {
          skillBadge: 'Active',
          tagline: 'ID Tester',
        })
      );
    }

    await withDbMutation((db) => {
      idUsers.forEach((u) => {
        if (!db.personas.some((p) => p.id === u.id)) {
          db.personas.push(u);
        }
      });
      db.lobbies.unshift(idTestLobby);
    });

    const collectedEntityIds: string[] = [];

    // Generator 1: 50 concurrent messages posted simultaneously
    const msgPromises = Array.from({ length: 50 }).map((_, idx) => {
      const req = makeRequest(`/api/lobbies/${idTestLobbyId}/messages`, {
        method: 'POST',
        userId: 'user-maya',
        body: { text: `ID Collision Stress Message #${idx}` },
      });
      return postLegacyMessage(req, { params: { id: idTestLobbyId } }).then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (body.message?.id) collectedEntityIds.push(body.message.id);
        if (body.data?.message?.id) collectedEntityIds.push(body.data.message.id);
      });
    });

    // Generator 2: 50 concurrent join requests submitted simultaneously on APPROVAL_REQUIRED lobby
    // This generates `req-` IDs for pending requests and `notif-` IDs for host notifications
    const joinReqPromises = idUsers.slice(0, 50).map((u, idx) => {
      const req = makeRequest(`/api/lobbies/${idTestLobbyId}/join`, {
        method: 'POST',
        userId: u.id,
        body: { action: 'REQUEST_JOIN', note: `Request from candidate ${idx}` },
      });
      return postLegacyJoin(req, { params: { id: idTestLobbyId } }).then(async (res) => {
        const body = await res.json().catch(() => ({}));
        // Look up generated request id from lobby or notifications
      });
    });

    // Generator 3: 20 concurrent notifications via user actions (e.g., TOGGLE_REGULAR_PARTNER)
    const notifPromises = idUsers.slice(0, 20).map((u) => {
      const req = makeRequest('/api/users', {
        method: 'POST',
        userId: u.id,
        body: { action: 'TOGGLE_REGULAR_PARTNER', targetUserId: 'user-maya' },
      });
      return postUsersAction(req);
    });

    // Snapshot existing IDs before running entity generation
    const dbBeforeIdTest = await readDb();
    const existingNotifIds = new Set(dbBeforeIdTest.notifications.map((n) => n.id));
    const existingMsgIds = new Set(dbBeforeIdTest.messages.map((m) => m.id));

    // Fire all message, request, and notification generators simultaneously in parallel
    await Promise.all([...msgPromises, ...joinReqPromises, ...notifPromises]);

    // Inspect the database for all created entities in this test
    const dbAfterIdTest = await readDb();
    const updatedIdLobby = dbAfterIdTest.lobbies.find((l) => l.id === idTestLobbyId);

    // Collect newly created message IDs for this lobby
    const createdMessages = dbAfterIdTest.messages.filter(
      (m) => m.lobbyId === idTestLobbyId && !existingMsgIds.has(m.id)
    );
    createdMessages.forEach((m) => collectedEntityIds.push(m.id));

    // Collect all pendingRequest IDs for this lobby
    updatedIdLobby?.pendingRequests.forEach((r) => collectedEntityIds.push(r.id));

    // Collect only newly created notification IDs
    const newNotifications = dbAfterIdTest.notifications.filter((n) => !existingNotifIds.has(n.id));
    newNotifications.forEach((n) => collectedEntityIds.push(n.id));

    // Deduplicate array references if collected in both response and db
    const uniqueIds = Array.from(new Set(collectedEntityIds));

    console.log(`  Total generated entity IDs evaluated: ${uniqueIds.length}`);
    assert(
      uniqueIds.length >= 100,
      'Challenge 3: Concurrently generated 100+ entities across messages, requests, and notifications',
      `Generated count: ${uniqueIds.length}`
    );

    // 3.1 Verify uniqueness: Set size MUST strictly equal array length
    const idSet = new Set(uniqueIds);
    assert(
      idSet.size === uniqueIds.length,
      'Challenge 3: Zero ID collisions detected (`Set(ids).size === ids.length`)',
      `Set size: ${idSet.size}, Total count: ${uniqueIds.length}`
    );

    // 3.2 Verify ID Format conforms to UUID-based format (not timestamp-only Date.now())
    const UUID_PATTERN = /[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/i;
    const TIMESTAMP_ONLY_PATTERN = /^(msg|req|notif|lobby|user)-\d{10,}$/;

    const timestampOnlyIds = uniqueIds.filter((id) => TIMESTAMP_ONLY_PATTERN.test(id));
    assert(
      timestampOnlyIds.length === 0,
      'Challenge 3: Zero timestamp-only IDs found (no Date.now() pseudo-identifiers)',
      timestampOnlyIds.length > 0 ? `Collapsible timestamp IDs found: ${timestampOnlyIds.slice(0, 3).join(', ')}` : undefined
    );

    const validUuidIds = uniqueIds.filter((id) => UUID_PATTERN.test(id));
    assert(
      validUuidIds.length === uniqueIds.length,
      'Challenge 3: 100% of generated IDs conform to UUID-based format',
      `Valid UUID IDs: ${validUuidIds.length}/${uniqueIds.length}`
    );

    // -------------------------------------------------------------------------
    // CHALLENGE 4: Transactional Rollback & Error Immunity
    // -------------------------------------------------------------------------
    console.log('\n--- CHALLENGE 4: Transactional Rollback & Error Immunity ---');

    // 4.1 Verify that when a mutator returns an error response (>= 400),
    // changes made in the mutator are NOT written to disk.
    const preRollbackDb = await readDb();
    const testPersona = preRollbackDb.personas[0];
    const originalTagline = testPersona.tagline;

    const rollbackResult = await withDbMutation((db) => {
      const p = db.personas.find((item) => item.id === testPersona.id);
      if (p) {
        p.tagline = 'DIRTY_UNCOMMITTED_MUTATION_SHOULD_ROLL_BACK';
      }
      return { status: 400, error: 'Intentional rollback trigger' };
    });

    assert(rollbackResult.status === 400, 'Challenge 4: Mutator executed with status 400 rejection');

    // Read directly from disk (bypass in-memory cache)
    const diskContentAfterRollback = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')) as DatabaseSchema;
    const personaOnDisk = diskContentAfterRollback.personas.find((p) => p.id === testPersona.id);
    assert(
      personaOnDisk?.tagline === originalTagline,
      'Challenge 4: Transactional rollback verified (dirty mutation was NOT written to disk on error response)'
    );

    // 4.2 Verify that when a mutator throws an exception, lock is cleanly released and disk is untouched
    let threwException = false;
    try {
      await withDbMutation((db) => {
        db.lobbies.unshift({ id: 'DIRTY_LOBBY_FROM_CRASH' } as any);
        throw new Error('Fatal simulated crash inside mutator');
      });
    } catch (err: any) {
      threwException = true;
    }

    assert(threwException, 'Challenge 4: Mutator exception properly propagated to caller');

    // Verify disk does not contain DIRTY_LOBBY_FROM_CRASH
    const diskAfterCrash = JSON.parse(fs.readFileSync(DB_PATH, 'utf-8')) as DatabaseSchema;
    assert(
      !diskAfterCrash.lobbies.some((l) => l.id === 'DIRTY_LOBBY_FROM_CRASH'),
      'Challenge 4: Crash in mutator did NOT write corrupted data to disk'
    );

    // Verify mutex was released and subsequent mutations execute normally
    const subsequentWriteResult = await withDbMutation((db) => {
      return { status: 200, success: true };
    });
    assert(
      subsequentWriteResult.success === true,
      'Challenge 4: Write mutex remains healthy and unblocked after exception'
    );


    // -------------------------------------------------------------------------
    // CHALLENGE 5: Simultaneous LEAVE and JOIN Race on Full Room (4/4)
    // -------------------------------------------------------------------------
    console.log('\n--- CHALLENGE 5: Simultaneous LEAVE and JOIN Race on Full Room (4/4) ---');

    // Room is 4/4 (Maya, Liam, Elena, Wave1 Candidate).
    // Maya is host. Elena is regular participant.
    // Elena calls LEAVE. Simultaneously, 5 new candidates call JOIN.
    const raceLobbyId = capLobbyId;
    const raceCandidates: UserPersona[] = [];
    for (let i = 21; i <= 25; i++) {
      const pad = String(i).padStart(2, '0');
      raceCandidates.push(
        createTestPersona(`user-race-cand-${pad}`, `Race Candidate ${pad}`, {
          age: 26,
          avatar: `https://images.unsplash.com/photo-${1530000000000 + i}?w=150`,
          skillBadge: 'Casual',
          tagline: `Race Candidate ${pad}`,
        })
      );
    }

    await withDbMutation((db) => {
      raceCandidates.forEach((c) => {
        if (!db.personas.some((p) => p.id === c.id)) {
          db.personas.push(c);
        }
      });
    });

    const leaveReq = makeRequest(`/api/lobbies/${raceLobbyId}/join`, {
      method: 'POST',
      userId: 'user-elena',
      body: { action: 'LEAVE', targetUserId: 'user-elena' },
    });

    const raceJoinReqs = raceCandidates.map((c) =>
      makeRequest(`/api/lobbies/${raceLobbyId}/join`, {
        method: 'POST',
        userId: c.id,
        body: { action: 'JOIN' },
      })
    );

    // Fire LEAVE and all 5 JOINs simultaneously
    const raceResponses = await Promise.all([
      postLegacyJoin(leaveReq, { params: { id: raceLobbyId } }).then(async (r) => ({
        type: 'LEAVE',
        status: r.status,
        body: await r.json().catch(() => ({})),
      })),
      ...raceJoinReqs.map((req, idx) =>
        postLegacyJoin(req, { params: { id: raceLobbyId } }).then(async (r) => ({
          type: 'JOIN',
          index: idx,
          status: r.status,
          body: await r.json().catch(() => ({})),
        }))
      ),
    ]);

    const leaveRes = raceResponses.find((r) => r.type === 'LEAVE');
    const joinResList = raceResponses.filter((r) => r.type === 'JOIN');

    assert(leaveRes?.status === 200, 'Challenge 5: Participant successfully left the room');

    const successfulRaceJoins = joinResList.filter((r) => r.status === 200 && r.body.status === 'JOINED');
    const rejectedRaceJoins = joinResList.filter((r) => r.status === 400);

    assert(
      successfulRaceJoins.length === 1,
      'Challenge 5: Exactly 1 candidate claimed the seat opened by the leaving participant',
      `Got ${successfulRaceJoins.length} successful joins`
    );
    assert(
      rejectedRaceJoins.length === 4,
      'Challenge 5: Exactly 4 remaining candidates rejected with HTTP 400 capacity ceiling',
      `Got ${rejectedRaceJoins.length} rejections`
    );

    const dbAfterRace = await readDb();
    const finalRaceLobby = dbAfterRace.lobbies.find((l) => l.id === raceLobbyId);
    assert(
      finalRaceLobby?.participants.length === 4,
      'Challenge 5: Room capacity strictly maintains maxParticipants ceiling (4/4) under mixed leave/join race'
    );
    assert(
      !finalRaceLobby?.participants.some((p) => p.id === 'user-elena'),
      'Challenge 5: Leaving user is no longer in participants'
    );


    // -------------------------------------------------------------------------
    // CHALLENGE 6: Concurrent Mutations on Single User Profile
    // -------------------------------------------------------------------------
    console.log('\n--- CHALLENGE 6: Concurrent Mutations on Single User Profile ---');

    // 20 rapid concurrent profile updates on the exact same user
    const singleUserId = 'user-liam';
    const profileUpdateTokens = Array.from({ length: 20 }).map((_, i) => ({
      tagline: `Liam Tagline Update #${i} [${crypto.randomUUID().slice(0, 6)}]`,
      age: 25 + (i % 5),
    }));

    const singleUserProfilePromises = profileUpdateTokens.map((token) => {
      const req = makeRequest('/api/users/profile', {
        method: 'PUT',
        userId: singleUserId,
        body: {
          tagline: token.tagline,
          age: token.age,
        },
      });
      return putUserProfile(req).then(async (r) => ({
        status: r.status,
        body: await r.json().catch(() => ({})),
      }));
    });

    const singleUserResults = await Promise.all(singleUserProfilePromises);
    const allProfileSucceeded = singleUserResults.every((r) => r.status === 200 && r.body.success === true);

    assert(
      allProfileSucceeded && singleUserResults.length === 20,
      'Challenge 6: All 20 rapid concurrent profile updates on single user succeeded with 200 OK'
    );

    const dbAfterSingleUser = await readDb();
    const liamPersona = dbAfterSingleUser.personas.find((p) => p.id === singleUserId);
    const validFinalTagline = profileUpdateTokens.some((t) => t.tagline === liamPersona?.tagline);
    assert(
      Boolean(liamPersona) && validFinalTagline,
      'Challenge 6: Single user final profile state cleanly matches a valid transaction update without corruption'
    );

    console.log('\n================================================================================');
    console.log(`HARNESS EXECUTION COMPLETE: ${passedAssertions}/${totalAssertions} ASSERTIONS PASSED`);
    console.log('================================================================================\n');

    if (failureList.length > 0) {
      console.error('FAILURES DETECTED:');
      failureList.forEach((f) => console.error(` - ${f}`));
      process.exit(1);
    }
  } finally {
    restoreDb();
    console.log('Restored original database snapshot.');
  }
}

runAdversarialM1().catch((err) => {
  console.error('Adversarial stress test execution crashed:', err);
  process.exit(1);
});
