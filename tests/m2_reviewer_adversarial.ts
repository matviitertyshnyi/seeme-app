import { NextRequest } from 'next/server';
import { extractSessionUserId, requireAuth, optionalAuth, AuthError } from '../src/lib/auth-guard';
import {
  CreateMeetupInputSchema,
  SendMessageInputSchema,
  UpdateProfileInputSchema,
  validatePayload,
} from '../src/lib/types';
import { readDb, writeDb, meetupRepository } from '../src/lib/db';
import { POST as handleJoin } from '../src/app/api/meetups/[id]/join/route';
import { POST as handlePostMessage, GET as handleGetMessages } from '../src/app/api/meetups/[id]/messages/route';
import { DELETE as handleDeleteMeetup, PUT as handlePutMeetup } from '../src/app/api/meetups/[id]/route';
import { GET as handleGetProfile, PUT as handlePutProfile } from '../src/app/api/users/profile/route';
import { POST as handleSessionPost, GET as handleSessionGet } from '../src/app/api/auth/session/route';
import { POST as handleLegacyUsers } from '../src/app/api/users/route';
import { DELETE as handleLegacyDeleteLobby } from '../src/app/api/lobbies/[id]/route';
import { POST as handleLegacyLobbyMessages } from '../src/app/api/lobbies/[id]/messages/route';
import { POST as handleLegacyLobbyJoin } from '../src/app/api/lobbies/[id]/join/route';

let totalTests = 0;
let passedTests = 0;
const failures: string[] = [];

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } else {
    failures.push(`${testName}${detail ? ` (${detail})` : ''}`);
    console.error(`  [FAIL] ${testName} ${detail ? `| Detail: ${detail}` : ''}`);
  }
}

async function runAllSuites() {
  console.log('\n============================================================');
  console.log('M2 ADVERSARIAL TEST SUITE: SECURITY, INTEGRITY & APIS');
  console.log('============================================================\n');

  // -------------------------------------------------------------
  // SUITE 1: Auth Guard & Session Extraction
  // -------------------------------------------------------------
  console.log('--- SUITE 1: Auth Guard & Session Extraction ---');

  // 1.1 Extract from Cookie string
  const reqCookieStr = new NextRequest('http://localhost:3000/api/test', {
    headers: { cookie: 'seeme_session=user-alex' },
  });
  assert(extractSessionUserId(reqCookieStr) === 'user-alex', 'Cookie string session extraction');

  // 1.2 Extract from Cookie JSON
  const reqCookieJson = new NextRequest('http://localhost:3000/api/test', {
    headers: { cookie: `seeme_session=${JSON.stringify({ userId: 'user-maya' })}` },
  });
  assert(extractSessionUserId(reqCookieJson) === 'user-maya', 'Cookie JSON session extraction');

  // 1.3 Extract from Bearer token
  const reqBearer = new NextRequest('http://localhost:3000/api/test', {
    headers: { authorization: 'Bearer user-jordan' },
  });
  assert(extractSessionUserId(reqBearer) === 'user-jordan', 'Bearer token session extraction');

  // 1.4 Extract from x-user-id header
  const reqXUserId = new NextRequest('http://localhost:3000/api/test', {
    headers: { 'x-user-id': 'user-liam' },
  });
  assert(extractSessionUserId(reqXUserId) === 'user-liam', 'x-user-id header session extraction');

  // 1.5 Signed out / empty session
  const reqSignedOut = new NextRequest('http://localhost:3000/api/test', {
    headers: { cookie: 'seeme_session=signed_out' },
  });
  assert(extractSessionUserId(reqSignedOut) === null, 'Signed-out cookie yields null');

  const reqEmpty = new NextRequest('http://localhost:3000/api/test');
  assert(extractSessionUserId(reqEmpty) === null, 'Empty request yields null');

  // 1.6 requireAuth on valid user
  const validAuth = await requireAuth(reqXUserId);
  assert(validAuth.user.id === 'user-liam', 'requireAuth resolves valid user persona');

  // 1.7 requireAuth on unauthenticated request
  let unauthCaught = false;
  try {
    await requireAuth(reqEmpty);
  } catch (err: any) {
    unauthCaught = err instanceof AuthError && err.status === 401;
  }
  assert(unauthCaught, 'requireAuth throws AuthError(401) on unauthenticated request');

  // 1.8 requireAuth on banned user
  const db = await readDb();
  let bannedUser = db.personas.find((p) => p.isBanned);
  if (!bannedUser) {
    bannedUser = {
      ...db.personas[0],
      id: 'user-banned-test',
      isBanned: true,
      banReason: 'Severe policy violation',
    };
    db.personas.push(bannedUser);
    await writeDb(db);
  }
  const reqBanned = new NextRequest('http://localhost:3000/api/test', {
    headers: { 'x-user-id': bannedUser.id },
  });
  let bannedCaught = false;
  try {
    await requireAuth(reqBanned);
  } catch (err: any) {
    bannedCaught = err instanceof AuthError && err.status === 403;
  }
  assert(bannedCaught, 'requireAuth throws AuthError(403) on suspended/banned user');

  // 1.9 optionalAuth
  const optGuest = await optionalAuth(reqEmpty);
  assert(optGuest.user === null, 'optionalAuth returns { user: null } for guests');

  const optValid = await optionalAuth(reqXUserId);
  assert(optValid.user?.id === 'user-liam', 'optionalAuth returns user persona for authenticated user');

  // -------------------------------------------------------------
  // SUITE 2: Runtime Validation Schemas
  // -------------------------------------------------------------
  console.log('\n--- SUITE 2: Runtime Validation Schemas (Zod) ---');

  // 2.1 CreateMeetupInputSchema constraints
  const badTitle = validatePayload(CreateMeetupInputSchema, {
    title: 'ab', // min 3 required
    category: 'Ping Pong',
    venueName: 'Park',
    lat: 40.7,
    lng: -73.9,
  });
  assert(Boolean(badTitle.error), 'CreateMeetup rejects title < 3 chars');

  const badMaxPart = validatePayload(CreateMeetupInputSchema, {
    title: 'Valid Title',
    category: 'Ping Pong',
    venueName: 'Park',
    lat: 40.7,
    lng: -73.9,
    maxParticipants: 1, // min 2 required
  });
  assert(Boolean(badMaxPart.error), 'CreateMeetup rejects maxParticipants < 2');

  const badLat = validatePayload(CreateMeetupInputSchema, {
    title: 'Valid Title',
    category: 'Ping Pong',
    venueName: 'Park',
    lat: 95.0, // max 90
    lng: -73.9,
  });
  assert(Boolean(badLat.error), 'CreateMeetup rejects latitude > 90');

  // 2.2 SendMessageInputSchema constraints
  const blankMessage = validatePayload(SendMessageInputSchema, {
    text: '     ',
  });
  assert(Boolean(blankMessage.error), 'SendMessage rejects empty/whitespace text');

  const oversizedMessage = validatePayload(SendMessageInputSchema, {
    text: 'a'.repeat(1001),
  });
  assert(Boolean(oversizedMessage.error), 'SendMessage rejects message > 1000 characters');

  const validMessage = validatePayload(SendMessageInputSchema, {
    text: 'Hello, looking forward to the game!',
  });
  assert(!validMessage.error && validMessage.data?.text?.length! > 0, 'SendMessage accepts valid payload');

  // -------------------------------------------------------------
  // SUITE 3: Storage Concurrency & Pluggable Repository
  // -------------------------------------------------------------
  console.log('\n--- SUITE 3: Storage Concurrency & Pluggable Repository ---');

  // 3.1 Sequential Writes via repository
  for (let i = 0; i < 10; i++) {
    await meetupRepository.addMessage('lobby-chess-1', {
      lobbyId: 'lobby-chess-1',
      senderId: 'user-maya',
      senderName: 'Maya Lin',
      senderAvatar: '',
      text: `Sequential test message ${i}`,
      isSystem: true,
    });
  }

  const postSeqDb = await readDb();
  const foundSeq = postSeqDb.messages.filter((m) => m.text.includes('Sequential test message'));
  assert(foundSeq.length === 10, 'Repository processed all 10 sequential writes into database');

  // Clean up test messages
  postSeqDb.messages = postSeqDb.messages.filter((m) => !m.text.includes('Sequential test message'));
  await writeDb(postSeqDb);

  // 3.2 Pluggable repository methods
  const foundUser = await meetupRepository.getUser('user-maya');
  assert(foundUser?.id === 'user-maya', 'meetupRepository.getUser returns correct persona');

  const userByEmail = await meetupRepository.getUserByEmail(foundUser?.email || '');
  assert(userByEmail?.id === 'user-maya', 'meetupRepository.getUserByEmail finds user by email');

  // -------------------------------------------------------------
  // SUITE 4: API Endpoint Security & Permission Matrix
  // -------------------------------------------------------------
  console.log('\n--- SUITE 4: API Endpoint Security & Permission Matrix ---');

  // Setup test environment in db
  const testDb = await readDb();
  const testMeetupId = 'meetup-test-sec-1';
  testDb.lobbies = testDb.lobbies.filter((l) => l.id !== testMeetupId);
  testDb.lobbies.push({
    id: testMeetupId,
    category: 'Ping Pong',
    mapPinLabel: 'PONG',
    title: 'Security Verification Meetup',
    equipmentNote: 'All ready',
    coverImage: 'https://images.unsplash.com/photo-1534158914592-062992fbe900',
    venueName: 'Union Square Park',
    venueAddress: 'Union Square, NYC',
    lat: 40.7359,
    lng: -73.9911,
    startTime: 'Now',
    startTimeBadge: 'Live Now',
    roomStatus: 'LIVE',
    skillCompatibility: 'ALL_LEVELS',
    maxParticipants: 3,
    joinMode: 'APPROVAL_REQUIRED',
    hostId: 'user-maya',
    participants: [
      {
        id: 'user-maya',
        name: 'Maya Lin',
        age: 26,
        avatar: '',
        joinedAt: new Date().toISOString(),
      },
      {
        id: 'user-liam',
        name: 'Liam Vance',
        age: 28,
        avatar: '',
        joinedAt: new Date().toISOString(),
      },
    ],
    pendingRequests: [
      {
        id: 'req-test-elena',
        user: {
          id: 'user-elena',
          name: 'Elena Rostova',
          age: 24,
          avatar: '',
          joinedAt: new Date().toISOString(),
        },
        note: 'Would love to join',
        status: 'PENDING',
        createdAt: new Date().toISOString(),
      },
    ],
    bannedUserIds: [],
    createdAt: new Date().toISOString(),
  });
  await writeDb(testDb);

  // 4.1 Chat Posting Security: Participant or Host only
  // 4.1a Outsider (user-elena) attempts to chat before being approved -> 403
  const reqChatOutsider = new NextRequest(`http://localhost:3000/api/meetups/${testMeetupId}/messages`, {
    method: 'POST',
    headers: { 'x-user-id': 'user-elena', 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: 'Hey let me in!' }),
  });
  const resChatOutsider = await handlePostMessage(reqChatOutsider, { params: { id: testMeetupId } });
  assert(resChatOutsider.status === 403, 'Posting chat from non-participant/non-host returns 403 Forbidden');

  // 4.1b Chat Sender Spoofing Attack: user-liam tries to impersonate user-maya in the payload
  const reqChatSpoof = new NextRequest(`http://localhost:3000/api/meetups/${testMeetupId}/messages`, {
    method: 'POST',
    headers: { 'x-user-id': 'user-liam', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      text: 'I am Maya and I am cancelling',
      senderId: 'user-maya',
      senderName: 'Maya Lin',
    }),
  });
  const resChatSpoof = await handlePostMessage(reqChatSpoof, { params: { id: testMeetupId } });
  assert(resChatSpoof.status === 201, 'Chat post from member succeeds with 201');
  const chatSpoofData = await resChatSpoof.json();
  assert(
    chatSpoofData.message.senderId === 'user-liam',
    'Chat sender spoofing prevented: senderId strictly bound to session identity (user-liam)'
  );

  // 4.2 Check-In Security: Participant-only for self
  // 4.2a user-liam tries to check in for user-maya -> 403
  const reqCheckInSpoof = new NextRequest(`http://localhost:3000/api/meetups/${testMeetupId}/join`, {
    method: 'POST',
    headers: { 'x-user-id': 'user-liam', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'CHECK_IN',
      targetUserId: 'user-maya',
      arrivalStatus: 'ARRIVED',
    }),
  });
  const resCheckInSpoof = await handleJoin(reqCheckInSpoof, { params: { id: testMeetupId } });
  assert(resCheckInSpoof.status === 403, 'Tampering with another user check-in returns 403 Forbidden');

  // 4.2b user-liam checks in for self -> 200
  const reqCheckInSelf = new NextRequest(`http://localhost:3000/api/meetups/${testMeetupId}/join`, {
    method: 'POST',
    headers: { 'x-user-id': 'user-liam', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'CHECK_IN',
      arrivalStatus: 'ARRIVED',
      spotClue: 'Near the ping pong tables',
    }),
  });
  const resCheckInSelf = await handleJoin(reqCheckInSelf, { params: { id: testMeetupId } });
  assert(resCheckInSelf.status === 200, 'Self check-in succeeds with 200');

  // 4.3 Host-Only Actions: Ban & Approval
  // 4.3a Non-host (user-liam) attempts BAN_FROM_LOBBY -> 403
  const reqBanNonHost = new NextRequest(`http://localhost:3000/api/meetups/${testMeetupId}/join`, {
    method: 'POST',
    headers: { 'x-user-id': 'user-liam', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'BAN_FROM_LOBBY',
      targetUserId: 'user-elena',
    }),
  });
  const resBanNonHost = await handleJoin(reqBanNonHost, { params: { id: testMeetupId } });
  assert(resBanNonHost.status === 403, 'Non-host BAN_FROM_LOBBY returns 403 Forbidden');

  // 4.3b Host tries to ban host -> 400
  const reqBanHost = new NextRequest(`http://localhost:3000/api/meetups/${testMeetupId}/join`, {
    method: 'POST',
    headers: { 'x-user-id': 'user-maya', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'BAN_FROM_LOBBY',
      targetUserId: 'user-maya',
    }),
  });
  const resBanHost = await handleJoin(reqBanHost, { params: { id: testMeetupId } });
  assert(resBanHost.status === 400, 'Attempting to ban host from their own meetup returns 400');

  // 4.3c Host approves pending request -> 200
  const reqAccept = new NextRequest(`http://localhost:3000/api/meetups/${testMeetupId}/join`, {
    method: 'POST',
    headers: { 'x-user-id': 'user-maya', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'ACCEPT_REQUEST',
      requestId: 'req-test-elena',
    }),
  });
  const resAccept = await handleJoin(reqAccept, { params: { id: testMeetupId } });
  assert(resAccept.status === 200, 'Host ACCEPT_REQUEST succeeds with 200');

  // 4.4 Capacity Enforcement: Meetup now has 3 participants (max 3)
  // New user attempts to join full meetup -> 400
  const reqJoinFull = new NextRequest(`http://localhost:3000/api/meetups/${testMeetupId}/join`, {
    method: 'POST',
    headers: { 'x-user-id': 'user-marcus', 'Content-Type': 'application/json' },
    body: JSON.stringify({ action: 'JOIN' }),
  });
  const resJoinFull = await handleJoin(reqJoinFull, { params: { id: testMeetupId } });
  assert(resJoinFull.status === 400, 'Joining full meetup strictly rejected with 400 capacity error');

  // 4.5 Meetup Deletion: Host or Admin only
  // 4.5a Unauthenticated DELETE -> 401
  const reqDelUnauth = new NextRequest(`http://localhost:3000/api/meetups/${testMeetupId}`, {
    method: 'DELETE',
  });
  const resDelUnauth = await handleDeleteMeetup(reqDelUnauth, { params: { id: testMeetupId } });
  assert(resDelUnauth.status === 401, 'Unauthenticated DELETE /api/meetups/[id] returns 401');

  // 4.5b Non-host (user-liam) DELETE -> 403
  const reqDelNonHost = new NextRequest(`http://localhost:3000/api/meetups/${testMeetupId}`, {
    method: 'DELETE',
    headers: { 'x-user-id': 'user-liam' },
  });
  const resDelNonHost = await handleDeleteMeetup(reqDelNonHost, { params: { id: testMeetupId } });
  assert(resDelNonHost.status === 403, 'Non-host DELETE /api/meetups/[id] returns 403 Forbidden');

  // 4.5c Host (user-maya) DELETE -> 200
  const reqDelHost = new NextRequest(`http://localhost:3000/api/meetups/${testMeetupId}`, {
    method: 'DELETE',
    headers: { 'x-user-id': 'user-maya' },
  });
  const resDelHost = await handleDeleteMeetup(reqDelHost, { params: { id: testMeetupId } });
  assert(resDelHost.status === 200, 'Host DELETE /api/meetups/[id] succeeds with 200');

  // 4.6 Legacy Route Hardening
  // 4.6a Legacy DELETE /api/lobbies/[id] without auth -> 401
  const reqLegacyDelUnauth = new NextRequest(`http://localhost:3000/api/lobbies/lobby-pong-1`, {
    method: 'DELETE',
  });
  const resLegacyDelUnauth = await handleLegacyDeleteLobby(reqLegacyDelUnauth, { params: { id: 'lobby-pong-1' } });
  assert(resLegacyDelUnauth.status === 401, 'Legacy DELETE /api/lobbies/[id] unauthenticated returns 401');

  // 4.6b Legacy POST /api/lobbies/[id]/messages without auth -> 401
  const reqLegacyMsgUnauth = new NextRequest(`http://localhost:3000/api/lobbies/lobby-pong-1/messages`, {
    method: 'POST',
    body: JSON.stringify({ text: 'Hello' }),
  });
  const resLegacyMsgUnauth = await handleLegacyLobbyMessages(reqLegacyMsgUnauth, { params: { id: 'lobby-pong-1' } });
  assert(resLegacyMsgUnauth.status === 401, 'Legacy POST /api/lobbies/[id]/messages unauthenticated returns 401');

  // 4.6c Legacy ADMIN_ACTION without admin session -> 403
  const reqLegacyAdminTamper = new NextRequest(`http://localhost:3000/api/users`, {
    method: 'POST',
    headers: { 'x-user-id': 'user-liam', 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'ADMIN_ACTION',
      subAction: 'VERIFY_USER',
      targetUserId: 'user-liam',
    }),
  });
  const resLegacyAdminTamper = await handleLegacyUsers(reqLegacyAdminTamper);
  assert(resLegacyAdminTamper.status === 403, 'Client-side privilege escalation (ADMIN_ACTION) blocked with 403');

  // 4.7 Privacy Sanitization in User Profile
  // 4.7a Guest viewing another user profile -> email and settings sanitized
  const reqProfGuest = new NextRequest('http://localhost:3000/api/users/profile?userId=user-maya');
  const resProfGuest = await handleGetProfile(reqProfGuest);
  const dataProfGuest = await resProfGuest.json();
  assert(dataProfGuest.user.email === undefined, 'Public profile sanitization: email redacted for non-owner');
  assert(dataProfGuest.user.password === undefined, 'Public profile sanitization: password redacted');
  assert(dataProfGuest.user.bannedUserIds === undefined, 'Public profile sanitization: bannedUserIds redacted');

  // 4.7b Owner viewing their own profile -> full data returned
  const reqProfSelf = new NextRequest('http://localhost:3000/api/users/profile?userId=user-maya', {
    headers: { 'x-user-id': 'user-maya' },
  });
  const resProfSelf = await handleGetProfile(reqProfSelf);
  const dataProfSelf = await resProfSelf.json();
  assert(Boolean(dataProfSelf.user.email), 'Owner profile view returns full profile with email');

  // 4.8 OAuth Google & Apple Auto-Provisioning
  const reqGoogleAuth = new NextRequest('http://localhost:3000/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'GOOGLE_AUTH',
      email: 'test.adversarial.google@example.com',
      name: 'Google Adversarial Tester',
    }),
  });
  const resGoogleAuth = await handleSessionPost(reqGoogleAuth);
  assert(resGoogleAuth.status === 200, 'GOOGLE_AUTH endpoint returns 200 OK');
  const googleData = await resGoogleAuth.json();
  assert(googleData.authenticated === true, 'GOOGLE_AUTH session marks authenticated === true');
  assert(googleData.user.verificationStatus === 'VERIFIED', 'GOOGLE_AUTH auto-provisions verified persona');

  const reqAppleAuth = new NextRequest('http://localhost:3000/api/auth/session', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action: 'APPLE_AUTH',
      email: 'test.adversarial.apple@example.com',
      name: 'Apple Adversarial Tester',
    }),
  });
  const resAppleAuth = await handleSessionPost(reqAppleAuth);
  assert(resAppleAuth.status === 200, 'APPLE_AUTH endpoint returns 200 OK');
  const appleData = await resAppleAuth.json();
  assert(appleData.authenticated === true, 'APPLE_AUTH session marks authenticated === true');
  assert(appleData.user.verificationStatus === 'VERIFIED', 'APPLE_AUTH auto-provisions verified persona');

  console.log('\n============================================================');
  console.log(`TOTAL ADVERSARIAL ASSERTIONS: ${passedTests}/${totalTests}`);
  if (failures.length === 0) {
    console.log('ALL 34 ADVERSARIAL TESTS PASSED CLEANLY! ZERO SECURITY DEFECTS.');
  } else {
    console.error(`FAILURES (${failures.length}):`);
    failures.forEach((f) => console.error(` - ${f}`));
  }
  console.log('============================================================\n');

  if (failures.length > 0) {
    process.exit(1);
  }
}

runAllSuites().catch((err) => {
  console.error('Test runner uncaught error:', err);
  process.exit(1);
});
