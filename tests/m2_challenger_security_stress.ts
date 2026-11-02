/**
 * Empirical Security Permissions & Adversarial Stress Suite for Milestone 2
 * SeeMe (`lobby-irl-matchmaking`)
 * 
 * Tests 8 Core Security Invariants + In-depth Adversarial Attack Vectors
 */

import { NextRequest } from 'next/server';
import { DELETE as lobbiesDelete } from '../src/app/api/lobbies/[id]/route';
import { DELETE as meetupsDelete, PUT as meetupsPut, GET as meetupsGet } from '../src/app/api/meetups/[id]/route';
import { POST as lobbiesMessagesPost } from '../src/app/api/lobbies/[id]/messages/route';
import { POST as meetupsMessagesPost } from '../src/app/api/meetups/[id]/messages/route';
import { POST as usersPost } from '../src/app/api/users/route';
import { POST as lobbiesJoinPost } from '../src/app/api/lobbies/[id]/join/route';
import { POST as meetupsJoinPost } from '../src/app/api/meetups/[id]/join/route';
import { POST as meetupsCreatePost } from '../src/app/api/meetups/route';
import { readDb, writeDb } from '../src/lib/db';
import { DatabaseSchema, UserPersona } from '../src/types/lobby';

// ============================================================================
// TEST HARNESS FRAMEWORK
// ============================================================================

interface AssertionResult {
  name: string;
  passed: boolean;
  status?: number;
  expectedStatus?: number;
  detail?: string;
  durationMs: number;
}

let totalTests = 0;
let passedTests = 0;
let failedTests = 0;
const results: AssertionResult[] = [];
let dbSnapshot: string = '';

async function backupDatabase() {
  const db = await readDb();
  dbSnapshot = JSON.stringify(db);
}

async function restoreDatabase() {
  if (dbSnapshot) {
    await writeDb(JSON.parse(dbSnapshot));
  }
}

function recordPass(name: string, durationMs: number, detail?: string) {
  totalTests++;
  passedTests++;
  results.push({ name, passed: true, durationMs, detail });
  console.log(`  [PASS] (${durationMs.toFixed(1)}ms) ${name}${detail ? ` -> ${detail}` : ''}`);
}

function recordFail(name: string, durationMs: number, detail: string, status?: number, expectedStatus?: number) {
  totalTests++;
  failedTests++;
  results.push({ name, passed: false, durationMs, detail, status, expectedStatus });
  console.error(`  [FAIL] (${durationMs.toFixed(1)}ms) ${name} | Error: ${detail} (got ${status}, expected ${expectedStatus})`);
}

async function assertResponse(
  testName: string,
  fn: () => Promise<Response>,
  expectedStatus: number,
  customValidator?: (body: any) => string | null
) {
  const start = performance.now();
  try {
    const res = await fn();
    const durationMs = performance.now() - start;
    const body = await res.json().catch(() => ({}));

    if (res.status !== expectedStatus) {
      recordFail(
        testName,
        durationMs,
        `HTTP Status mismatch: ${JSON.stringify(body)}`,
        res.status,
        expectedStatus
      );
      return false;
    }

    if (customValidator) {
      const valError = customValidator(body);
      if (valError) {
        recordFail(testName, durationMs, `Validation failed: ${valError}`, res.status, expectedStatus);
        return false;
      }
    }

    recordPass(testName, durationMs, `Status ${res.status}`);
    return true;
  } catch (err: any) {
    const durationMs = performance.now() - start;
    recordFail(testName, durationMs, `Exception thrown: ${err.message}`, 500, expectedStatus);
    return false;
  }
}

// Request Builder Helpers
function buildRequest(
  url: string,
  options: {
    method?: string;
    auth?: { type: 'x-user-id' | 'bearer' | 'cookie' | 'cookie-json' | 'malformed'; userId?: string; raw?: string };
    body?: any;
    headers?: Record<string, string>;
  } = {}
): NextRequest {
  const method = options.method || 'GET';
  const headers: Record<string, string> = {
    'content-type': 'application/json',
    ...(options.headers || {}),
  };

  if (options.auth) {
    const { type, userId, raw } = options.auth;
    if (type === 'x-user-id' && userId) {
      headers['x-user-id'] = userId;
    } else if (type === 'bearer' && userId) {
      headers['authorization'] = `Bearer ${userId}`;
    } else if (type === 'cookie' && userId) {
      headers['cookie'] = `seeme_session=${userId}`;
    } else if (type === 'cookie-json' && userId) {
      headers['cookie'] = `seeme_session=${JSON.stringify({ userId })}`;
    } else if (type === 'malformed' && raw) {
      headers['cookie'] = `seeme_session=${raw}`;
    }
  }

  const init: any = {
    method,
    headers,
  };

  if (options.body && method !== 'GET') {
    init.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  return new NextRequest(url, init);
}

// ============================================================================
// MAIN TEST RUNNER
// ============================================================================

async function runAllSuites() {
  console.log('\n================================================================');
  console.log('STARTING EMPIRICAL BACKEND SECURITY PERMISSION SUITES');
  console.log('================================================================\n');

  await backupDatabase();

  // Test target constants
  // 'lobby-chess-1' is hosted by 'user-liam' (regular USER)
  // 'lobby-pong-1' is hosted by 'user-maya' (ADMIN)
  // 'user-elena' is a regular USER who is NOT host of lobby-chess-1 or lobby-pong-1
  // 'user-marcus' is a regular USER who hosts lobby-run-1

  try {
    // ------------------------------------------------------------------------
    // SUITE 1: DELETE Permissions (/api/lobbies/[id] & /api/meetups/[id])
    // ------------------------------------------------------------------------
    console.log('--- SUITE 1: DELETE Permissions (/api/lobbies/[id] & /api/meetups/[id]) ---');

    // 1.1 Unauthenticated DELETE /api/lobbies/[id] -> 401
    await assertResponse(
      '1.1 Unauthenticated DELETE /api/lobbies/[id] returns 401',
      () => lobbiesDelete(buildRequest('http://localhost:3000/api/lobbies/lobby-chess-1', { method: 'DELETE' }), { params: { id: 'lobby-chess-1' } }),
      401,
      (body) => (body.error && body.errorDetail?.code === 'UNAUTHORIZED' ? null : 'Expected UNAUTHORIZED error')
    );

    // 1.2 Unauthenticated DELETE /api/meetups/[id] -> 401
    await assertResponse(
      '1.2 Unauthenticated DELETE /api/meetups/[id] returns 401',
      () => meetupsDelete(buildRequest('http://localhost:3000/api/meetups/lobby-chess-1', { method: 'DELETE' }), { params: { id: 'lobby-chess-1' } }),
      401,
      (body) => (body.error && body.errorDetail?.code === 'UNAUTHORIZED' ? null : 'Expected UNAUTHORIZED error')
    );

    // 1.3 Signed-out session token returns 401
    await assertResponse(
      '1.3 Cookie seeme_session=signed_out returns 401',
      () => meetupsDelete(buildRequest('http://localhost:3000/api/meetups/lobby-chess-1', { method: 'DELETE', auth: { type: 'malformed', raw: 'signed_out' } }), { params: { id: 'lobby-chess-1' } }),
      401
    );

    // 1.4 Fuzzed Bearer tokens (Bearer null, Bearer undefined) return 401
    await assertResponse(
      '1.4 Authorization: Bearer null returns 401',
      () => meetupsDelete(buildRequest('http://localhost:3000/api/meetups/lobby-chess-1', { method: 'DELETE', headers: { authorization: 'Bearer null' } }), { params: { id: 'lobby-chess-1' } }),
      401
    );

    // 1.5 Non-existent user ID returns 401
    await assertResponse(
      '1.5 Non-existent user session returns 401',
      () => meetupsDelete(buildRequest('http://localhost:3000/api/meetups/lobby-chess-1', { method: 'DELETE', auth: { type: 'x-user-id', userId: 'user-ghost-attacker-999' } }), { params: { id: 'lobby-chess-1' } }),
      401
    );

    // 1.6 Non-host DELETE /api/lobbies/[id] via x-user-id -> 403
    await assertResponse(
      '1.6 Non-host DELETE /api/lobbies/[id] returns 403 (user-elena vs lobby-chess-1)',
      () => lobbiesDelete(buildRequest('http://localhost:3000/api/lobbies/lobby-chess-1', { method: 'DELETE', auth: { type: 'x-user-id', userId: 'user-elena' } }), { params: { id: 'lobby-chess-1' } }),
      403,
      (body) => (body.errorDetail?.code === 'FORBIDDEN' ? null : 'Expected FORBIDDEN errorDetail')
    );

    // 1.7 Non-host DELETE /api/meetups/[id] via x-user-id -> 403
    await assertResponse(
      '1.7 Non-host DELETE /api/meetups/[id] returns 403 (user-marcus vs lobby-chess-1)',
      () => meetupsDelete(buildRequest('http://localhost:3000/api/meetups/lobby-chess-1', { method: 'DELETE', auth: { type: 'x-user-id', userId: 'user-marcus' } }), { params: { id: 'lobby-chess-1' } }),
      403
    );

    // 1.8 Non-host DELETE via Bearer token -> 403
    await assertResponse(
      '1.8 Non-host DELETE via Authorization: Bearer user-elena returns 403',
      () => meetupsDelete(buildRequest('http://localhost:3000/api/meetups/lobby-chess-1', { method: 'DELETE', auth: { type: 'bearer', userId: 'user-elena' } }), { params: { id: 'lobby-chess-1' } }),
      403
    );

    // 1.9 Non-host DELETE via string cookie -> 403
    await assertResponse(
      '1.9 Non-host DELETE via Cookie: seeme_session=user-elena returns 403',
      () => meetupsDelete(buildRequest('http://localhost:3000/api/meetups/lobby-chess-1', { method: 'DELETE', auth: { type: 'cookie', userId: 'user-elena' } }), { params: { id: 'lobby-chess-1' } }),
      403
    );

    // 1.10 Non-host DELETE via JSON cookie -> 403
    await assertResponse(
      '1.10 Non-host DELETE via Cookie: seeme_session={"userId":"user-elena"} returns 403',
      () => meetupsDelete(buildRequest('http://localhost:3000/api/meetups/lobby-chess-1', { method: 'DELETE', auth: { type: 'cookie-json', userId: 'user-elena' } }), { params: { id: 'lobby-chess-1' } }),
      403
    );

    // 1.11 Non-existent meetup ID returns 404 even with valid auth
    await assertResponse(
      '1.11 DELETE non-existent meetup returns 404',
      () => meetupsDelete(buildRequest('http://localhost:3000/api/meetups/lobby-non-existent-999', { method: 'DELETE', auth: { type: 'x-user-id', userId: 'user-liam' } }), { params: { id: 'lobby-non-existent-999' } }),
      404
    );

    // 1.12 Host DELETE /api/meetups/[id] succeeds -> 200
    // We create a temporary meetup to safely delete
    const tempCreateReq = buildRequest('http://localhost:3000/api/meetups', {
      method: 'POST',
      auth: { type: 'x-user-id', userId: 'user-liam' },
      body: {
        title: 'Temp Chess Meetup for Deletion Test',
        category: 'Chess',
        venueName: 'Washington Square Park',
        lat: 40.7302,
        lng: -73.9985,
        maxParticipants: 4,
        joinMode: 'OPEN',
      },
    });
    const tempCreateRes = await meetupsCreatePost(tempCreateReq);
    const tempCreatedBody = await tempCreateRes.json();
    const tempMeetupId = tempCreatedBody.data?.meetup?.id || tempCreatedBody.lobby?.id;

    if (tempMeetupId) {
      await assertResponse(
        '1.12 Host DELETE /api/meetups/[id] succeeds with 200 and deleted: true',
        () => meetupsDelete(buildRequest(`http://localhost:3000/api/meetups/${tempMeetupId}`, { method: 'DELETE', auth: { type: 'x-user-id', userId: 'user-liam' } }), { params: { id: tempMeetupId } }),
        200,
        (body) => (body.deleted === true && body.success === true ? null : 'Expected deleted: true')
      );
    } else {
      recordFail('1.12 Host DELETE setup failed', 0, 'Could not create temporary meetup');
    }

    // 1.13 Admin user DELETE /api/meetups/[id] succeeds -> 200
    // Create another temporary meetup hosted by user-liam and delete as admin user-maya
    const tempCreateReq2 = buildRequest('http://localhost:3000/api/meetups', {
      method: 'POST',
      auth: { type: 'x-user-id', userId: 'user-liam' },
      body: {
        title: 'Temp Meetup for Admin Deletion',
        category: 'Chess',
        venueName: 'Washington Square Park',
        lat: 40.7302,
        lng: -73.9985,
        maxParticipants: 4,
        joinMode: 'OPEN',
      },
    });
    const tempCreateRes2 = await meetupsCreatePost(tempCreateReq2);
    const tempCreatedBody2 = await tempCreateRes2.json();
    const tempMeetupId2 = tempCreatedBody2.data?.meetup?.id || tempCreatedBody2.lobby?.id;

    if (tempMeetupId2) {
      await assertResponse(
        '1.13 Admin user-maya DELETE non-hosted meetup succeeds with 200',
        () => meetupsDelete(buildRequest(`http://localhost:3000/api/meetups/${tempMeetupId2}`, { method: 'DELETE', auth: { type: 'x-user-id', userId: 'user-maya' } }), { params: { id: tempMeetupId2 } }),
        200,
        (body) => (body.deleted === true ? null : 'Expected admin deletion success')
      );
    }

    // Restore DB after Suite 1
    await restoreDatabase();

    // ------------------------------------------------------------------------
    // SUITE 2: In-Room Messaging Permissions & Sender Spoofing Protection
    // ------------------------------------------------------------------------
    console.log('\n--- SUITE 2: In-Room Messaging Permissions & Sender Spoofing ---');

    // 2.1 Unauthenticated POST /api/lobbies/[id]/messages -> 401
    await assertResponse(
      '2.1 Unauthenticated POST /api/lobbies/[id]/messages returns 401',
      () => lobbiesMessagesPost(buildRequest('http://localhost:3000/api/lobbies/lobby-chess-1/messages', { method: 'POST', body: { text: 'Hello' } }), { params: { id: 'lobby-chess-1' } }),
      401
    );

    // 2.2 Unauthenticated POST /api/meetups/[id]/messages -> 401
    await assertResponse(
      '2.2 Unauthenticated POST /api/meetups/[id]/messages returns 401',
      () => meetupsMessagesPost(buildRequest('http://localhost:3000/api/meetups/lobby-chess-1/messages', { method: 'POST', body: { text: 'Hello' } }), { params: { id: 'lobby-chess-1' } }),
      401
    );

    // 2.3 Non-member POST /api/lobbies/[id]/messages -> 403
    // user-elena is not a confirmed participant or host of lobby-chess-1
    await assertResponse(
      '2.3 Non-member POST /api/lobbies/[id]/messages returns 403',
      () => lobbiesMessagesPost(buildRequest('http://localhost:3000/api/lobbies/lobby-chess-1/messages', { method: 'POST', auth: { type: 'x-user-id', userId: 'user-elena' }, body: { text: 'I am not in room' } }), { params: { id: 'lobby-chess-1' } }),
      403,
      (body) => (body.errorDetail?.code === 'FORBIDDEN' ? null : 'Expected FORBIDDEN error')
    );

    // 2.4 Non-member POST /api/meetups/[id]/messages -> 403
    await assertResponse(
      '2.4 Non-member POST /api/meetups/[id]/messages returns 403',
      () => meetupsMessagesPost(buildRequest('http://localhost:3000/api/meetups/lobby-chess-1/messages', { method: 'POST', auth: { type: 'x-user-id', userId: 'user-elena' }, body: { text: 'I am not in room' } }), { params: { id: 'lobby-chess-1' } }),
      403
    );

    // 2.5 Injected / spoofed senderId in POST /api/lobbies/[id]/messages MUST be overwritten
    // user-liam (the host) attempts to send message with spoofed senderId: 'user-maya'
    await assertResponse(
      '2.5 Injected senderId in /api/lobbies/[id]/messages is overwritten by verified session user',
      () => lobbiesMessagesPost(
        buildRequest('http://localhost:3000/api/lobbies/lobby-chess-1/messages', {
          method: 'POST',
          auth: { type: 'x-user-id', userId: 'user-liam' },
          body: {
            text: 'I am impersonating Maya',
            senderId: 'user-maya', // SPOOF ATTEMPT
            senderName: 'Maya Impersonator',
            senderAvatar: 'https://evil.com/fake.png',
          },
        }),
        { params: { id: 'lobby-chess-1' } }
      ),
      201,
      (body) => {
        const msg = body.message;
        if (!msg) return 'No message in response';
        if (msg.senderId !== 'user-liam') return `Impersonation detected! Got senderId: ${msg.senderId}, expected user-liam`;
        if (msg.senderName !== 'Liam Vance') return `Impersonated name accepted! Got senderName: ${msg.senderName}`;
        if (msg.senderAvatar === 'https://evil.com/fake.png') return 'Impersonated avatar accepted!';
        return null;
      }
    );

    // 2.6 Injected / spoofed senderId in POST /api/meetups/[id]/messages MUST be overwritten
    await assertResponse(
      '2.6 Injected senderId in /api/meetups/[id]/messages is overwritten by verified session user',
      () => meetupsMessagesPost(
        buildRequest('http://localhost:3000/api/meetups/lobby-chess-1/messages', {
          method: 'POST',
          auth: { type: 'x-user-id', userId: 'user-liam' },
          body: {
            text: 'I am impersonating Sarah',
            senderId: 'user-google-1793639782323', // SPOOF ATTEMPT
            senderName: 'Sarah Connor',
          },
        }),
        { params: { id: 'lobby-chess-1' } }
      ),
      201,
      (body) => {
        const msg = body.message || body.data?.message;
        if (!msg) return 'No message in response';
        if (msg.senderId !== 'user-liam') return `Impersonation detected! Got senderId: ${msg.senderId}, expected user-liam`;
        if (msg.senderName !== 'Liam Vance') return `Impersonated name accepted! Got senderName: ${msg.senderName}`;
        return null;
      }
    );

    // 2.7 Empty text message -> 400
    await assertResponse(
      '2.7 Empty text in message returns 400',
      () => meetupsMessagesPost(buildRequest('http://localhost:3000/api/meetups/lobby-chess-1/messages', { method: 'POST', auth: { type: 'x-user-id', userId: 'user-liam' }, body: { text: '' } }), { params: { id: 'lobby-chess-1' } }),
      400
    );

    // 2.8 Whitespace-only text message -> 400
    await assertResponse(
      '2.8 Whitespace-only text in message returns 400',
      () => meetupsMessagesPost(buildRequest('http://localhost:3000/api/meetups/lobby-chess-1/messages', { method: 'POST', auth: { type: 'x-user-id', userId: 'user-liam' }, body: { text: '     ' } }), { params: { id: 'lobby-chess-1' } }),
      400
    );

    // 2.9 Oversized message (>1000 chars) -> 400
    const hugeText = 'A'.repeat(1005);
    await assertResponse(
      '2.9 Oversized message (>1000 characters) returns 400',
      () => meetupsMessagesPost(buildRequest('http://localhost:3000/api/meetups/lobby-chess-1/messages', { method: 'POST', auth: { type: 'x-user-id', userId: 'user-liam' }, body: { text: hugeText } }), { params: { id: 'lobby-chess-1' } }),
      400
    );

    // Restore DB after Suite 2
    await restoreDatabase();

    // ------------------------------------------------------------------------
    // SUITE 3: User Administration & Privilege Escalation Hardening
    // ------------------------------------------------------------------------
    console.log('\n--- SUITE 3: User Admin & Privilege Escalation Hardening ---');

    // 3.1 Unauthenticated POST /api/users with action: 'ADMIN_ACTION' -> 401
    await assertResponse(
      '3.1 Unauthenticated POST /api/users (ADMIN_ACTION) returns 401',
      () => usersPost(buildRequest('http://localhost:3000/api/users', { method: 'POST', body: { action: 'ADMIN_ACTION', subAction: 'VERIFY_USER', targetUserId: 'user-elena' } })),
      401,
      (body) => (body.errorDetail?.code === 'UNAUTHORIZED' ? null : 'Expected UNAUTHORIZED error')
    );

    // 3.2 Non-admin user (user-liam, role USER) invoking ADMIN_ACTION -> 403
    await assertResponse(
      '3.2 Non-admin user invoking ADMIN_ACTION/VERIFY_USER returns 403',
      () => usersPost(buildRequest('http://localhost:3000/api/users', {
        method: 'POST',
        auth: { type: 'x-user-id', userId: 'user-liam' },
        body: { action: 'ADMIN_ACTION', subAction: 'VERIFY_USER', targetUserId: 'user-elena' },
      })),
      403,
      (body) => (body.errorDetail?.code === 'FORBIDDEN' ? null : 'Expected FORBIDDEN error')
    );

    // 3.3 Non-admin user invoking ADMIN_ACTION/BAN_USER -> 403
    await assertResponse(
      '3.3 Non-admin user invoking ADMIN_ACTION/BAN_USER returns 403',
      () => usersPost(buildRequest('http://localhost:3000/api/users', {
        method: 'POST',
        auth: { type: 'x-user-id', userId: 'user-liam' },
        body: { action: 'ADMIN_ACTION', subAction: 'BAN_USER', targetUserId: 'user-elena', banReason: 'Malicious ban attempt' },
      })),
      403
    );

    // 3.4 Non-admin user attempting privilege escalation via CHANGE_ROLE -> 403
    await assertResponse(
      '3.4 Non-admin attempting privilege escalation to ADMIN returns 403',
      () => usersPost(buildRequest('http://localhost:3000/api/users', {
        method: 'POST',
        auth: { type: 'x-user-id', userId: 'user-liam' },
        body: { action: 'ADMIN_ACTION', subAction: 'CHANGE_ROLE', targetUserId: 'user-liam', newRole: 'ADMIN' },
      })),
      403
    );

    // 3.5 Non-admin user attempting DELETE_USER -> 403
    await assertResponse(
      '3.5 Non-admin user invoking ADMIN_ACTION/DELETE_USER returns 403',
      () => usersPost(buildRequest('http://localhost:3000/api/users', {
        method: 'POST',
        auth: { type: 'x-user-id', userId: 'user-liam' },
        body: { action: 'ADMIN_ACTION', subAction: 'DELETE_USER', targetUserId: 'user-elena' },
      })),
      403
    );

    // 3.6 Non-admin user attempting privilege escalation via fake headers -> 403
    await assertResponse(
      '3.6 Privilege escalation attempt with fake headers (x-user-role: ADMIN) returns 403',
      () => usersPost(buildRequest('http://localhost:3000/api/users', {
        method: 'POST',
        auth: { type: 'x-user-id', userId: 'user-liam' },
        headers: { 'x-user-role': 'ADMIN', 'role': 'ADMIN' },
        body: { action: 'ADMIN_ACTION', subAction: 'VERIFY_USER', targetUserId: 'user-elena' },
      })),
      403
    );

    // 3.7 Admin user (user-maya, role ADMIN) invoking ADMIN_ACTION -> 200
    await assertResponse(
      '3.7 Verified Admin (user-maya) invoking ADMIN_ACTION succeeds with 200',
      () => usersPost(buildRequest('http://localhost:3000/api/users', {
        method: 'POST',
        auth: { type: 'x-user-id', userId: 'user-maya' },
        body: { action: 'ADMIN_ACTION', subAction: 'VERIFY_USER', targetUserId: 'user-elena' },
      })),
      200,
      (body) => (body.target?.verified === true ? null : 'Expected target user to be verified')
    );

    // Restore DB after Suite 3
    await restoreDatabase();

    // ------------------------------------------------------------------------
    // SUITE 4: Host-Only Meetup Join/Lifecycle Actions
    // ------------------------------------------------------------------------
    console.log('\n--- SUITE 4: Host-Only Join Actions ---');

    // 4.1 Non-host POST /api/lobbies/[id]/join with BAN_FROM_LOBBY -> 403
    await assertResponse(
      '4.1 Non-host POST /api/lobbies/[id]/join (BAN_FROM_LOBBY) returns 403',
      () => lobbiesJoinPost(buildRequest('http://localhost:3000/api/lobbies/lobby-chess-1/join', {
        method: 'POST',
        auth: { type: 'x-user-id', userId: 'user-elena' }, // not host
        body: { action: 'BAN_FROM_LOBBY', targetUserId: 'user-marcus' },
      }), { params: { id: 'lobby-chess-1' } }),
      403,
      (body) => (body.errorDetail?.code === 'FORBIDDEN' ? null : 'Expected FORBIDDEN error')
    );

    // 4.2 Non-host POST /api/meetups/[id]/join with BAN_FROM_LOBBY -> 403
    await assertResponse(
      '4.2 Non-host POST /api/meetups/[id]/join (BAN_FROM_LOBBY) returns 403',
      () => meetupsJoinPost(buildRequest('http://localhost:3000/api/meetups/lobby-chess-1/join', {
        method: 'POST',
        auth: { type: 'x-user-id', userId: 'user-elena' },
        body: { action: 'BAN_FROM_LOBBY', targetUserId: 'user-marcus' },
      }), { params: { id: 'lobby-chess-1' } }),
      403
    );

    // 4.3 Non-host POST /api/lobbies/[id]/join with ACCEPT_REQUEST -> 403
    await assertResponse(
      '4.3 Non-host POST /api/lobbies/[id]/join (ACCEPT_REQUEST) returns 403',
      () => lobbiesJoinPost(buildRequest('http://localhost:3000/api/lobbies/lobby-chess-1/join', {
        method: 'POST',
        auth: { type: 'x-user-id', userId: 'user-elena' },
        body: { action: 'ACCEPT_REQUEST', requestId: 'req-fake-123' },
      }), { params: { id: 'lobby-chess-1' } }),
      403
    );

    // 4.4 Non-host POST /api/meetups/[id]/join with ACCEPT_REQUEST -> 403
    await assertResponse(
      '4.4 Non-host POST /api/meetups/[id]/join (ACCEPT_REQUEST) returns 403',
      () => meetupsJoinPost(buildRequest('http://localhost:3000/api/meetups/lobby-chess-1/join', {
        method: 'POST',
        auth: { type: 'x-user-id', userId: 'user-elena' },
        body: { action: 'ACCEPT_REQUEST', requestId: 'req-fake-123' },
      }), { params: { id: 'lobby-chess-1' } }),
      403
    );

    // 4.5 Non-host POST /api/lobbies/[id]/join with DECLINE_REQUEST -> 403
    await assertResponse(
      '4.5 Non-host POST /api/lobbies/[id]/join (DECLINE_REQUEST) returns 403',
      () => lobbiesJoinPost(buildRequest('http://localhost:3000/api/lobbies/lobby-chess-1/join', {
        method: 'POST',
        auth: { type: 'x-user-id', userId: 'user-elena' },
        body: { action: 'DECLINE_REQUEST', requestId: 'req-fake-123' },
      }), { params: { id: 'lobby-chess-1' } }),
      403
    );

    // 4.6 Non-host POST /api/meetups/[id]/join with DECLINE_REQUEST -> 403
    await assertResponse(
      '4.6 Non-host POST /api/meetups/[id]/join (DECLINE_REQUEST) returns 403',
      () => meetupsJoinPost(buildRequest('http://localhost:3000/api/meetups/lobby-chess-1/join', {
        method: 'POST',
        auth: { type: 'x-user-id', userId: 'user-elena' },
        body: { action: 'DECLINE_REQUEST', requestId: 'req-fake-123' },
      }), { params: { id: 'lobby-chess-1' } }),
      403
    );

    // 4.7 Host attempting to ban themselves returns 400
    await assertResponse(
      '4.7 Host attempting BAN_FROM_LOBBY on themselves returns 400',
      () => meetupsJoinPost(buildRequest('http://localhost:3000/api/meetups/lobby-chess-1/join', {
        method: 'POST',
        auth: { type: 'x-user-id', userId: 'user-liam' }, // host
        body: { action: 'BAN_FROM_LOBBY', targetUserId: 'user-liam' }, // target self
      }), { params: { id: 'lobby-chess-1' } }),
      400
    );

    // 4.8 Unauthenticated request to BAN_FROM_LOBBY returns 401
    await assertResponse(
      '4.8 Unauthenticated BAN_FROM_LOBBY returns 401',
      () => meetupsJoinPost(buildRequest('http://localhost:3000/api/meetups/lobby-chess-1/join', {
        method: 'POST',
        body: { action: 'BAN_FROM_LOBBY', targetUserId: 'user-elena' },
      }), { params: { id: 'lobby-chess-1' } }),
      401
    );

    // Restore DB after Suite 4
    await restoreDatabase();

    // ------------------------------------------------------------------------
    // SUITE 5: Participant Self-Actions & Tampering (CHECK_IN & LEAVE)
    // ------------------------------------------------------------------------
    console.log('\n--- SUITE 5: Participant Self-Actions & Tampering ---');

    // 5.1 Unauthenticated CHECK_IN returns 401
    await assertResponse(
      '5.1 Unauthenticated CHECK_IN returns 401',
      () => meetupsJoinPost(buildRequest('http://localhost:3000/api/meetups/lobby-chess-1/join', {
        method: 'POST',
        body: { action: 'CHECK_IN', arrivalStatus: 'ARRIVED' },
      }), { params: { id: 'lobby-chess-1' } }),
      401
    );

    // 5.2 Authenticated user attempting CHECK_IN on behalf of another user -> 403
    // user-elena attempts to check in for user-liam
    await assertResponse(
      '5.2 Authenticated user attempting CHECK_IN for another user returns 403 (meetups)',
      () => meetupsJoinPost(buildRequest('http://localhost:3000/api/meetups/lobby-chess-1/join', {
        method: 'POST',
        auth: { type: 'x-user-id', userId: 'user-elena' },
        body: { action: 'CHECK_IN', targetUserId: 'user-liam', arrivalStatus: 'ARRIVED' },
      }), { params: { id: 'lobby-chess-1' } }),
      403,
      (body) => (body.errorDetail?.code === 'FORBIDDEN' ? null : 'Expected FORBIDDEN error')
    );

    // 5.3 Same check on legacy /api/lobbies/[id]/join -> 403
    await assertResponse(
      '5.3 Authenticated user attempting CHECK_IN for another user returns 403 (lobbies)',
      () => lobbiesJoinPost(buildRequest('http://localhost:3000/api/lobbies/lobby-chess-1/join', {
        method: 'POST',
        auth: { type: 'x-user-id', userId: 'user-elena' },
        body: { action: 'CHECK_IN', targetUserId: 'user-liam', arrivalStatus: 'ARRIVED' },
      }), { params: { id: 'lobby-chess-1' } }),
      403
    );

    // 5.4 Authenticated user attempting LEAVE on behalf of another user -> 403
    await assertResponse(
      '5.4 Authenticated user attempting LEAVE for another user returns 403',
      () => meetupsJoinPost(buildRequest('http://localhost:3000/api/meetups/lobby-chess-1/join', {
        method: 'POST',
        auth: { type: 'x-user-id', userId: 'user-elena' },
        body: { action: 'LEAVE', targetUserId: 'user-liam' },
      }), { params: { id: 'lobby-chess-1' } }),
      403
    );

    // 5.5 Host attempting LEAVE without cancelling -> 400
    await assertResponse(
      '5.5 Host attempting LEAVE instead of deleting/cancelling returns 400',
      () => meetupsJoinPost(buildRequest('http://localhost:3000/api/meetups/lobby-chess-1/join', {
        method: 'POST',
        auth: { type: 'x-user-id', userId: 'user-liam' }, // host
        body: { action: 'LEAVE', targetUserId: 'user-liam' },
      }), { params: { id: 'lobby-chess-1' } }),
      400
    );

    // 5.6 Confirmed participant checking in for themselves -> 200 (CHECKED_IN)
    // user-liam is participant in lobby-chess-1
    await assertResponse(
      '5.6 Confirmed participant CHECK_IN for self succeeds with 200 and CHECKED_IN',
      () => meetupsJoinPost(buildRequest('http://localhost:3000/api/meetups/lobby-chess-1/join', {
        method: 'POST',
        auth: { type: 'x-user-id', userId: 'user-liam' },
        body: { action: 'CHECK_IN', targetUserId: 'user-liam', arrivalStatus: 'ARRIVED', spotClue: 'Table 2' },
      }), { params: { id: 'lobby-chess-1' } }),
      200,
      (body) => (body.status === 'CHECKED_IN' || body.data?.status === 'CHECKED_IN' ? null : 'Expected CHECKED_IN status')
    );

    // Restore DB after Suite 5
    await restoreDatabase();

    // ------------------------------------------------------------------------
    // SUITE 6: Advanced Adversarial Penetration (Edge Cases & Invariants)
    // ------------------------------------------------------------------------
    console.log('\n--- SUITE 6: Advanced Adversarial Penetration & Invariants ---');

    // 6.1 Suspended/banned user (isBanned: true) is blocked by requireAuth -> 403
    // We create a temporary banned user in DB
    const db = await readDb();
    const bannedUser: UserPersona = {
      id: 'user-banned-attacker',
      email: 'hacker@banned.com',
      name: 'Banned Attacker',
      age: 30,
      avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
      skillBadge: 'Banned',
      tagline: 'Suspended account',
      neighborhood: 'Nowhere',
      verified: false,
      role: 'USER',
      isBanned: true,
      banReason: 'Security violation test',
      reliabilityScore: 0,
      meetupsAttended: 0,
      hoursPlayed: 0,
      ratingAvg: 0,
      ratingCount: 0,
      streakWeeks: 0,
      bannedUserIds: [],
      regularPartnerIds: [],
      favoriteActivities: [],
      settings: {
        iosAndroidPush: false,
        soundEffects: false,
        hapticFeedback: false,
        distanceUnit: 'km',
        profileVisible: false,
        showReliabilityScore: false,
      },
    };
    db.personas.push(bannedUser);
    await writeDb(db);

    await assertResponse(
      '6.1 Suspended user (isBanned: true) is rejected by requireAuth with 403',
      () => meetupsMessagesPost(buildRequest('http://localhost:3000/api/meetups/lobby-chess-1/messages', {
        method: 'POST',
        auth: { type: 'x-user-id', userId: 'user-banned-attacker' },
        body: { text: 'I am banned but trying to chat' },
      }), { params: { id: 'lobby-chess-1' } }),
      403,
      (body) => (body.errorDetail?.code === 'FORBIDDEN' ? null : 'Expected FORBIDDEN error')
    );

    // 6.2 User banned from specific meetup attempting to JOIN -> 403
    // In db, ban user-elena from lobby-chess-1
    const db2 = await readDb();
    const chessMeetup = db2.lobbies.find((l) => l.id === 'lobby-chess-1');
    if (chessMeetup) {
      chessMeetup.bannedUserIds = chessMeetup.bannedUserIds || [];
      chessMeetup.bannedUserIds.push('user-elena');
      await writeDb(db2);
    }

    await assertResponse(
      '6.2 User banned from meetup attempting JOIN returns 403',
      () => meetupsJoinPost(buildRequest('http://localhost:3000/api/meetups/lobby-chess-1/join', {
        method: 'POST',
        auth: { type: 'x-user-id', userId: 'user-elena' },
        body: { action: 'JOIN' },
      }), { params: { id: 'lobby-chess-1' } }),
      403,
      (body) => (body.errorDetail?.code === 'FORBIDDEN' ? null : 'Expected FORBIDDEN error')
    );

    // 6.3 Full capacity room rejecting additional JOIN with 400
    // Set lobby-chess-1 maxParticipants = 1 (already has 1 participant)
    const db3 = await readDb();
    const chessMeetupFull = db3.lobbies.find((l) => l.id === 'lobby-chess-1');
    if (chessMeetupFull) {
      chessMeetupFull.bannedUserIds = []; // clear ban
      chessMeetupFull.maxParticipants = chessMeetupFull.participants.length; // max capacity reached
      await writeDb(db3);
    }

    await assertResponse(
      '6.3 Full capacity room rejecting additional JOIN returns 400',
      () => meetupsJoinPost(buildRequest('http://localhost:3000/api/meetups/lobby-chess-1/join', {
        method: 'POST',
        auth: { type: 'x-user-id', userId: 'user-elena' },
        body: { action: 'JOIN' },
      }), { params: { id: 'lobby-chess-1' } }),
      400
    );

    // 6.4 Non-host / non-admin attempting PUT /api/meetups/[id] -> 403
    await assertResponse(
      '6.4 Non-host attempting PUT /api/meetups/[id] to edit details returns 403',
      () => meetupsPut(buildRequest('http://localhost:3000/api/meetups/lobby-chess-1', {
        method: 'PUT',
        auth: { type: 'x-user-id', userId: 'user-elena' },
        body: { title: 'Hacked Title By Elena' },
      }), { params: { id: 'lobby-chess-1' } }),
      403
    );

    // 6.5 Host attempting PUT /api/meetups/[id] to reduce capacity below participant count -> 400
    // Add a 3rd participant to lobby-chess-1 so participants.length === 3, then attempt maxParticipants: 2
    const db4 = await readDb();
    const chessMeetup3 = db4.lobbies.find((l) => l.id === 'lobby-chess-1');
    if (chessMeetup3) {
      chessMeetup3.participants = [
        { id: 'user-liam', name: 'Liam', age: 27, avatar: '', skillBadge: '', joinedAt: '' },
        { id: 'user-maya', name: 'Maya', age: 24, avatar: '', skillBadge: '', joinedAt: '' },
        { id: 'user-elena', name: 'Elena', age: 25, avatar: '', skillBadge: '', joinedAt: '' },
      ];
      chessMeetup3.maxParticipants = 4;
      await writeDb(db4);
    }

    await assertResponse(
      '6.5 Host attempting PUT /api/meetups/[id] reducing capacity below participant count returns 400',
      () => meetupsPut(buildRequest('http://localhost:3000/api/meetups/lobby-chess-1', {
        method: 'PUT',
        auth: { type: 'x-user-id', userId: 'user-liam' }, // host
        body: { maxParticipants: 2 }, // 2 < 3 participants -> must return 400
      }), { params: { id: 'lobby-chess-1' } }),
      400,
      (body) => (body.error?.includes('Cannot reduce capacity') ? null : 'Expected capacity error message')
    );

    // Final database restoration
    await restoreDatabase();

  } catch (err: any) {
    console.error('Fatal suite execution error:', err);
  } finally {
    await restoreDatabase();
  }

  // ==========================================================================
  // SUMMARY REPORT
  // ==========================================================================
  console.log('\n================================================================');
  console.log('EMPIRICAL SECURITY PERMISSION TEST RESULTS');
  console.log('================================================================');
  console.log(`Total Assertions Evaluated: ${totalTests}`);
  console.log(`Passed:                    ${passedTests}`);
  console.log(`Failed:                    ${failedTests}`);
  console.log(`Pass Rate:                 ${((passedTests / totalTests) * 100).toFixed(1)}%`);
  console.log('================================================================\n');

  if (failedTests > 0) {
    console.error(`FAILED TESTS (${failedTests}):`);
    results.filter(r => !r.passed).forEach(r => {
      console.error(`- ${r.name}: ${r.detail}`);
    });
    process.exit(1);
  } else {
    console.log('ALL SECURITY PERMISSION INVARIANTS EMPIRICALLY VERIFIED! VERDICT: APPROVE');
    process.exit(0);
  }
}

runAllSuites();
