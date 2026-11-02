import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';
import { readDb, writeDb, resetDb } from '../src/lib/db';
import { POST as createMeetupPost, GET as listMeetupsGet } from '../src/app/api/meetups/route';
import {
  GET as getMeetupDetail,
  PUT as updateMeetupPut,
  DELETE as deleteMeetupDelete,
} from '../src/app/api/meetups/[id]/route';
import { POST as joinMeetupPost } from '../src/app/api/meetups/[id]/join/route';
import {
  GET as getMessagesGet,
  POST as postMessagePost,
} from '../src/app/api/meetups/[id]/messages/route';
import {
  GET as getProfileGet,
  PUT as updateProfilePut,
} from '../src/app/api/users/profile/route';
import {
  GET as getSessionGet,
  POST as postSessionPost,
} from '../src/app/api/auth/session/route';
import { CreateMeetupInputSchema, validatePayload } from '../src/lib/types';

// ============================================================================
// TEST HARNESS & ASSERTIONS
// ============================================================================

let totalAssertions = 0;
let passedAssertions = 0;
const failureList: string[] = [];

function assert(condition: boolean, testName: string, detail?: string) {
  totalAssertions++;
  if (condition) {
    passedAssertions++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failureList.push(`${testName}${detail ? ` (${detail})` : ''}`);
    console.error(`  [FAIL] ${testName} ${detail ? `| Detail: ${detail}` : ''}`);
  }
}

// Helper to construct NextRequest instances
function makeRequest(
  url: string,
  options: {
    method?: string;
    body?: any;
    userId?: string;
    cookie?: string;
    headers?: Record<string, string>;
  } = {}
): NextRequest {
  const method = options.method || 'GET';
  const reqHeaders: Record<string, string> = {
    'content-type': 'application/json',
    ...(options.headers || {}),
  };

  if (options.userId) {
    reqHeaders['x-user-id'] = options.userId;
  }
  if (options.cookie) {
    reqHeaders['cookie'] = options.cookie;
  }

  const reqInit: RequestInit = {
    method,
    headers: reqHeaders,
  };

  if (options.body !== undefined && method !== 'GET' && method !== 'HEAD') {
    reqInit.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  return new NextRequest(new URL(url, 'http://localhost:3000'), reqInit as any);
}

async function runAllSuites() {
  console.log('============================================================');
  console.log('STARTING EMPIRICAL CHALLENGER M2-2 STRESS & ADVERSARIAL SUITE');
  console.log('============================================================');

  // Backup existing data/db.json
  const dbPath = path.join(process.cwd(), 'data', 'db.json');
  let originalDbBackup: string | null = null;
  if (fs.existsSync(dbPath)) {
    originalDbBackup = fs.readFileSync(dbPath, 'utf-8');
  }

  try {
    // Reset DB to fresh initial state
    await resetDb();

    // ========================================================================
    // SUITE 1: Zod Payload Validation (Negative, Edge & Boundary Payload Stress)
    // ========================================================================
    console.log('\n------------------------------------------------------------');
    console.log('SUITE 1: Zod Payload Validation & Schema Boundary Tests');
    console.log('------------------------------------------------------------');

    // 1.1 Direct Schema validation tests
    {
      const emptyCheck = validatePayload(CreateMeetupInputSchema, {});
      assert('error' in emptyCheck, 'CreateMeetupInputSchema rejects empty object {}');

      const missingTitle = validatePayload(CreateMeetupInputSchema, {
        category: 'Chess',
        venueName: 'Washington Sq Park',
        lat: 40.73,
        lng: -73.99,
      });
      assert('error' in missingTitle, 'CreateMeetupInputSchema rejects payload missing title');

      const shortTitle = validatePayload(CreateMeetupInputSchema, {
        title: 'ab',
        category: 'Chess',
        venueName: 'Washington Sq Park',
        lat: 40.73,
        lng: -73.99,
      });
      assert('error' in shortTitle, 'CreateMeetupInputSchema rejects title with < 3 characters (e.g. "ab")');

      const whitespaceTitle = validatePayload(CreateMeetupInputSchema, {
        title: '   ',
        category: 'Chess',
        venueName: 'Washington Sq Park',
        lat: 40.73,
        lng: -73.99,
      });
      assert('error' in whitespaceTitle, 'CreateMeetupInputSchema rejects whitespace-only title (trim min 3)');

      const longTitle = validatePayload(CreateMeetupInputSchema, {
        title: 'A'.repeat(101),
        category: 'Chess',
        venueName: 'Washington Sq Park',
        lat: 40.73,
        lng: -73.99,
      });
      assert('error' in longTitle, 'CreateMeetupInputSchema rejects title > 100 characters');

      const capacityTooLow = validatePayload(CreateMeetupInputSchema, {
        title: 'Speed Chess',
        category: 'Chess',
        venueName: 'Park',
        lat: 40.73,
        lng: -73.99,
        maxParticipants: 1,
      });
      assert('error' in capacityTooLow, 'CreateMeetupInputSchema rejects maxParticipants < 2 (e.g. 1)');

      const capacityZero = validatePayload(CreateMeetupInputSchema, {
        title: 'Speed Chess',
        category: 'Chess',
        venueName: 'Park',
        lat: 40.73,
        lng: -73.99,
        maxParticipants: 0,
      });
      assert('error' in capacityZero, 'CreateMeetupInputSchema rejects maxParticipants = 0');

      const capacityTooHigh = validatePayload(CreateMeetupInputSchema, {
        title: 'Speed Chess',
        category: 'Chess',
        venueName: 'Park',
        lat: 40.73,
        lng: -73.99,
        maxParticipants: 17,
      });
      assert('error' in capacityTooHigh, 'CreateMeetupInputSchema rejects maxParticipants > 16 (e.g. 17)');

      const capacityNonInt = validatePayload(CreateMeetupInputSchema, {
        title: 'Speed Chess',
        category: 'Chess',
        venueName: 'Park',
        lat: 40.73,
        lng: -73.99,
        maxParticipants: 3.5,
      });
      assert('error' in capacityNonInt, 'CreateMeetupInputSchema rejects fractional maxParticipants (3.5)');

      const latTooHigh = validatePayload(CreateMeetupInputSchema, {
        title: 'Speed Chess',
        category: 'Chess',
        venueName: 'Park',
        lat: 90.0001,
        lng: -73.99,
      });
      assert('error' in latTooHigh, 'CreateMeetupInputSchema rejects latitude > 90');

      const latTooLow = validatePayload(CreateMeetupInputSchema, {
        title: 'Speed Chess',
        category: 'Chess',
        venueName: 'Park',
        lat: -90.0001,
        lng: -73.99,
      });
      assert('error' in latTooLow, 'CreateMeetupInputSchema rejects latitude < -90');

      const lngTooHigh = validatePayload(CreateMeetupInputSchema, {
        title: 'Speed Chess',
        category: 'Chess',
        venueName: 'Park',
        lat: 40.73,
        lng: 180.0001,
      });
      assert('error' in lngTooHigh, 'CreateMeetupInputSchema rejects longitude > 180');

      const lngTooLow = validatePayload(CreateMeetupInputSchema, {
        title: 'Speed Chess',
        category: 'Chess',
        venueName: 'Park',
        lat: 40.73,
        lng: -180.0001,
      });
      assert('error' in lngTooLow, 'CreateMeetupInputSchema rejects longitude < -180');

      const missingVenue = validatePayload(CreateMeetupInputSchema, {
        title: 'Speed Chess',
        category: 'Chess',
        lat: 40.73,
        lng: -73.99,
      });
      assert('error' in missingVenue, 'CreateMeetupInputSchema rejects missing venueName');

      const shortVenue = validatePayload(CreateMeetupInputSchema, {
        title: 'Speed Chess',
        category: 'Chess',
        venueName: 'A',
        lat: 40.73,
        lng: -73.99,
      });
      assert('error' in shortVenue, 'CreateMeetupInputSchema rejects venueName < 2 characters');
    }

    // 1.2 Route Handler POST /api/meetups Validation HTTP Responses
    {
      // Missing title -> 400
      const req1 = makeRequest('http://localhost:3000/api/meetups', {
        method: 'POST',
        userId: 'user-maya',
        body: {
          category: 'Chess',
          venueName: 'Washington Square Park',
          lat: 40.73,
          lng: -73.99,
        },
      });
      const res1 = await createMeetupPost(req1);
      const json1 = await res1.json();
      assert(res1.status === 400, 'POST /api/meetups returns 400 for missing title');
      assert(json1.error.includes('title'), 'POST /api/meetups error message cites title');

      // Title < 3 characters -> 400
      const req2 = makeRequest('http://localhost:3000/api/meetups', {
        method: 'POST',
        userId: 'user-maya',
        body: {
          title: 'Hi',
          category: 'Chess',
          venueName: 'Washington Square Park',
          lat: 40.73,
          lng: -73.99,
        },
      });
      const res2 = await createMeetupPost(req2);
      assert(res2.status === 400, 'POST /api/meetups returns 400 for title < 3 chars');

      // Capacity < 2 -> 400
      const req3 = makeRequest('http://localhost:3000/api/meetups', {
        method: 'POST',
        userId: 'user-maya',
        body: {
          title: 'Speed Chess Tourney',
          category: 'Chess',
          venueName: 'Washington Square Park',
          lat: 40.73,
          lng: -73.99,
          maxParticipants: 1,
        },
      });
      const res3 = await createMeetupPost(req3);
      assert(res3.status === 400, 'POST /api/meetups returns 400 for maxParticipants < 2');

      // Capacity > 16 -> 400
      const req4 = makeRequest('http://localhost:3000/api/meetups', {
        method: 'POST',
        userId: 'user-maya',
        body: {
          title: 'Speed Chess Tourney',
          category: 'Chess',
          venueName: 'Washington Square Park',
          lat: 40.73,
          lng: -73.99,
          maxParticipants: 20,
        },
      });
      const res4 = await createMeetupPost(req4);
      assert(res4.status === 400, 'POST /api/meetups returns 400 for maxParticipants > 16');

      // Latitude > 90 -> 400
      const req5 = makeRequest('http://localhost:3000/api/meetups', {
        method: 'POST',
        userId: 'user-maya',
        body: {
          title: 'Speed Chess Tourney',
          category: 'Chess',
          venueName: 'Washington Square Park',
          lat: 95.5,
          lng: -73.99,
        },
      });
      const res5 = await createMeetupPost(req5);
      assert(res5.status === 400, 'POST /api/meetups returns 400 for invalid latitude (95.5)');

      // Longitude < -180 -> 400
      const req6 = makeRequest('http://localhost:3000/api/meetups', {
        method: 'POST',
        userId: 'user-maya',
        body: {
          title: 'Speed Chess Tourney',
          category: 'Chess',
          venueName: 'Washington Square Park',
          lat: 40.73,
          lng: -195.0,
        },
      });
      const res6 = await createMeetupPost(req6);
      assert(res6.status === 400, 'POST /api/meetups returns 400 for invalid longitude (-195.0)');

      // Valid creation -> 201
      const reqValid = makeRequest('http://localhost:3000/api/meetups', {
        method: 'POST',
        userId: 'user-maya',
        body: {
          title: 'Challenger Valid Meetup',
          category: 'Chess',
          venueName: 'Washington Square Park',
          lat: 40.7308,
          lng: -73.9973,
          maxParticipants: 4,
          joinMode: 'OPEN',
        },
      });
      const resValid = await createMeetupPost(reqValid);
      assert(resValid.status === 201, 'POST /api/meetups returns 201 for valid payload');
    }

    // 1.3 Chat Message validation (POST /api/meetups/[id]/messages)
    {
      // First find or create a meetup
      const db = await readDb();
      const testMeetupId = db.lobbies[0].id;

      // Empty text and empty content -> 400
      const msgReq1 = makeRequest(
        `http://localhost:3000/api/meetups/${testMeetupId}/messages`,
        {
          method: 'POST',
          userId: 'user-maya',
          body: { text: '' },
        }
      );
      const msgRes1 = await postMessagePost(msgReq1, { params: { id: testMeetupId } });
      assert(msgRes1.status === 400, 'POST messages rejects empty text with 400');

      // Whitespace only text -> 400
      const msgReq2 = makeRequest(
        `http://localhost:3000/api/meetups/${testMeetupId}/messages`,
        {
          method: 'POST',
          userId: 'user-maya',
          body: { text: '     ' },
        }
      );
      const msgRes2 = await postMessagePost(msgReq2, { params: { id: testMeetupId } });
      assert(msgRes2.status === 400, 'POST messages rejects whitespace-only text with 400');

      // Text > 1000 characters -> 400
      const msgReq3 = makeRequest(
        `http://localhost:3000/api/meetups/${testMeetupId}/messages`,
        {
          method: 'POST',
          userId: 'user-maya',
          body: { text: 'X'.repeat(1001) },
        }
      );
      const msgRes3 = await postMessagePost(msgReq3, { params: { id: testMeetupId } });
      assert(msgRes3.status === 400, 'POST messages rejects text > 1000 characters with 400');
    }

    // 1.4 Profile update validation (PUT /api/users/profile)
    {
      // Name < 2 characters -> 400
      const profReq1 = makeRequest('http://localhost:3000/api/users/profile', {
        method: 'PUT',
        userId: 'user-maya',
        body: { name: 'A' },
      });
      const profRes1 = await updateProfilePut(profReq1);
      assert(profRes1.status === 400, 'PUT /api/users/profile rejects name < 2 chars with 400');

      // Age < 18 -> 400
      const profReq2 = makeRequest('http://localhost:3000/api/users/profile', {
        method: 'PUT',
        userId: 'user-maya',
        body: { age: 16 },
      });
      const profRes2 = await updateProfilePut(profReq2);
      assert(profRes2.status === 400, 'PUT /api/users/profile rejects age < 18 with 400');
    }

    // ========================================================================
    // SUITE 2: Capacity Ceilings & Enforcement
    // ========================================================================
    console.log('\n------------------------------------------------------------');
    console.log('SUITE 2: Capacity Ceilings & Full Meetup Rejection Tests');
    console.log('------------------------------------------------------------');

    {
      // Create a 2-person meetup (Host is participant #1, so exactly 1 slot available)
      const capReq = makeRequest('http://localhost:3000/api/meetups', {
        method: 'POST',
        userId: 'user-maya',
        body: {
          title: 'Tight 1v1 Match',
          category: 'Ping Pong',
          venueName: 'Ping Pong Hall',
          lat: 40.7308,
          lng: -73.9973,
          maxParticipants: 2,
          joinMode: 'OPEN',
        },
      });
      const capRes = await createMeetupPost(capReq);
      const capJson = await capRes.json();
      const tightMeetupId = capJson.data.meetup.id;

      assert(capRes.status === 201, 'Created meetup with maxParticipants = 2');
      assert(capJson.data.meetup.participants.length === 1, 'Meetup starts with 1 participant (host)');

      // User 2 (user-liam) joins -> should succeed, filling the meetup (2/2)
      const joinReq1 = makeRequest(
        `http://localhost:3000/api/meetups/${tightMeetupId}/join`,
        {
          method: 'POST',
          userId: 'user-liam',
          body: { action: 'JOIN' },
        }
      );
      const joinRes1 = await joinMeetupPost(joinReq1, { params: { id: tightMeetupId } });
      const joinJson1 = await joinRes1.json();
      assert(joinRes1.status === 200, 'User 2 joins meetup successfully (now 2/2 full)');
      assert(joinJson1.status === 'JOINED', 'Join action returns status JOINED');

      // User 3 (user-elena) attempts to join -> MUST return 400 capacity error!
      const joinReq2 = makeRequest(
        `http://localhost:3000/api/meetups/${tightMeetupId}/join`,
        {
          method: 'POST',
          userId: 'user-elena',
          body: { action: 'JOIN' },
        }
      );
      const joinRes2 = await joinMeetupPost(joinReq2, { params: { id: tightMeetupId } });
      const joinJson2 = await joinRes2.json();
      assert(joinRes2.status === 400, 'User 3 joining full meetup returns 400');
      assert(
        joinJson2.error.toLowerCase().includes('capacity') ||
          joinJson2.error.toLowerCase().includes('full'),
        `Error message explicitly mentions capacity: "${joinJson2.error}"`
      );

      // User 4 (user-marcus) attempts REQUEST_JOIN on full meetup -> MUST also return 400!
      const joinReq3 = makeRequest(
        `http://localhost:3000/api/meetups/${tightMeetupId}/join`,
        {
          method: 'POST',
          userId: 'user-marcus',
          body: { action: 'JOIN_OR_REQUEST' },
        }
      );
      const joinRes3 = await joinMeetupPost(joinReq3, { params: { id: tightMeetupId } });
      assert(joinRes3.status === 400, 'Joining full meetup via JOIN_OR_REQUEST returns 400');

      // Test Capacity Ceiling on ACCEPT_REQUEST
      // Create approval-required meetup with maxParticipants: 2
      const apprReq = makeRequest('http://localhost:3000/api/meetups', {
        method: 'POST',
        userId: 'user-maya',
        body: {
          title: 'Approval 1v1 Match',
          category: 'Chess',
          venueName: 'Chess Club',
          lat: 40.7308,
          lng: -73.9973,
          maxParticipants: 2,
          joinMode: 'APPROVAL_REQUIRED',
        },
      });
      const apprRes = await createMeetupPost(apprReq);
      const apprMeetupId = (await apprRes.json()).data.meetup.id;

      // Liam requests to join
      const liamReq = makeRequest(
        `http://localhost:3000/api/meetups/${apprMeetupId}/join`,
        {
          method: 'POST',
          userId: 'user-liam',
          body: { action: 'REQUEST_JOIN', note: 'I want to play' },
        }
      );
      await joinMeetupPost(liamReq, { params: { id: apprMeetupId } });

      // Elena requests to join
      const elenaReq = makeRequest(
        `http://localhost:3000/api/meetups/${apprMeetupId}/join`,
        {
          method: 'POST',
          userId: 'user-elena',
          body: { action: 'REQUEST_JOIN', note: 'Me too' },
        }
      );
      await joinMeetupPost(elenaReq, { params: { id: apprMeetupId } });

      // Host accepts Liam -> fills meetup to 2/2
      const acceptLiamReq = makeRequest(
        `http://localhost:3000/api/meetups/${apprMeetupId}/join`,
        {
          method: 'POST',
          userId: 'user-maya',
          body: { action: 'ACCEPT_REQUEST', targetUserId: 'user-liam' },
        }
      );
      const acceptLiamRes = await joinMeetupPost(acceptLiamReq, { params: { id: apprMeetupId } });
      assert(acceptLiamRes.status === 200, 'Host accepts first join request (capacity now 2/2)');

      // Host attempts to accept Elena -> MUST return 400 full capacity!
      const acceptElenaReq = makeRequest(
        `http://localhost:3000/api/meetups/${apprMeetupId}/join`,
        {
          method: 'POST',
          userId: 'user-maya',
          body: { action: 'ACCEPT_REQUEST', targetUserId: 'user-elena' },
        }
      );
      const acceptElenaRes = await joinMeetupPost(acceptElenaReq, { params: { id: apprMeetupId } });
      const acceptElenaJson = await acceptElenaRes.json();
      assert(acceptElenaRes.status === 400, 'Accepting join request on full meetup returns 400');
      assert(
        acceptElenaJson.error.toLowerCase().includes('capacity') ||
          acceptElenaJson.error.toLowerCase().includes('full'),
        `Accepting beyond capacity error message: "${acceptElenaJson.error}"`
      );

      // Test Capacity Reduction Guard in PUT /api/meetups/[id]
      // Create a meetup with 3 participants, then try to reduce capacity to 2
      const reduceMeetupReq = makeRequest('http://localhost:3000/api/meetups', {
        method: 'POST',
        userId: 'user-maya',
        body: {
          title: 'Triples Match for Reduction',
          category: 'Chess',
          venueName: 'Park',
          lat: 40.7308,
          lng: -73.9973,
          maxParticipants: 4,
          joinMode: 'OPEN',
        },
      });
      const reduceMeetupRes = await createMeetupPost(reduceMeetupReq);
      const reduceMeetupId = (await reduceMeetupRes.json()).data.meetup.id;

      // Add Liam and Elena so participants = 3 (Maya, Liam, Elena)
      await joinMeetupPost(
        makeRequest(`http://localhost:3000/api/meetups/${reduceMeetupId}/join`, {
          method: 'POST',
          userId: 'user-liam',
          body: { action: 'JOIN' },
        }),
        { params: { id: reduceMeetupId } }
      );
      await joinMeetupPost(
        makeRequest(`http://localhost:3000/api/meetups/${reduceMeetupId}/join`, {
          method: 'POST',
          userId: 'user-elena',
          body: { action: 'JOIN' },
        }),
        { params: { id: reduceMeetupId } }
      );

      // Now attempt to reduce capacity to 2 when there are 3 participants
      const reduceCapReq = makeRequest(
        `http://localhost:3000/api/meetups/${reduceMeetupId}`,
        {
          method: 'PUT',
          userId: 'user-maya',
          body: { maxParticipants: 2 },
        }
      );
      const reduceCapRes = await updateMeetupPut(reduceCapReq, { params: { id: reduceMeetupId } });
      const reduceCapJson = await reduceCapRes.json();
      assert(
        reduceCapRes.status === 400,
        'PUT /api/meetups/[id] rejects reducing maxParticipants below current participant count (3 participants -> cap 2)'
      );
      assert(
        reduceCapJson.error?.includes('Cannot reduce capacity below current participant count') ?? false,
        `Capacity reduction guard error message: "${reduceCapJson.error}"`
      );

      // Successfully increase capacity to 6
      const increaseCapReq = makeRequest(
        `http://localhost:3000/api/meetups/${reduceMeetupId}`,
        {
          method: 'PUT',
          userId: 'user-maya',
          body: { maxParticipants: 6 },
        }
      );
      const increaseCapRes = await updateMeetupPut(increaseCapReq, { params: { id: reduceMeetupId } });
      assert(increaseCapRes.status === 200, 'PUT /api/meetups/[id] successfully increases capacity to 6');

      // Boundary check on PUT: title with 1 character (bypasses Zod min 3 validation)
      const shortTitlePutReq = makeRequest(
        `http://localhost:3000/api/meetups/${reduceMeetupId}`,
        {
          method: 'PUT',
          userId: 'user-maya',
          body: { title: 'X' },
        }
      );
      const shortTitlePutRes = await updateMeetupPut(shortTitlePutReq, { params: { id: reduceMeetupId } });
      const shortTitlePutJson = await shortTitlePutRes.json();
      assert(
        shortTitlePutRes.status === 400,
        'PUT /api/meetups/[id] rejects title < 3 characters (e.g. "X") with 400',
        `Actual status was ${shortTitlePutRes.status}, title became "${shortTitlePutJson.data?.meetup?.title}"`
      );

      // Boundary check on PUT: capacity < 2 on a 1-participant meetup
      const freshMeetupReq = makeRequest('http://localhost:3000/api/meetups', {
        method: 'POST',
        userId: 'user-maya',
        body: {
          title: 'Single Host Meetup',
          category: 'Chess',
          venueName: 'Park',
          lat: 40.73,
          lng: -73.99,
          maxParticipants: 4,
        },
      });
      const freshMeetupRes = await createMeetupPost(freshMeetupReq);
      const freshMeetupId = (await freshMeetupRes.json()).data.meetup.id;

      const clampCapReq = makeRequest(
        `http://localhost:3000/api/meetups/${freshMeetupId}`,
        {
          method: 'PUT',
          userId: 'user-maya',
          body: { maxParticipants: 1 },
        }
      );
      const clampCapRes = await updateMeetupPut(clampCapReq, { params: { id: freshMeetupId } });
      const clampCapJson = await clampCapRes.json();
      assert(
        clampCapRes.status === 400,
        'PUT /api/meetups/[id] rejects maxParticipants: 1 with 400 on 1-participant meetup',
        `Actual status was ${clampCapRes.status}, maxParticipants was clamped to ${clampCapJson.data?.meetup?.maxParticipants} instead of 400 error`
      );
    }

    // ========================================================================
    // SUITE 3: Privacy Sanitization & Redaction
    // ========================================================================
    console.log('\n------------------------------------------------------------');
    console.log('SUITE 3: Privacy Sanitization & Redaction Tests');
    console.log('------------------------------------------------------------');

    {
      // Target persona: user-maya (has email: maya@seeme.app, settings, bannedUserIds)
      // 3.1 Unauthenticated (guest) caller -> must redact private fields
      const guestReq = makeRequest(
        'http://localhost:3000/api/users/profile?userId=user-maya'
      );
      const guestRes = await getProfileGet(guestReq);
      const guestJson = await guestRes.json();
      const guestUser = guestJson.data.user;

      assert(guestRes.status === 200, 'GET /api/users/profile returns 200 for guest');
      assert(guestUser.id === 'user-maya', 'Returns requested user profile');
      assert(guestUser.email === undefined, 'Guest caller cannot see email (sanitized/redacted)');
      assert(guestUser.password === undefined, 'Guest caller cannot see password (sanitized/redacted)');
      assert(guestUser.bannedUserIds === undefined, 'Guest caller cannot see bannedUserIds (sanitized/redacted)');
      assert(
        guestUser.settings?.iosAndroidPush === false &&
          guestUser.settings?.soundEffects === false &&
          guestUser.settings?.hapticFeedback === false,
        'Private notification settings are sanitized for guest callers'
      );

      // 3.2 Non-owner authenticated caller (user-liam viewing user-maya) -> must redact
      const nonOwnerReq = makeRequest(
        'http://localhost:3000/api/users/profile?userId=user-maya',
        { userId: 'user-liam' }
      );
      const nonOwnerRes = await getProfileGet(nonOwnerReq);
      const nonOwnerJson = await nonOwnerRes.json();
      const nonOwnerUser = nonOwnerJson.data.user;

      assert(nonOwnerRes.status === 200, 'GET /api/users/profile returns 200 for other user');
      assert(nonOwnerUser.email === undefined, 'Non-owner caller cannot see target user email');
      assert(nonOwnerUser.bannedUserIds === undefined, 'Non-owner caller cannot see target user bannedUserIds');

      // 3.3 Owner caller (user-maya viewing user-maya) -> full profile preserved
      const ownerReq = makeRequest(
        'http://localhost:3000/api/users/profile?userId=user-maya',
        { userId: 'user-maya' }
      );
      const ownerRes = await getProfileGet(ownerReq);
      const ownerJson = await ownerRes.json();
      const ownerUser = ownerJson.data.user;

      assert(ownerRes.status === 200, 'GET /api/users/profile returns 200 for owner');
      assert(ownerUser.email === 'maya@seeme.app', 'Owner caller receives full email address');
      assert(Array.isArray(ownerUser.bannedUserIds), 'Owner caller receives bannedUserIds array');
      assert(ownerUser.settings?.iosAndroidPush === true, 'Owner caller receives full un-sanitized settings');

      // 3.4 Self profile query without userId param -> full profile
      const selfReq = makeRequest('http://localhost:3000/api/users/profile', {
        userId: 'user-liam',
      });
      const selfRes = await getProfileGet(selfReq);
      const selfJson = await selfRes.json();
      assert(selfRes.status === 200, 'GET /api/users/profile without query param returns 200 for session user');
      assert(selfJson.data.user.id === 'user-liam', 'Returns active session user (user-liam)');
      assert(selfJson.data.user.email === 'liam@seeme.app', 'Returns full email for self profile');

      // 3.5 Admin caller viewing another user (user-maya is ADMIN, viewing user-liam)
      const adminReq = makeRequest(
        'http://localhost:3000/api/users/profile?userId=user-liam',
        { userId: 'user-maya' }
      );
      const adminRes = await getProfileGet(adminReq);
      const adminJson = await adminRes.json();
      assert(adminRes.status === 200, 'GET /api/users/profile returns 200 for Admin caller');
      assert(
        adminJson.data.user.email === 'liam@seeme.app',
        'Admin caller can view target user email for moderation purposes'
      );
    }

    // ========================================================================
    // SUITE 4: Concurrency Safety & Mutex Serialization Stress
    // ========================================================================
    console.log('\n------------------------------------------------------------');
    console.log('SUITE 4: Concurrency Safety & Mutex Serialization Stress');
    console.log('------------------------------------------------------------');

    {
      // 4.1 Parallel writeDb calls (50 concurrent writes simulating burst traffic)
      console.log('  Testing 50 parallel writeDb executions...');
      const startMs = Date.now();
      const parallelWritePromises: Promise<void>[] = [];

      for (let i = 0; i < 50; i++) {
        parallelWritePromises.push(
          (async () => {
            const db = await readDb();
            // Append a distinct test marker
            db.messages.push({
              id: `stress-msg-${i}-${Date.now()}`,
              lobbyId: 'lobby-pong-1',
              senderId: 'user-maya',
              senderName: 'Maya Lin',
              senderAvatar: '',
              text: `Concurrent test message ${i}`,
              createdAt: new Date().toISOString(),
            });
            await writeDb(db);
          })()
        );
      }

      await Promise.all(parallelWritePromises);
      const elapsedMs = Date.now() - startMs;

      // Verify file integrity on disk
      assert(fs.existsSync(dbPath), 'data/db.json exists after 50 parallel writes');
      const diskContent = fs.readFileSync(dbPath, 'utf-8');
      let parsedDisk: any = null;
      let parseError: any = null;
      try {
        parsedDisk = JSON.parse(diskContent);
      } catch (e) {
        parseError = e;
      }

      assert(parseError === null, 'data/db.json remains 100% valid parseable JSON (zero corruption)');
      assert(Array.isArray(parsedDisk?.lobbies), 'data/db.json preserves lobbies array');
      assert(Array.isArray(parsedDisk?.personas), 'data/db.json preserves personas array');
      assert(Array.isArray(parsedDisk?.messages), 'data/db.json preserves messages array');
      console.log(`  50 concurrent writes completed safely in ${elapsedMs}ms without lock crashes.`);

      // 4.2 Parallel Meetup Creations (20 concurrent POST /api/meetups requests)
      console.log('  Testing 20 concurrent meetup creations...');
      const createPromises: Promise<any>[] = [];
      for (let i = 0; i < 20; i++) {
        const req = makeRequest('http://localhost:3000/api/meetups', {
          method: 'POST',
          userId: 'user-maya',
          body: {
            title: `Concurrent Meetup ${i}`,
            category: 'Chess',
            venueName: `Venue ${i}`,
            lat: 40.7308,
            lng: -73.9973,
            maxParticipants: 4,
          },
        });
        createPromises.push(createMeetupPost(req));
      }

      const createResponses = await Promise.all(createPromises);
      const allCreated201 = createResponses.every((res) => res.status === 201);
      assert(allCreated201, 'All 20 concurrent meetup creation requests returned 201 Created');

      // Verify all 20 exist in the repository
      const verifyDb = await readDb();
      let createdFoundCount = 0;
      for (let i = 0; i < 20; i++) {
        if (verifyDb.lobbies.some((l) => l.title === `Concurrent Meetup ${i}`)) {
          createdFoundCount++;
        }
      }
      console.log(`  Surviving meetups in database: ${createdFoundCount} of 20`);
      assert(
        createdFoundCount === 20,
        'All 20 concurrently created meetups are fully persisted in db',
        `Only ${createdFoundCount} of 20 survived due to un-synchronized readDb -> writeDb race`
      );

      // 4.3 High-contention race condition: 15 concurrent joins to 1 open seat!
      console.log('  Testing high-contention race condition: 15 concurrent joins for 1 slot...');
      // Create a meetup with maxParticipants = 2. Host is participant #1. Exactly 1 slot left.
      const raceMeetupReq = makeRequest('http://localhost:3000/api/meetups', {
        method: 'POST',
        userId: 'user-maya',
        body: {
          title: 'High Contention Race Meetup',
          category: 'Tennis',
          venueName: 'Pier 40',
          lat: 40.728,
          lng: -74.012,
          maxParticipants: 2,
          joinMode: 'OPEN',
        },
      });
      const raceMeetupRes = await createMeetupPost(raceMeetupReq);
      const raceMeetupId = (await raceMeetupRes.json()).data.meetup.id;

      // Seed 15 unique simulated users in personas to attempt joining simultaneously
      const contentionDb = await readDb();
      for (let i = 0; i < 15; i++) {
        const uId = `race-user-${i}`;
        if (!contentionDb.personas.some((p) => p.id === uId)) {
          contentionDb.personas.push({
            id: uId,
            name: `Race User ${i}`,
            age: 25,
            avatar: '',
            role: 'USER',
            verified: true,
            reliabilityScore: 95,
            meetupsAttended: 1,
            hoursPlayed: 2,
            ratingAvg: 5.0,
            ratingCount: 1,
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
          } as any);
        }
      }
      await writeDb(contentionDb);

      // Fire 15 simultaneous join requests
      const raceJoinPromises: Promise<Response>[] = [];
      for (let i = 0; i < 15; i++) {
        const req = makeRequest(
          `http://localhost:3000/api/meetups/${raceMeetupId}/join`,
          {
            method: 'POST',
            userId: `race-user-${i}`,
            body: { action: 'JOIN' },
          }
        );
        raceJoinPromises.push(joinMeetupPost(req, { params: { id: raceMeetupId } }));
      }

      const raceJoinResponses = await Promise.all(raceJoinPromises);
      const successCount = raceJoinResponses.filter((r) => r.status === 200).length;
      const capacityErrorCount = raceJoinResponses.filter((r) => r.status === 400).length;

      // Read resulting meetup from db
      const finalDb = await readDb();
      const finalRaceMeetup = finalDb.lobbies.find((l) => l.id === raceMeetupId);

      assert(
        finalRaceMeetup !== undefined && finalRaceMeetup.participants.length <= 2,
        `Meetup participant count (${finalRaceMeetup?.participants.length}) NEVER exceeds maxParticipants (2)`
      );
      assert(
        successCount === 1,
        `Under concurrent race contention, exactly 1 candidate won the single available seat (Got: ${successCount})`
      );
      assert(
        capacityErrorCount === 14,
        `All other 14 candidates received 400 capacity rejection (Got: ${capacityErrorCount})`
      );
    }

    // ========================================================================
    // SUITE 5: Authentication Flow Validation (Google, Apple, Session, Ban)
    // ========================================================================
    console.log('\n------------------------------------------------------------');
    console.log('SUITE 5: Authentication Flow Validation (Google, Apple, Session)');
    console.log('------------------------------------------------------------');

    {
      // 5.1 GOOGLE_AUTH Auto-Provisioning & Cookie Setting
      const googleReq = makeRequest('http://localhost:3000/api/auth/session', {
        method: 'POST',
        body: {
          action: 'GOOGLE_AUTH',
          email: 'challenger.google.test@example.com',
          name: 'Google Challenger User',
        },
      });
      const googleRes = await postSessionPost(googleReq);
      const googleJson = await googleRes.json();

      assert(googleRes.status === 200, 'POST /api/auth/session with GOOGLE_AUTH returns 200');
      assert(googleJson.authenticated === true, 'Response indicates authenticated: true');
      assert(googleJson.user.email === 'challenger.google.test@example.com', 'User email correctly recorded');
      assert(googleJson.user.authProvider === 'google', 'User authProvider is "google"');
      assert(googleJson.user.verified === true, 'Google authenticated user is verified: true');
      assert(googleJson.user.verificationStatus === 'VERIFIED', 'Google user verificationStatus is VERIFIED');

      // Check Set-Cookie header
      const googleCookieHeader = googleRes.headers.get('set-cookie');
      assert(
        googleCookieHeader !== null && googleCookieHeader.includes('seeme_session='),
        'GOOGLE_AUTH sets seeme_session HTTP cookie'
      );

      // Verify Google user persisted in DB
      const dbAfterGoogle = await readDb();
      const persistedGoogle = dbAfterGoogle.personas.find(
        (p) => p.email === 'challenger.google.test@example.com'
      );
      assert(persistedGoogle !== undefined, 'Google user auto-provisioned in database');

      // Idempotency: Calling GOOGLE_AUTH again with same email returns existing account
      const googleReq2 = makeRequest('http://localhost:3000/api/auth/session', {
        method: 'POST',
        body: {
          action: 'GOOGLE_AUTH',
          email: 'challenger.google.test@example.com',
          name: 'Updated Name (Should keep original ID)',
        },
      });
      const googleRes2 = await postSessionPost(googleReq2);
      const googleJson2 = await googleRes2.json();
      assert(
        googleJson2.user.id === persistedGoogle?.id,
        'Second GOOGLE_AUTH call with same email is idempotent (preserves original user ID)'
      );

      // 5.2 APPLE_AUTH Auto-Provisioning & Cookie Setting
      const appleReq = makeRequest('http://localhost:3000/api/auth/session', {
        method: 'POST',
        body: {
          action: 'APPLE_AUTH',
          email: 'challenger.apple.test@example.com',
          name: 'Apple Challenger User',
        },
      });
      const appleRes = await postSessionPost(appleReq);
      const appleJson = await appleRes.json();

      assert(appleRes.status === 200, 'POST /api/auth/session with APPLE_AUTH returns 200');
      assert(appleJson.authenticated === true, 'Apple response indicates authenticated: true');
      assert(appleJson.user.email === 'challenger.apple.test@example.com', 'Apple user email recorded');
      assert(appleJson.user.authProvider === 'apple', 'Apple user authProvider is "apple"');
      assert(appleJson.user.verified === true, 'Apple user is verified: true');

      const appleCookieHeader = appleRes.headers.get('set-cookie');
      assert(
        appleCookieHeader !== null && appleCookieHeader.includes('seeme_session='),
        'APPLE_AUTH sets seeme_session HTTP cookie'
      );

      // 5.3 Session Inspection GET /api/auth/session
      // With cookie
      const sessionWithCookieReq = makeRequest(
        'http://localhost:3000/api/auth/session',
        {
          cookie: `seeme_session=${persistedGoogle?.id}`,
        }
      );
      const sessionWithCookieRes = await getSessionGet(sessionWithCookieReq);
      const sessionWithCookieJson = await sessionWithCookieRes.json();
      assert(
        sessionWithCookieJson.authenticated === true &&
          sessionWithCookieJson.user.id === persistedGoogle?.id,
        'GET /api/auth/session resolves user via seeme_session cookie'
      );

      // Unauthenticated session inspection
      const unauthSessionReq = makeRequest('http://localhost:3000/api/auth/session');
      const unauthSessionRes = await getSessionGet(unauthSessionReq);
      const unauthSessionJson = await unauthSessionRes.json();
      assert(
        unauthSessionJson.authenticated === false && unauthSessionJson.user === null,
        'GET /api/auth/session returns authenticated: false and user: null when unauthenticated'
      );

      // 5.4 LOGOUT action clears cookie
      const logoutReq = makeRequest('http://localhost:3000/api/auth/session', {
        method: 'POST',
        body: { action: 'LOGOUT' },
      });
      const logoutRes = await postSessionPost(logoutReq);
      const logoutCookieHeader = logoutRes.headers.get('set-cookie');
      assert(logoutRes.status === 200, 'POST /api/auth/session LOGOUT returns 200');
      assert(
        logoutCookieHeader !== null &&
          (logoutCookieHeader.includes('Max-Age=0') || logoutCookieHeader.includes('seeme_session=;')),
        'LOGOUT clears seeme_session cookie via Max-Age=0'
      );

      // 5.5 SWITCH_DEMO_USER
      const switchReq = makeRequest('http://localhost:3000/api/auth/session', {
        method: 'POST',
        body: { action: 'SWITCH_DEMO_USER', userId: 'user-maya' },
      });
      const switchRes = await postSessionPost(switchReq);
      const switchJson = await switchRes.json();
      assert(switchRes.status === 200, 'SWITCH_DEMO_USER returns 200 for valid demo persona');
      assert(switchJson.user.id === 'user-maya', 'Switched session user is user-maya');

      const switchNotFoundReq = makeRequest('http://localhost:3000/api/auth/session', {
        method: 'POST',
        body: { action: 'SWITCH_DEMO_USER', userId: 'non-existent-user' },
      });
      const switchNotFoundRes = await postSessionPost(switchNotFoundReq);
      assert(switchNotFoundRes.status === 404, 'SWITCH_DEMO_USER returns 404 for unknown user');

      // 5.6 Suspended / Banned Account Handling
      // Mark a test user as banned
      const banDb = await readDb();
      const bannedUser = banDb.personas.find((p) => p.id === 'user-marcus');
      if (bannedUser) {
        bannedUser.isBanned = true;
        bannedUser.banReason = 'Violated code of conduct';
        await writeDb(banDb);
      }

      // Trying to switch/login as banned user returns 403
      const bannedLoginReq = makeRequest('http://localhost:3000/api/auth/session', {
        method: 'POST',
        body: { action: 'SWITCH_DEMO_USER', userId: 'user-marcus' },
      });
      const bannedLoginRes = await postSessionPost(bannedLoginReq);
      assert(bannedLoginRes.status === 403, 'Logging in as suspended/banned account returns 403 FORBIDDEN');

      // Trying to perform protected action with banned user returns 403
      const bannedCreateReq = makeRequest('http://localhost:3000/api/meetups', {
        method: 'POST',
        userId: 'user-marcus',
        body: {
          title: 'Banned User Meetup',
          category: 'Chess',
          venueName: 'Park',
          lat: 40.73,
          lng: -73.99,
        },
      });
      const bannedCreateRes = await createMeetupPost(bannedCreateReq);
      assert(bannedCreateRes.status === 403, 'Banned user creating a meetup is blocked with 403 FORBIDDEN');
    }

  } finally {
    // Restore original DB backup if one existed
    if (originalDbBackup) {
      fs.writeFileSync(dbPath, originalDbBackup, 'utf-8');
      console.log('\nRestored original data/db.json state.');
    }
  }

  // ========================================================================
  // FINAL SUMMARY REPORT
  // ========================================================================
  console.log('\n============================================================');
  console.log(`M2 CHALLENGER TEST RESULTS: ${passedAssertions}/${totalAssertions} Passed`);
  if (failureList.length === 0) {
    console.log('ALL EMPIRICAL CHALLENGE TESTS PASSED! ZERO DEFECTS FOUND.');
    console.log('VERDICT: APPROVE');
  } else {
    console.error(`FAILURES ENCOUNTERED (${failureList.length}):`);
    failureList.forEach((f) => console.error(` - ${f}`));
    console.log('VERDICT: REQUEST_CHANGES');
  }
  console.log('============================================================\n');

  process.exit(failureList.length === 0 ? 0 : 1);
}

runAllSuites().catch((err) => {
  console.error('CRITICAL UNCAUGHT ERROR IN TEST HARNESS:', err);
  process.exit(1);
});
