import { NextRequest } from 'next/server';
import {
  CreateMeetupInputSchema,
  UpdateProfileInputSchema,
  SendMessageInputSchema,
  JoinActionSchema,
  validatePayload,
} from '../src/lib/types';
import {
  extractSessionUserId,
  requireAuth,
  authenticateRequest,
  optionalAuth,
  AuthError,
} from '../src/lib/auth-guard';
import {
  readDb,
  writeDb,
  meetupRepository,
} from '../src/lib/db';
import { POST as createMeetupHandler, GET as listMeetupsHandler } from '../src/app/api/meetups/route';
import {
  GET as getMeetupHandler,
  PUT as updateMeetupHandler,
  DELETE as deleteMeetupHandler,
} from '../src/app/api/meetups/[id]/route';
import { POST as joinMeetupHandler } from '../src/app/api/meetups/[id]/join/route';
import { POST as postMessageHandler, GET as getMessagesHandler } from '../src/app/api/meetups/[id]/messages/route';
import { GET as getProfileHandler, PUT as updateProfileHandler } from '../src/app/api/users/profile/route';
import { POST as sessionHandler, GET as getSessionHandler } from '../src/app/api/auth/session/route';
import { POST as usersActionHandler } from '../src/app/api/users/route';

interface TestResult {
  suite: string;
  test: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

function assert(condition: boolean, suite: string, test: string, message?: string) {
  if (condition) {
    results.push({ suite, test, passed: true });
    console.log(`  ✓ [PASS] ${suite} -> ${test}`);
  } else {
    results.push({ suite, test, passed: false, error: message || 'Assertion failed' });
    console.error(`  ✗ [FAIL] ${suite} -> ${test}: ${message || 'Assertion failed'}`);
  }
}

async function runAudit() {
  console.log('=== STARTING FORENSIC INTEGRITY AUDIT (MILESTONE 2) ===\n');

  // =========================================================================
  // CHECK 1: Zod Schema Integrity & Runtime Validation
  // =========================================================================
  console.log('--- 1. Testing Zod Schema Integrity & Runtime Validation ---');

  // 1.1 CreateMeetupInputSchema validation
  const invalidMeetup1 = validatePayload(CreateMeetupInputSchema, {
    title: 'ab', // < 3 chars
    category: 'Chess',
    venueName: 'Park',
    lat: 40.7,
    lng: -74.0,
  });
  assert(
    !('data' in invalidMeetup1) && Boolean(invalidMeetup1.error?.includes('Title')),
    'Zod Schemas',
    'CreateMeetup rejects short title (< 3 chars)',
    JSON.stringify(invalidMeetup1)
  );

  const invalidMeetup2 = validatePayload(CreateMeetupInputSchema, {
    title: 'Valid Title',
    category: 'Chess',
    venueName: 'Park',
    lat: 105, // > 90
    lng: -74.0,
  });
  assert(
    !('data' in invalidMeetup2) && Boolean(invalidMeetup2.error?.includes('lat')),
    'Zod Schemas',
    'CreateMeetup rejects latitude > 90',
    JSON.stringify(invalidMeetup2)
  );

  const invalidMeetup3 = validatePayload(CreateMeetupInputSchema, {
    title: 'Valid Title',
    category: 'Chess',
    venueName: 'Park',
    lat: 40.7,
    lng: -74.0,
    maxParticipants: 1, // < 2
  });
  assert(
    !('data' in invalidMeetup3) && Boolean(invalidMeetup3.error?.includes('maxParticipants')),
    'Zod Schemas',
    'CreateMeetup rejects maxParticipants < 2',
    JSON.stringify(invalidMeetup3)
  );

  const invalidMeetup4 = validatePayload(CreateMeetupInputSchema, {
    title: 'Valid Title',
    category: 'Chess',
    venueName: 'Park',
    lat: 40.7,
    lng: -74.0,
    maxParticipants: 20, // > 16
  });
  assert(
    !('data' in invalidMeetup4) && Boolean(invalidMeetup4.error?.includes('maxParticipants')),
    'Zod Schemas',
    'CreateMeetup rejects maxParticipants > 16',
    JSON.stringify(invalidMeetup4)
  );

  const validMeetup = validatePayload(CreateMeetupInputSchema, {
    title: 'Chess in Washington Square Park',
    category: 'Chess',
    venueName: 'Washington Square Park',
    lat: 40.7308,
    lng: -73.9973,
    maxParticipants: 6,
    startTime: 'Now',
    joinMode: 'OPEN',
  });
  assert(
    Boolean('data' in validMeetup && validMeetup.data?.title === 'Chess in Washington Square Park'),
    'Zod Schemas',
    'CreateMeetup accepts valid payload',
    JSON.stringify(validMeetup)
  );

  // 1.2 UpdateProfileInputSchema validation
  const invalidProfile1 = validatePayload(UpdateProfileInputSchema, {
    age: 15, // < 18
  });
  assert(
    !('data' in invalidProfile1) && Boolean(invalidProfile1.error?.includes('Age')),
    'Zod Schemas',
    'UpdateProfile rejects age < 18',
    JSON.stringify(invalidProfile1)
  );

  const invalidProfile2 = validatePayload(UpdateProfileInputSchema, {
    name: 'X', // < 2 chars
  });
  assert(
    !('data' in invalidProfile2) && Boolean(invalidProfile2.error?.includes('Name')),
    'Zod Schemas',
    'UpdateProfile rejects name < 2 chars',
    JSON.stringify(invalidProfile2)
  );

  // 1.3 SendMessageInputSchema validation
  const invalidMessage1 = validatePayload(SendMessageInputSchema, {
    text: '',
  });
  assert(
    !('data' in invalidMessage1) && Boolean(invalidMessage1.error),
    'Zod Schemas',
    'SendMessage rejects empty string',
    JSON.stringify(invalidMessage1)
  );

  const invalidMessage2 = validatePayload(SendMessageInputSchema, {
    text: 'A'.repeat(1001), // > 1000
  });
  assert(
    !('data' in invalidMessage2) && Boolean(invalidMessage2.error),
    'Zod Schemas',
    'SendMessage rejects text > 1000 chars',
    JSON.stringify(invalidMessage2)
  );

  // =========================================================================
  // CHECK 2: Server-Side Auth Guard & Access Control Enforcement
  // =========================================================================
  console.log('\n--- 2. Testing Server-Side Auth Guard & Session Extraction ---');

  // 2.1 extractSessionUserId from cookie
  const reqWithCookie = new NextRequest('http://localhost:3000/api/auth/session', {
    headers: { cookie: 'seeme_session=user-maya' },
  });
  assert(
    extractSessionUserId(reqWithCookie) === 'user-maya',
    'Auth Guard',
    'Extracts user ID from seeme_session cookie'
  );

  // 2.2 extractSessionUserId from JSON cookie
  const reqWithJsonCookie = new NextRequest('http://localhost:3000/api/auth/session', {
    headers: { cookie: 'seeme_session=' + JSON.stringify({ userId: 'user-liam' }) },
  });
  assert(
    extractSessionUserId(reqWithJsonCookie) === 'user-liam',
    'Auth Guard',
    'Extracts user ID from JSON-encoded cookie'
  );

  // 2.3 extractSessionUserId from Bearer Authorization
  const reqWithBearer = new NextRequest('http://localhost:3000/api/auth/session', {
    headers: { authorization: 'Bearer user-alex' },
  });
  assert(
    extractSessionUserId(reqWithBearer) === 'user-alex',
    'Auth Guard',
    'Extracts user ID from Bearer token'
  );

  // 2.4 extractSessionUserId from x-user-id
  const reqWithXUserId = new NextRequest('http://localhost:3000/api/auth/session', {
    headers: { 'x-user-id': 'user-sophia' },
  });
  assert(
    extractSessionUserId(reqWithXUserId) === 'user-sophia',
    'Auth Guard',
    'Extracts user ID from x-user-id header'
  );

  // 2.5 requireAuth missing session
  const reqNoAuth = new NextRequest('http://localhost:3000/api/auth/session');
  let err401Missing: any = null;
  try {
    await requireAuth(reqNoAuth);
  } catch (e) {
    err401Missing = e;
  }
  assert(
    err401Missing instanceof AuthError && err401Missing.status === 401,
    'Auth Guard',
    'requireAuth throws 401 when unauthenticated'
  );

  // 2.6 requireAuth unknown user
  const reqUnknown = new NextRequest('http://localhost:3000/api/auth/session', {
    headers: { 'x-user-id': 'non-existent-user-12345' },
  });
  let err401Unknown: any = null;
  try {
    await requireAuth(reqUnknown);
  } catch (e) {
    err401Unknown = e;
  }
  assert(
    err401Unknown instanceof AuthError && err401Unknown.status === 401,
    'Auth Guard',
    'requireAuth throws 401 for unknown user ID'
  );

  // 2.7 requireAuth banned user throws 403
  // Setup a test banned user in db
  const initialDb = await readDb();
  const testBannedUser = {
    ...initialDb.personas[0],
    id: 'user-test-banned-forensic',
    name: 'Banned Test User',
    email: 'banned.test@seeme.app',
    isBanned: true,
    banReason: 'Forensic test suspension',
  };
  initialDb.personas.push(testBannedUser);
  await writeDb(initialDb);

  const reqBanned = new NextRequest('http://localhost:3000/api/auth/session', {
    headers: { 'x-user-id': 'user-test-banned-forensic' },
  });
  let err403Banned: any = null;
  try {
    await requireAuth(reqBanned);
  } catch (e) {
    err403Banned = e;
  }
  assert(
    err403Banned instanceof AuthError && err403Banned.status === 403,
    'Auth Guard',
    'requireAuth throws 403 for banned user'
  );

  // 2.8 requireAuth valid active user
  const reqValid = new NextRequest('http://localhost:3000/api/auth/session', {
    headers: { 'x-user-id': 'user-maya' },
  });
  const authValid = await requireAuth(reqValid);
  assert(
    authValid.user && authValid.user.id === 'user-maya' && authValid.user.role === 'ADMIN',
    'Auth Guard',
    'requireAuth resolves valid user persona'
  );

  // =========================================================================
  // CHECK 3: Concurrency & Persistence Integrity
  // =========================================================================
  console.log('\n--- 3. Testing Concurrency Mutex & Atomic File Persistence ---');

  // 3.1 Concurrency stress test: 20 parallel writes
  const CONCURRENCY_OPS = 20;
  const startDb = await readDb();
  const initialNotificationsCount = startDb.notifications?.length || 0;

  const parallelPromises = Array.from({ length: CONCURRENCY_OPS }).map(async (_, idx) => {
    const dbSnapshot = await readDb();
    dbSnapshot.notifications = dbSnapshot.notifications || [];
    dbSnapshot.notifications.push({
      id: `forensic-notif-${Date.now()}-${idx}-${Math.random()}`,
      userId: 'user-maya',
      type: 'SYSTEM',
      title: `Concurrent write test ${idx}`,
      body: 'Testing mutex serialization queue',
      read: false,
      createdAt: new Date().toISOString(),
    });
    await writeDb(dbSnapshot);
  });

  let concurrencyError: any = null;
  try {
    await Promise.all(parallelPromises);
  } catch (e) {
    concurrencyError = e;
  }

  assert(
    concurrencyError === null,
    'Concurrency & Storage',
    `20 parallel writeDb operations completed without error or crash`,
    concurrencyError?.message
  );

  const postConcurrencyDb = await readDb();
  assert(
    Array.isArray(postConcurrencyDb.lobbies) &&
      Array.isArray(postConcurrencyDb.personas) &&
      Array.isArray(postConcurrencyDb.notifications),
    'Concurrency & Storage',
    'Database remains intact and valid JSON after concurrent execution'
  );

  // 3.2 IMeetupRepository functionality
  const repoCreated = await meetupRepository.createMeetup({
    title: 'Repo Test Meetup',
    category: 'Tennis',
    venueName: 'Hudson River Courts',
    lat: 40.72,
    lng: -74.01,
    startTime: 'Now',
    maxParticipants: 4,
    joinMode: 'OPEN',
    skillCompatibility: 'ALL_LEVELS',
    hostId: 'user-maya',
    participants: [],
  } as any);

  assert(
    Boolean(repoCreated && repoCreated.id && repoCreated.title === 'Repo Test Meetup'),
    'Repository Methods',
    'meetupRepository.createMeetup creates and persists meetup'
  );

  const repoFetched = await meetupRepository.getMeetup(repoCreated.id);
  assert(
    repoFetched !== null && repoFetched.id === repoCreated.id,
    'Repository Methods',
    'meetupRepository.getMeetup retrieves persisted meetup'
  );

  const repoUpdated = await meetupRepository.updateMeetup(repoCreated.id, {
    venueName: 'Updated Hudson Courts',
  });
  assert(
    repoUpdated !== null && repoUpdated.venueName === 'Updated Hudson Courts',
    'Repository Methods',
    'meetupRepository.updateMeetup updates fields and persists'
  );

  const repoListed = await meetupRepository.listMeetups({ category: 'Tennis' });
  assert(
    repoListed.some((m) => m.id === repoCreated.id),
    'Repository Methods',
    'meetupRepository.listMeetups filters by category'
  );

  const repoDeleted = await meetupRepository.deleteMeetup(repoCreated.id);
  assert(
    repoDeleted === true,
    'Repository Methods',
    'meetupRepository.deleteMeetup deletes meetup and cascades'
  );

  const repoPostDelete = await meetupRepository.getMeetup(repoCreated.id);
  assert(
    repoPostDelete === null,
    'Repository Methods',
    'meetupRepository.getMeetup returns null after deletion'
  );

  // =========================================================================
  // CHECK 4: API Route Handlers & Server-Side Permission Gates
  // =========================================================================
  console.log('\n--- 4. Testing API Route Handlers & Permission Gates ---');

  // 4.1 POST /api/meetups unauthenticated -> 401
  const reqCreateUnauth = new NextRequest('http://localhost:3000/api/meetups', {
    method: 'POST',
    body: JSON.stringify({
      title: 'Valid Title',
      category: 'Chess',
      venueName: 'Park',
      lat: 40.7,
      lng: -74.0,
    }),
  });
  const resCreateUnauth = await createMeetupHandler(reqCreateUnauth);
  assert(
    resCreateUnauth.status === 401,
    'API Permissions',
    'POST /api/meetups returns 401 when unauthenticated'
  );

  // 4.2 POST /api/meetups invalid body -> 400
  const reqCreateInvalid = new NextRequest('http://localhost:3000/api/meetups', {
    method: 'POST',
    headers: { 'x-user-id': 'user-maya' },
    body: JSON.stringify({
      title: 'No', // < 3 chars
      category: 'Chess',
    }),
  });
  const resCreateInvalid = await createMeetupHandler(reqCreateInvalid);
  assert(
    resCreateInvalid.status === 400,
    'API Permissions',
    'POST /api/meetups returns 400 when body fails Zod schema'
  );

  // 4.3 POST /api/meetups valid body -> 201 with host enrolled
  const reqCreateValid = new NextRequest('http://localhost:3000/api/meetups', {
    method: 'POST',
    headers: { 'x-user-id': 'user-maya' },
    body: JSON.stringify({
      title: 'Forensic Audit Ping Pong Session',
      category: 'Ping Pong',
      venueName: 'Spin NYC',
      lat: 40.74,
      lng: -73.98,
      maxParticipants: 4,
      startTime: 'Now',
      joinMode: 'OPEN',
      spotClue: 'Table 4 in the back',
    }),
  });
  const resCreateValid = await createMeetupHandler(reqCreateValid);
  const dataCreateValid = await resCreateValid.json();
  const createdMeetupId = dataCreateValid.data?.meetup?.id || dataCreateValid.lobby?.id;

  assert(
    resCreateValid.status === 201 &&
      dataCreateValid.success === true &&
      dataCreateValid.lobby.participants.some((p: any) => p.id === 'user-maya'),
    'API Permissions',
    'POST /api/meetups returns 201 and auto-enrolls host as participant'
  );

  // 4.4 DELETE /api/meetups/[id] as non-host non-admin -> 403
  const reqDeleteUnauthorized = new NextRequest(
    `http://localhost:3000/api/meetups/${createdMeetupId}`,
    {
      method: 'DELETE',
      headers: { 'x-user-id': 'user-liam' }, // Liam is not the host of this meetup
    }
  );
  const resDeleteUnauthorized = await deleteMeetupHandler(reqDeleteUnauthorized, {
    params: { id: createdMeetupId },
  });
  assert(
    resDeleteUnauthorized.status === 403,
    'API Permissions',
    'DELETE /api/meetups/[id] returns 403 when called by non-host/non-admin'
  );

  // 4.5 POST /api/meetups/[id]/messages as non-member -> 403
  const reqMsgNonMember = new NextRequest(
    `http://localhost:3000/api/meetups/${createdMeetupId}/messages`,
    {
      method: 'POST',
      headers: { 'x-user-id': 'user-elena' }, // Elena is not in the meetup
      body: JSON.stringify({ text: 'Hello everyone!' }),
    }
  );
  const resMsgNonMember = await postMessageHandler(reqMsgNonMember, {
    params: { id: createdMeetupId },
  });
  assert(
    resMsgNonMember.status === 403,
    'API Permissions',
    'POST /api/meetups/[id]/messages returns 403 for non-member'
  );

  // 4.6 POST /api/meetups/[id]/messages as member -> 201, verifies senderId cannot be spoofed
  const reqMsgMember = new NextRequest(
    `http://localhost:3000/api/meetups/${createdMeetupId}/messages`,
    {
      method: 'POST',
      headers: { 'x-user-id': 'user-maya' }, // Maya is host/member
      body: JSON.stringify({
        text: 'Welcome to the meetup!',
        senderId: 'spoofed-user-id', // Attacker attempts to impersonate
      }),
    }
  );
  const resMsgMember = await postMessageHandler(reqMsgMember, {
    params: { id: createdMeetupId },
  });
  const dataMsgMember = await resMsgMember.json();
  assert(
    resMsgMember.status === 201 &&
      dataMsgMember.message.senderId === 'user-maya', // Verified session identity enforced!
    'API Permissions',
    'POST /api/meetups/[id]/messages prevents senderId impersonation and derives identity from session'
  );

  // 4.7 POST /api/meetups/[id]/join multi-action: JOIN, CHECK_IN, BAN
  // 4.7.1 Join open meetup
  const reqJoin = new NextRequest(
    `http://localhost:3000/api/meetups/${createdMeetupId}/join`,
    {
      method: 'POST',
      headers: { 'x-user-id': 'user-liam' },
      body: JSON.stringify({ action: 'JOIN' }),
    }
  );
  const resJoin = await joinMeetupHandler(reqJoin, { params: { id: createdMeetupId } });
  const dataJoin = await resJoin.json();
  assert(
    resJoin.status === 200 && dataJoin.status === 'JOINED',
    'API Permissions',
    'POST /api/meetups/[id]/join claims seat for authenticated user in OPEN meetup'
  );

  // 4.7.2 CHECK_IN for someone else -> 403
  const reqCheckInSpoofed = new NextRequest(
    `http://localhost:3000/api/meetups/${createdMeetupId}/join`,
    {
      method: 'POST',
      headers: { 'x-user-id': 'user-liam' },
      body: JSON.stringify({
        action: 'CHECK_IN',
        targetUserId: 'user-maya', // Liam trying to check-in Maya
        arrivalStatus: 'ARRIVED',
      }),
    }
  );
  const resCheckInSpoofed = await joinMeetupHandler(reqCheckInSpoofed, {
    params: { id: createdMeetupId },
  });
  assert(
    resCheckInSpoofed.status === 403,
    'API Permissions',
    'POST /api/meetups/[id]/join returns 403 when checking in for another participant'
  );

  // 4.7.3 BAN_FROM_LOBBY by non-host -> 403
  const reqBanNonHost = new NextRequest(
    `http://localhost:3000/api/meetups/${createdMeetupId}/join`,
    {
      method: 'POST',
      headers: { 'x-user-id': 'user-liam' },
      body: JSON.stringify({
        action: 'BAN_FROM_LOBBY',
        targetUserId: 'user-maya',
      }),
    }
  );
  const resBanNonHost = await joinMeetupHandler(reqBanNonHost, {
    params: { id: createdMeetupId },
  });
  assert(
    resBanNonHost.status === 403,
    'API Permissions',
    'POST /api/meetups/[id]/join returns 403 when non-host attempts to ban'
  );

  // 4.8 Capacity enforcement: fill meetup to maxParticipants (4) and attempt 5th join
  // Maya is host (1). Liam joined (2).
  // Add Elena (3) and Marcus (4) to reach capacity 4
  const reqJoin3 = new NextRequest(
    `http://localhost:3000/api/meetups/${createdMeetupId}/join`,
    {
      method: 'POST',
      headers: { 'x-user-id': 'user-elena' },
      body: JSON.stringify({ action: 'JOIN' }),
    }
  );
  await joinMeetupHandler(reqJoin3, { params: { id: createdMeetupId } });

  const reqJoin4 = new NextRequest(
    `http://localhost:3000/api/meetups/${createdMeetupId}/join`,
    {
      method: 'POST',
      headers: { 'x-user-id': 'user-marcus' },
      body: JSON.stringify({ action: 'JOIN' }),
    }
  );
  await joinMeetupHandler(reqJoin4, { params: { id: createdMeetupId } });

  // Now meetup has 4 participants (Maya, Liam, Elena, Marcus) = maxParticipants (4).
  // Attempt 5th join by another verified persona -> MUST return 400 full capacity!
  const reqJoin5Overflow = new NextRequest(
    `http://localhost:3000/api/meetups/${createdMeetupId}/join`,
    {
      method: 'POST',
      headers: { 'x-user-id': 'user-google-1793640464684' },
      body: JSON.stringify({ action: 'JOIN' }),
    }
  );
  const resJoin5Overflow = await joinMeetupHandler(reqJoin5Overflow, {
    params: { id: createdMeetupId },
  });
  assert(
    resJoin5Overflow.status === 400,
    'Capacity Guard',
    'POST /api/meetups/[id]/join rejects join with 400 when capacity ceiling reached'
  );

  // 4.9 GET /api/users/profile privacy sanitization
  // Non-owner / guest caller
  const reqProfilePublic = new NextRequest(
    'http://localhost:3000/api/users/profile?userId=user-maya',
    {
      headers: { 'x-user-id': 'user-liam' }, // Liam viewing Maya's profile
    }
  );
  const resProfilePublic = await getProfileHandler(reqProfilePublic);
  const dataProfilePublic = await resProfilePublic.json();
  const publicUser = dataProfilePublic.data?.user || dataProfilePublic.user;
  assert(
    resProfilePublic.status === 200 &&
      publicUser.email === undefined &&
      publicUser.bannedUserIds === undefined,
    'Privacy Sanitization',
    'GET /api/users/profile sanitizes email and private fields for non-owner'
  );

  // Owner caller
  const reqProfileSelf = new NextRequest(
    'http://localhost:3000/api/users/profile?userId=user-maya',
    {
      headers: { 'x-user-id': 'user-maya' }, // Maya viewing own profile
    }
  );
  const resProfileSelf = await getProfileHandler(reqProfileSelf);
  const dataProfileSelf = await resProfileSelf.json();
  const selfUser = dataProfileSelf.data?.user || dataProfileSelf.user;
  assert(
    resProfileSelf.status === 200 && selfUser.email !== undefined,
    'Privacy Sanitization',
    'GET /api/users/profile returns full profile including email to owner'
  );

  // 4.10 POST /api/users ADMIN_ACTION permissions
  // Regular user invoking admin action -> 403
  const reqAdminUser = new NextRequest('http://localhost:3000/api/users', {
    method: 'POST',
    headers: { 'x-user-id': 'user-liam' }, // Liam is role USER
    body: JSON.stringify({
      action: 'ADMIN_ACTION',
      subAction: 'VERIFY_USER',
      targetUserId: 'user-elena',
    }),
  });
  const resAdminUser = await usersActionHandler(reqAdminUser);
  assert(
    resAdminUser.status === 403,
    'Admin Security',
    'POST /api/users returns 403 when regular user invokes ADMIN_ACTION'
  );

  // Admin user invoking admin action -> 200
  const reqAdminAdmin = new NextRequest('http://localhost:3000/api/users', {
    method: 'POST',
    headers: { 'x-user-id': 'user-maya' }, // Maya is role ADMIN
    body: JSON.stringify({
      action: 'ADMIN_ACTION',
      subAction: 'VERIFY_USER',
      targetUserId: 'user-elena',
    }),
  });
  const resAdminAdmin = await usersActionHandler(reqAdminAdmin);
  assert(
    resAdminAdmin.status === 200,
    'Admin Security',
    'POST /api/users returns 200 when authenticated ADMIN invokes ADMIN_ACTION'
  );

  // 4.11 POST /api/auth/session OAuth auto-provisioning
  const reqGoogleAuth = new NextRequest('http://localhost:3000/api/auth/session', {
    method: 'POST',
    body: JSON.stringify({
      action: 'GOOGLE_AUTH',
      email: 'forensic.auditor@test.com',
      name: 'Auditor Empirical',
    }),
  });
  const resGoogleAuth = await sessionHandler(reqGoogleAuth);
  const dataGoogleAuth = await resGoogleAuth.json();
  assert(
    resGoogleAuth.status === 200 &&
      dataGoogleAuth.authenticated === true &&
      dataGoogleAuth.user.email === 'forensic.auditor@test.com' &&
      dataGoogleAuth.user.verified === true,
    'OAuth Provisioning',
    'POST /api/auth/session GOOGLE_AUTH auto-provisions verified persona and issues session'
  );

  // Cleanup: delete test meetup using host session
  const reqDeleteHost = new NextRequest(
    `http://localhost:3000/api/meetups/${createdMeetupId}`,
    {
      method: 'DELETE',
      headers: { 'x-user-id': 'user-maya' },
    }
  );
  const resDeleteHost = await deleteMeetupHandler(reqDeleteHost, {
    params: { id: createdMeetupId },
  });
  assert(
    resDeleteHost.status === 200,
    'API Permissions',
    'DELETE /api/meetups/[id] successfully deletes meetup when called by host'
  );

  // Final summary
  console.log('\n=== AUDIT RESULTS SUMMARY ===');
  const passedCount = results.filter((r) => r.passed).length;
  const failedCount = results.filter((r) => !r.passed).length;
  console.log(`Total Checks: ${results.length}`);
  console.log(`Passed: ${passedCount}`);
  console.log(`Failed: ${failedCount}`);

  if (failedCount > 0) {
    console.error('\nFAILED CHECKS:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        console.error(`- [${r.suite}] ${r.test}: ${r.error}`);
      });
    process.exit(1);
  } else {
    console.log('\nALL FORENSIC CHECKS PASSED EMPIRICALLY!');
    process.exit(0);
  }
}

runAudit().catch((err) => {
  console.error('Unhandled audit execution error:', err);
  process.exit(1);
});
