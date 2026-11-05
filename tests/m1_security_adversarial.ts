/**
 * Milestone M1 Security & Access Control Adversarial Test Suite
 *
 * EMPIRICAL CHALLENGER TEST HARNESS
 * Actively attacks backend security assumptions:
 * 1. Unauthenticated mutating actions in POST /api/users (all 9 actions + variations)
 * 2. BOLA / IDOR attempts across user profile, settings, beacon, ratings, bans, etc.
 * 3. Login password check bypass attempts (omitted, empty, whitespace, wrong)
 * 4. Plaintext password leakage detection across all API endpoints
 * 5. POST /api/lobbies unauthenticated creation & host spoofing
 * 6. PUT /api/lobbies database reset protection & role tampering
 */

import { NextRequest } from 'next/server';
import { GET as getUsers, POST as postUsers } from '@/app/api/users/route';
import { GET as getLobbies, POST as postLobbies, PUT as putLobbies } from '@/app/api/lobbies/route';
import { GET as getSession, POST as postSession } from '@/app/api/auth/session/route';
import { GET as getProfile, PUT as putProfile } from '@/app/api/users/profile/route';
import { readDb, withDbMutation } from '@/lib/db';
import { UserPersona } from '@/types/lobby';

let totalTests = 0;
let passedTests = 0;
const failures: string[] = [];

function assert(condition: boolean, testName: string, detail?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`  [PASS] ${testName}`);
  } else {
    const msg = `${testName}${detail ? ` | Detail: ${detail}` : ''}`;
    failures.push(msg);
    console.error(`  [FAIL] ${msg}`);
  }
}

function findPasswordRecursively(obj: unknown, path = ''): string[] {
  const leaks: string[] = [];
  if (!obj || typeof obj !== 'object') return leaks;

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      leaks.push(...findPasswordRecursively(item, `${path}[${index}]`));
    });
    return leaks;
  }

  const record = obj as Record<string, unknown>;
  for (const [key, value] of Object.entries(record)) {
    const currentPath = path ? `${path}.${key}` : key;
    if (key.toLowerCase() === 'password' && value !== undefined) {
      leaks.push(`${currentPath} = "${value}"`);
    }
    if (value && typeof value === 'object') {
      leaks.push(...findPasswordRecursively(value, currentPath));
    }
  }
  return leaks;
}

export async function runSecurityAdversarialSuite() {
  console.log('================================================================');
  console.log('STARTING EMPIRICAL ADVERSARIAL SECURITY VERIFICATION (M1)');
  console.log('================================================================\n');

  // ============================================================================
  // TASK 1: MUTATING ACTIONS IN POST /api/users REJECT UNAUTHENTICATED REQUESTS
  // ============================================================================
  console.log('--- 1. Testing Unauthenticated Mutating Actions (POST /api/users) ---');

  const mutatingActions = [
    'UPDATE_PROFILE',
    'UPDATE_SETTINGS',
    'TOGGLE_BEACON',
    'RATE_PLAYER',
    'BAN_USER',
    'UNBAN_USER',
    'TOGGLE_REGULAR_PARTNER',
    'MARK_NOTIFICATIONS_READ',
    'REQUEST_VERIFICATION',
  ];

  // 1.1 Test all 9 mutating actions with NO authentication headers or cookies
  for (const action of mutatingActions) {
    const req = new NextRequest('http://localhost:3000/api/users', {
      method: 'POST',
      body: JSON.stringify({
        action,
        userId: 'user-elena',
        toUserId: 'user-maya',
        targetUserId: 'user-maya',
        stars: 5,
        settings: { soundEffects: false },
        name: 'Hacked Name',
      }),
    });
    const res = await postUsers(req);
    assert(
      res.status === 401,
      `Unauthenticated ${action} returns 401`,
      `Got status ${res.status}`
    );
  }

  // 1.2 Test ADMIN_ACTION without authentication
  const reqAdminUnauth = new NextRequest('http://localhost:3000/api/users', {
    method: 'POST',
    body: JSON.stringify({
      action: 'ADMIN_ACTION',
      subAction: 'VERIFY_USER',
      targetUserId: 'user-liam',
    }),
  });
  const resAdminUnauth = await postUsers(reqAdminUnauth);
  assert(
    resAdminUnauth.status === 401,
    'Unauthenticated ADMIN_ACTION returns 401',
    `Got status ${resAdminUnauth.status}`
  );

  // 1.3 Test mutating action with empty session cookie
  const reqEmptyCookie = new NextRequest('http://localhost:3000/api/users', {
    method: 'POST',
    headers: { cookie: 'leavetheroom_session=' },
    body: JSON.stringify({ action: 'UPDATE_PROFILE', name: 'Spoofed' }),
  });
  const resEmptyCookie = await postUsers(reqEmptyCookie);
  assert(
    resEmptyCookie.status === 401,
    'Mutating action with empty session cookie returns 401',
    `Got status ${resEmptyCookie.status}`
  );

  // 1.4 Test mutating action with signed_out session cookie
  const reqSignedOutCookie = new NextRequest('http://localhost:3000/api/users', {
    method: 'POST',
    headers: { cookie: 'leavetheroom_session=signed_out' },
    body: JSON.stringify({ action: 'TOGGLE_BEACON', active: true }),
  });
  const resSignedOutCookie = await postUsers(reqSignedOutCookie);
  assert(
    resSignedOutCookie.status === 401,
    'Mutating action with signed_out session cookie returns 401',
    `Got status ${resSignedOutCookie.status}`
  );

  // 1.5 Test mutating action with invalid/malformed Bearer token
  const reqBadBearer = new NextRequest('http://localhost:3000/api/users', {
    method: 'POST',
    headers: { authorization: 'Bearer nonexistent-random-token-xyz' },
    body: JSON.stringify({ action: 'UPDATE_SETTINGS', settings: { soundEffects: false } }),
  });
  const resBadBearer = await postUsers(reqBadBearer);
  assert(
    resBadBearer.status === 401,
    'Mutating action with invalid Bearer token returns 401',
    `Got status ${resBadBearer.status}`
  );

  // 1.6 Test mutating action with nonexistent x-user-id
  const reqNonexistentUser = new NextRequest('http://localhost:3000/api/users', {
    method: 'POST',
    headers: { 'x-user-id': 'user-nonexistent-99999999' },
    body: JSON.stringify({ action: 'RATE_PLAYER', toUserId: 'user-maya', stars: 5 }),
  });
  const resNonexistentUser = await postUsers(reqNonexistentUser);
  assert(
    resNonexistentUser.status === 401,
    'Mutating action with nonexistent x-user-id returns 401',
    `Got status ${resNonexistentUser.status}`
  );

  // ============================================================================
  // TASK 2: BOLA / IDOR VERIFICATION
  // Authenticate as User A, attempt to mutate User B's state via request body
  // ============================================================================
  console.log('\n--- 2. Testing BOLA / IDOR Defense (Cross-User Impersonation) ---');

  // User A: Attacker (user-liam, role USER)
  // User B: Victim (user-elena, role USER)
  const dbBefore = await readDb();
  const elenaBefore = dbBefore.personas.find((p) => p.id === 'user-elena');
  if (!elenaBefore) {
    throw new Error('Test setup error: user-elena not found in database');
  }
  const elenaOriginalName = elenaBefore.name;
  const elenaOriginalNeighborhood = elenaBefore.neighborhood;
  const elenaOriginalSettings = JSON.parse(JSON.stringify(elenaBefore.settings || {}));
  const elenaOriginalBeacon = JSON.parse(JSON.stringify(elenaBefore.beacon || {}));
  const elenaOriginalBanned = [...(elenaBefore.bannedUserIds || [])];
  const elenaOriginalPartners = [...(elenaBefore.regularPartnerIds || [])];
  const elenaOriginalVerifStatus = elenaBefore.verificationStatus;

  // 2.1 BOLA on UPDATE_PROFILE: User A sends body.userId = 'user-elena'
  const reqBolaProfile = new NextRequest('http://localhost:3000/api/users', {
    method: 'POST',
    headers: { 'x-user-id': 'user-liam' },
    body: JSON.stringify({
      action: 'UPDATE_PROFILE',
      userId: 'user-elena', // IDOR ATTEMPT
      name: 'Elena Hacked By Liam',
      neighborhood: 'Malicious Neighborhood',
    }),
  });
  const resBolaProfile = await postUsers(reqBolaProfile);
  const dbAfterProfile = await readDb();
  const elenaAfterProfile = dbAfterProfile.personas.find((p) => p.id === 'user-elena')!;
  assert(
    elenaAfterProfile.name === elenaOriginalName &&
      elenaAfterProfile.neighborhood === elenaOriginalNeighborhood,
    'BOLA on UPDATE_PROFILE: User B (Elena) name and neighborhood remained unmodified',
    `Elena name: ${elenaAfterProfile.name}`
  );

  // 2.2 BOLA on UPDATE_SETTINGS: User A sends body.userId = 'user-elena'
  const reqBolaSettings = new NextRequest('http://localhost:3000/api/users', {
    method: 'POST',
    headers: { 'x-user-id': 'user-liam' },
    body: JSON.stringify({
      action: 'UPDATE_SETTINGS',
      userId: 'user-elena', // IDOR ATTEMPT
      settings: {
        soundEffects: !elenaOriginalSettings.soundEffects,
        distanceUnit: 'miles',
      },
    }),
  });
  await postUsers(reqBolaSettings);
  const dbAfterSettings = await readDb();
  const elenaAfterSettings = dbAfterSettings.personas.find((p) => p.id === 'user-elena')!;
  assert(
    elenaAfterSettings.settings.soundEffects === elenaOriginalSettings.soundEffects,
    'BOLA on UPDATE_SETTINGS: User B (Elena) settings remained unmodified',
    `SoundEffects: ${elenaAfterSettings.settings.soundEffects}`
  );

  // 2.3 BOLA on TOGGLE_BEACON: User A sends body.userId = 'user-elena'
  const reqBolaBeacon = new NextRequest('http://localhost:3000/api/users', {
    method: 'POST',
    headers: { 'x-user-id': 'user-liam' },
    body: JSON.stringify({
      action: 'TOGGLE_BEACON',
      userId: 'user-elena', // IDOR ATTEMPT
      note: 'Hacked Beacon Note from Liam',
      radiusKm: 99,
    }),
  });
  await postUsers(reqBolaBeacon);
  const dbAfterBeacon = await readDb();
  const elenaAfterBeacon = dbAfterBeacon.personas.find((p) => p.id === 'user-elena')!;
  assert(
    elenaAfterBeacon.beacon?.note === elenaOriginalBeacon.note &&
      elenaAfterBeacon.beacon?.radiusKm === elenaOriginalBeacon.radiusKm,
    'BOLA on TOGGLE_BEACON: User B (Elena) beacon remained unmodified',
    `Beacon note: ${elenaAfterBeacon.beacon?.note}`
  );

  // 2.4 BOLA on RATE_PLAYER: User A sends fromUserId = 'user-elena' to forge a rating
  const reqBolaRate = new NextRequest('http://localhost:3000/api/users', {
    method: 'POST',
    headers: { 'x-user-id': 'user-liam' },
    body: JSON.stringify({
      action: 'RATE_PLAYER',
      fromUserId: 'user-elena', // FORGERY ATTEMPT
      toUserId: 'user-marcus',
      lobbyId: 'lobby-1',
      stars: 1,
      comment: 'Forged malicious 1-star review claiming to be Elena',
    }),
  });
  const resBolaRate = await postUsers(reqBolaRate);
  const dataBolaRate = await resBolaRate.json();
  const dbAfterRate = await readDb();
  const forgedRatingInDb = (dbAfterRate.ratings || []).find(
    (r) => r.comment === 'Forged malicious 1-star review claiming to be Elena'
  );
  assert(
    forgedRatingInDb !== undefined && forgedRatingInDb.fromUserId === 'user-liam',
    'BOLA on RATE_PLAYER: Rating author locked to authenticated caller (Liam), Elena not forged',
    `Actual fromUserId: ${forgedRatingInDb?.fromUserId}`
  );

  // 2.5 BOLA on BAN_USER: User A sends userId = 'user-elena' to ban someone on Elena's behalf
  const reqBolaBan = new NextRequest('http://localhost:3000/api/users', {
    method: 'POST',
    headers: { 'x-user-id': 'user-liam' },
    body: JSON.stringify({
      action: 'BAN_USER',
      userId: 'user-elena', // IDOR ATTEMPT
      targetUserId: 'user-marcus',
    }),
  });
  await postUsers(reqBolaBan);
  const dbAfterBan = await readDb();
  const elenaAfterBan = dbAfterBan.personas.find((p) => p.id === 'user-elena')!;
  assert(
    !elenaAfterBan.bannedUserIds?.includes('user-marcus'),
    'BOLA on BAN_USER: User B (Elena) banned list not modified by User A',
    `Elena banned list: ${JSON.stringify(elenaAfterBan.bannedUserIds)}`
  );

  // 2.6 BOLA on TOGGLE_REGULAR_PARTNER: User A sends userId = 'user-elena'
  const reqBolaPartner = new NextRequest('http://localhost:3000/api/users', {
    method: 'POST',
    headers: { 'x-user-id': 'user-liam' },
    body: JSON.stringify({
      action: 'TOGGLE_REGULAR_PARTNER',
      userId: 'user-elena', // IDOR ATTEMPT
      partnerId: 'user-marcus',
    }),
  });
  await postUsers(reqBolaPartner);
  const dbAfterPartner = await readDb();
  const elenaAfterPartner = dbAfterPartner.personas.find((p) => p.id === 'user-elena')!;
  assert(
    JSON.stringify(elenaAfterPartner.regularPartnerIds) === JSON.stringify(elenaOriginalPartners),
    'BOLA on TOGGLE_REGULAR_PARTNER: User B (Elena) regular partners not modified by User A'
  );

  // 2.7 BOLA on REQUEST_VERIFICATION: User A sends userId = 'user-elena'
  const reqBolaVerif = new NextRequest('http://localhost:3000/api/users', {
    method: 'POST',
    headers: { 'x-user-id': 'user-liam' },
    body: JSON.stringify({
      action: 'REQUEST_VERIFICATION',
      userId: 'user-elena', // IDOR ATTEMPT
      note: 'Malicious verification request for Elena',
    }),
  });
  await postUsers(reqBolaVerif);
  const dbAfterVerif = await readDb();
  const elenaAfterVerif = dbAfterVerif.personas.find((p) => p.id === 'user-elena')!;
  assert(
    elenaAfterVerif.verificationStatus === elenaOriginalVerifStatus,
    'BOLA on REQUEST_VERIFICATION: User B (Elena) verification status not modified by User A',
    `Status: ${elenaAfterVerif.verificationStatus}`
  );

  // 2.8 BOLA on MARK_NOTIFICATIONS_READ: User A sends userId = 'user-elena'
  // Create an unread notification for Elena first
  await withDbMutation(async (txDb) => {
    txDb.notifications = txDb.notifications || [];
    txDb.notifications.unshift({
      id: `notif-elena-test-${crypto.randomUUID()}`,
      userId: 'user-elena',
      type: 'SYSTEM',
      title: 'Elena Secret Notification',
      body: 'Do not mark this as read',
      read: false,
      createdAt: new Date().toISOString(),
    });
  });

  const reqBolaNotif = new NextRequest('http://localhost:3000/api/users', {
    method: 'POST',
    headers: { 'x-user-id': 'user-liam' },
    body: JSON.stringify({
      action: 'MARK_NOTIFICATIONS_READ',
      userId: 'user-elena', // IDOR ATTEMPT
    }),
  });
  await postUsers(reqBolaNotif);
  const dbAfterNotif = await readDb();
  const elenaNotif = (dbAfterNotif.notifications || []).find(
    (n) => n.userId === 'user-elena' && n.title === 'Elena Secret Notification'
  );
  assert(
    elenaNotif !== undefined && elenaNotif.read === false,
    'BOLA on MARK_NOTIFICATIONS_READ: User B (Elena) notifications remained unread after User A call',
    `Elena notification read status: ${elenaNotif?.read}`
  );

  // 2.9 Prototype Pollution & Role Spoofing Attack on Mutating Action
  const reqProtoPollution = new NextRequest('http://localhost:3000/api/users', {
    method: 'POST',
    headers: { 'x-user-id': 'user-liam' },
    body: JSON.stringify({
      action: 'UPDATE_SETTINGS',
      userId: 'user-elena',
      role: 'ADMIN',
      settings: { profileVisible: false },
      __proto__: { role: 'ADMIN' },
    }),
  });
  await postUsers(reqProtoPollution);
  const dbAfterProto = await readDb();
  const liamAfterProto = dbAfterProto.personas.find((p) => p.id === 'user-liam')!;
  assert(
    liamAfterProto.role !== 'ADMIN',
    'Prototype pollution / role parameter injection did not escalate User A privileges to ADMIN',
    `Liam role: ${liamAfterProto.role}`
  );

  // 2.10 BOLA on PUT /api/users/profile: User A tries to edit User B's profile
  const reqBolaProfilePut = new NextRequest('http://localhost:3000/api/users/profile', {
    method: 'PUT',
    headers: { 'x-user-id': 'user-liam' },
    body: JSON.stringify({
      userId: 'user-elena', // IDOR ATTEMPT
      name: 'Elena Defaced via PUT',
    }),
  });
  const resBolaProfilePut = await putProfile(reqBolaProfilePut);
  assert(
    resBolaProfilePut.status === 403,
    'BOLA on PUT /api/users/profile: Cross-user mutation rejected with 403 Forbidden',
    `Got status ${resBolaProfilePut.status}`
  );

  // 2.9 Privilege escalation via ADMIN_ACTION: User A (non-admin) attempts to ban User B
  const reqNonAdminAction = new NextRequest('http://localhost:3000/api/users', {
    method: 'POST',
    headers: { 'x-user-id': 'user-liam' },
    body: JSON.stringify({
      action: 'ADMIN_ACTION',
      subAction: 'BAN_USER',
      targetUserId: 'user-elena',
      adminUserId: 'user-maya', // Spoofed admin identifier
    }),
  });
  const resNonAdminAction = await postUsers(reqNonAdminAction);
  assert(
    resNonAdminAction.status === 403,
    'Privilege Escalation on ADMIN_ACTION: Non-admin caller rejected with 403 Forbidden',
    `Got status ${resNonAdminAction.status}`
  );

  // ============================================================================
  // TASK 3: LOGIN PASSWORD CHECK BYPASS DEFENSE
  // ============================================================================
  console.log('\n--- 3. Testing Login Password Check Bypass Defense ---');

  // 3.1 Register a test user with a strong password
  const testPwEmail = `protected_adv_${Date.now()}@example.com`;
  const regReq = new NextRequest('http://localhost:3000/api/users', {
    method: 'POST',
    body: JSON.stringify({
      action: 'REGISTER_OR_CREATE_PROFILE',
      name: 'Adversarial Password Tester',
      email: testPwEmail,
      password: 'StrongSecretPassword!99',
    }),
  });
  const regRes = await postUsers(regReq);
  const regData = await regRes.json();
  const protectedUserId = regData.persona.id;

  assert(
    regRes.status === 200 && protectedUserId,
    'Registered test account with password',
    `UserId: ${protectedUserId}`
  );

  // 3.2 POST /api/users (LOGIN): Omit password property completely
  const reqLoginOmitUsers = new NextRequest('http://localhost:3000/api/users', {
    method: 'POST',
    body: JSON.stringify({
      action: 'LOGIN',
      userId: protectedUserId,
      // password omitted!
    }),
  });
  const resLoginOmitUsers = await postUsers(reqLoginOmitUsers);
  assert(
    resLoginOmitUsers.status === 401,
    'POST /api/users LOGIN with omitted password returns 401',
    `Got status ${resLoginOmitUsers.status}`
  );

  // 3.3 POST /api/auth/session (LOGIN): Omit password property completely
  const reqLoginOmitSession = new NextRequest('http://localhost:3000/api/auth/session', {
    method: 'POST',
    body: JSON.stringify({
      action: 'LOGIN',
      userId: protectedUserId,
      // password omitted!
    }),
  });
  const resLoginOmitSession = await postSession(reqLoginOmitSession);
  assert(
    resLoginOmitSession.status === 401,
    'POST /api/auth/session LOGIN with omitted password returns 401',
    `Got status ${resLoginOmitSession.status}`
  );

  // 3.4 POST /api/users (LOGIN): Empty string password
  const reqLoginEmptyUsers = new NextRequest('http://localhost:3000/api/users', {
    method: 'POST',
    body: JSON.stringify({
      action: 'LOGIN',
      userId: protectedUserId,
      password: '',
    }),
  });
  const resLoginEmptyUsers = await postUsers(reqLoginEmptyUsers);
  assert(
    resLoginEmptyUsers.status === 401,
    'POST /api/users LOGIN with empty string password returns 401',
    `Got status ${resLoginEmptyUsers.status}`
  );

  // 3.5 POST /api/auth/session (LOGIN): Empty string password
  const reqLoginEmptySession = new NextRequest('http://localhost:3000/api/auth/session', {
    method: 'POST',
    body: JSON.stringify({
      action: 'LOGIN',
      userId: protectedUserId,
      password: '',
    }),
  });
  const resLoginEmptySession = await postSession(reqLoginEmptySession);
  assert(
    resLoginEmptySession.status === 401,
    'POST /api/auth/session LOGIN with empty string password returns 401',
    `Got status ${resLoginEmptySession.status}`
  );

  // 3.6 POST /api/users (LOGIN): Whitespace-only password
  const reqLoginWsUsers = new NextRequest('http://localhost:3000/api/users', {
    method: 'POST',
    body: JSON.stringify({
      action: 'LOGIN',
      userId: protectedUserId,
      password: '     ',
    }),
  });
  const resLoginWsUsers = await postUsers(reqLoginWsUsers);
  assert(
    resLoginWsUsers.status === 401,
    'POST /api/users LOGIN with whitespace password returns 401',
    `Got status ${resLoginWsUsers.status}`
  );

  // 3.7 POST /api/auth/session (LOGIN): Whitespace-only password
  const reqLoginWsSession = new NextRequest('http://localhost:3000/api/auth/session', {
    method: 'POST',
    body: JSON.stringify({
      action: 'LOGIN',
      userId: protectedUserId,
      password: '     ',
    }),
  });
  const resLoginWsSession = await postSession(reqLoginWsSession);
  assert(
    resLoginWsSession.status === 401,
    'POST /api/auth/session LOGIN with whitespace password returns 401',
    `Got status ${resLoginWsSession.status}`
  );

  // 3.8 POST /api/users (LOGIN): Wrong password
  const reqLoginWrongUsers = new NextRequest('http://localhost:3000/api/users', {
    method: 'POST',
    body: JSON.stringify({
      action: 'LOGIN',
      userId: protectedUserId,
      password: 'IncorrectPassword!00',
    }),
  });
  const resLoginWrongUsers = await postUsers(reqLoginWrongUsers);
  assert(
    resLoginWrongUsers.status === 401,
    'POST /api/users LOGIN with wrong password returns 401',
    `Got status ${resLoginWrongUsers.status}`
  );

  // 3.9 POST /api/auth/session (LOGIN): Wrong password
  const reqLoginWrongSession = new NextRequest('http://localhost:3000/api/auth/session', {
    method: 'POST',
    body: JSON.stringify({
      action: 'LOGIN',
      userId: protectedUserId,
      password: 'IncorrectPassword!00',
    }),
  });
  const resLoginWrongSession = await postSession(reqLoginWrongSession);
  assert(
    resLoginWrongSession.status === 401,
    'POST /api/auth/session LOGIN with wrong password returns 401',
    `Got status ${resLoginWrongSession.status}`
  );

  // 3.10 POST /api/users (LOGIN): Query by email without password
  const reqLoginEmailNoPass = new NextRequest('http://localhost:3000/api/users', {
    method: 'POST',
    body: JSON.stringify({
      action: 'LOGIN',
      emailOrName: testPwEmail,
      // no password
    }),
  });
  const resLoginEmailNoPass = await postUsers(reqLoginEmailNoPass);
  assert(
    resLoginEmailNoPass.status === 401,
    'POST /api/users LOGIN by email with omitted password returns 401',
    `Got status ${resLoginEmailNoPass.status}`
  );

  // 3.11 POST /api/auth/session (LOGIN): Query by email without password
  const reqSessionEmailNoPass = new NextRequest('http://localhost:3000/api/auth/session', {
    method: 'POST',
    body: JSON.stringify({
      action: 'LOGIN',
      emailOrName: testPwEmail,
      // no password
    }),
  });
  const resSessionEmailNoPass = await postSession(reqSessionEmailNoPass);
  assert(
    resSessionEmailNoPass.status === 401,
    'POST /api/auth/session LOGIN by email with omitted password returns 401',
    `Got status ${resSessionEmailNoPass.status}`
  );

  // 3.12 POST /api/users (LOGIN): SQL injection payload as password
  const reqLoginSqlUsers = new NextRequest('http://localhost:3000/api/users', {
    method: 'POST',
    body: JSON.stringify({
      action: 'LOGIN',
      userId: protectedUserId,
      password: "' OR '1'='1",
    }),
  });
  const resLoginSqlUsers = await postUsers(reqLoginSqlUsers);
  assert(
    resLoginSqlUsers.status === 401,
    "POST /api/users LOGIN with SQL injection password payload (' OR '1'='1) returns 401",
    `Got status ${resLoginSqlUsers.status}`
  );

  // 3.13 POST /api/auth/session (LOGIN): XSS payload as password
  const reqLoginXssSession = new NextRequest('http://localhost:3000/api/auth/session', {
    method: 'POST',
    body: JSON.stringify({
      action: 'LOGIN',
      userId: protectedUserId,
      password: '<script>alert("xss")</script>',
    }),
  });
  const resLoginXssSession = await postSession(reqLoginXssSession);
  assert(
    resLoginXssSession.status === 401,
    'POST /api/auth/session LOGIN with XSS script payload returns 401',
    `Got status ${resLoginXssSession.status}`
  );

  // 3.14 Both endpoints succeed when correct password is provided
  const reqLoginGoodUsers = new NextRequest('http://localhost:3000/api/users', {
    method: 'POST',
    body: JSON.stringify({
      action: 'LOGIN',
      userId: protectedUserId,
      password: 'StrongSecretPassword!99',
    }),
  });
  const resLoginGoodUsers = await postUsers(reqLoginGoodUsers);
  assert(
    resLoginGoodUsers.status === 200,
    'POST /api/users LOGIN with correct password returns 200 OK'
  );

  const reqLoginGoodSession = new NextRequest('http://localhost:3000/api/auth/session', {
    method: 'POST',
    body: JSON.stringify({
      action: 'LOGIN',
      userId: protectedUserId,
      password: 'StrongSecretPassword!99',
    }),
  });
  const resLoginGoodSession = await postSession(reqLoginGoodSession);
  assert(
    resLoginGoodSession.status === 200,
    'POST /api/auth/session LOGIN with correct password returns 200 OK'
  );

  // 3.13 Test account with password explicitly set on a demo user (e.g., user-maya)
  // Verify that if a password exists, password check is strictly required
  await withDbMutation(async (txDb) => {
    const maya = txDb.personas.find((p) => p.id === 'user-maya');
    if (maya) {
      maya.password = 'MayaAdminPass2026!';
    }
  });

  const reqMayaNoPassUsers = new NextRequest('http://localhost:3000/api/users', {
    method: 'POST',
    body: JSON.stringify({ action: 'LOGIN', userId: 'user-maya' }),
  });
  const resMayaNoPassUsers = await postUsers(reqMayaNoPassUsers);
  assert(
    resMayaNoPassUsers.status === 401,
    'POST /api/users: user-maya with password strictly rejects login without password (401)',
    `Got status ${resMayaNoPassUsers.status}`
  );

  const reqMayaNoPassSession = new NextRequest('http://localhost:3000/api/auth/session', {
    method: 'POST',
    body: JSON.stringify({ action: 'LOGIN', userId: 'user-maya' }),
  });
  const resMayaNoPassSession = await postSession(reqMayaNoPassSession);
  assert(
    resMayaNoPassSession.status === 401,
    'POST /api/auth/session: user-maya with password strictly rejects login without password (401)',
    `Got status ${resMayaNoPassSession.status}`
  );

  // Restore user-maya password to undefined for seed fidelity
  await withDbMutation(async (txDb) => {
    const maya = txDb.personas.find((p) => p.id === 'user-maya');
    if (maya) {
      delete maya.password;
    }
  });

  // ============================================================================
  // TASK 4: PLAINTEXT PASSWORD LEAKAGE PREVENTION
  // Query all endpoints and recursively inspect response JSON for 'password'
  // ============================================================================
  console.log('\n--- 4. Testing Plaintext Password Non-Leakage ---');

  // 4.1 GET /api/lobbies
  const reqGetLobbies = new NextRequest('http://localhost:3000/api/lobbies');
  const resGetLobbies = await getLobbies(reqGetLobbies);
  const dataGetLobbies = await resGetLobbies.json();
  const lobbiesLeaks = findPasswordRecursively(dataGetLobbies);
  assert(
    lobbiesLeaks.length === 0,
    'GET /api/lobbies: Zero password fields leaked in response payload',
    lobbiesLeaks.join('; ')
  );

  // 4.2 GET /api/users
  const resGetUsers = await getUsers(new NextRequest('http://localhost:3000/api/users'));
  const dataGetUsers = await resGetUsers.json();
  const usersLeaks = findPasswordRecursively(dataGetUsers);
  assert(
    usersLeaks.length === 0,
    'GET /api/users: Zero password fields leaked in response payload',
    usersLeaks.join('; ')
  );

  // 4.3 GET /api/auth/session (when authenticated as password-protected user)
  const reqGetSession = new NextRequest('http://localhost:3000/api/auth/session', {
    headers: { 'x-user-id': protectedUserId },
  });
  const resGetSession = await getSession(reqGetSession);
  const dataGetSession = await resGetSession.json();
  const sessionLeaks = findPasswordRecursively(dataGetSession);
  assert(
    sessionLeaks.length === 0,
    'GET /api/auth/session: Zero password fields leaked for authenticated user',
    sessionLeaks.join('; ')
  );

  // 4.4 GET /api/users/profile (as self, query param)
  const reqGetProfileSelf = new NextRequest(
    `http://localhost:3000/api/users/profile?userId=${protectedUserId}`,
    { headers: { 'x-user-id': protectedUserId } }
  );
  const resGetProfileSelf = await getProfile(reqGetProfileSelf);
  const dataGetProfileSelf = await resGetProfileSelf.json();
  const profileSelfLeaks = findPasswordRecursively(dataGetProfileSelf);
  assert(
    profileSelfLeaks.length === 0,
    'GET /api/users/profile (self query): Zero password fields leaked',
    profileSelfLeaks.join('; ')
  );

  // 4.5 GET /api/users/profile (as self, no query param — active session)
  const reqGetProfileNoParam = new NextRequest('http://localhost:3000/api/users/profile', {
    headers: { 'x-user-id': protectedUserId },
  });
  const resGetProfileNoParam = await getProfile(reqGetProfileNoParam);
  const dataGetProfileNoParam = await resGetProfileNoParam.json();
  const profileNoParamLeaks = findPasswordRecursively(dataGetProfileNoParam);
  assert(
    profileNoParamLeaks.length === 0,
    'GET /api/users/profile (active session without param): Zero password fields leaked',
    profileNoParamLeaks.join('; ')
  );

  // 4.6 GET /api/users/profile (as peer)
  const reqGetProfilePeer = new NextRequest(
    `http://localhost:3000/api/users/profile?userId=${protectedUserId}`,
    { headers: { 'x-user-id': 'user-liam' } }
  );
  const resGetProfilePeer = await getProfile(reqGetProfilePeer);
  const dataGetProfilePeer = await resGetProfilePeer.json();
  const profilePeerLeaks = findPasswordRecursively(dataGetProfilePeer);
  assert(
    profilePeerLeaks.length === 0,
    'GET /api/users/profile (peer query): Zero password fields leaked',
    profilePeerLeaks.join('; ')
  );

  // 4.7 GET /api/users/profile (as unauthenticated guest)
  const reqGetProfileGuest = new NextRequest(
    `http://localhost:3000/api/users/profile?userId=${protectedUserId}`
  );
  const resGetProfileGuest = await getProfile(reqGetProfileGuest);
  const dataGetProfileGuest = await resGetProfileGuest.json();
  const profileGuestLeaks = findPasswordRecursively(dataGetProfileGuest);
  assert(
    profileGuestLeaks.length === 0,
    'GET /api/users/profile (guest query): Zero password fields leaked',
    profileGuestLeaks.join('; ')
  );

  // 4.8 Mutation response payloads: REGISTER, LOGIN, SWITCH_DEMO_USER
  const regLeaks = findPasswordRecursively(regData);
  assert(
    regLeaks.length === 0,
    'POST /api/users REGISTER: Response payload sanitizes plaintext password',
    regLeaks.join('; ')
  );

  const loginUsersData = await resLoginGoodUsers.json();
  const loginUsersLeaks = findPasswordRecursively(loginUsersData);
  assert(
    loginUsersLeaks.length === 0,
    'POST /api/users LOGIN: Response payload sanitizes plaintext password',
    loginUsersLeaks.join('; ')
  );

  const loginSessionData = await resLoginGoodSession.json();
  const loginSessionLeaks = findPasswordRecursively(loginSessionData);
  assert(
    loginSessionLeaks.length === 0,
    'POST /api/auth/session LOGIN: Response payload sanitizes plaintext password',
    loginSessionLeaks.join('; ')
  );

  // ============================================================================
  // TASK 5: POST /api/lobbies UNAUTHENTICATED CREATION & SPOOFING DEFENSE
  // ============================================================================
  console.log('\n--- 5. Testing POST /api/lobbies Access Control ---');

  const validMeetupPayload = {
    category: 'Ping Pong',
    title: 'Adversarial Challenge Meetup',
    venueName: 'Washington Square Park',
    lat: 40.7308,
    lng: -73.9973,
    maxParticipants: 4,
  };

  // 5.1 Unauthenticated POST /api/lobbies -> 401
  const reqPostLobbiesNoAuth = new NextRequest('http://localhost:3000/api/lobbies', {
    method: 'POST',
    body: JSON.stringify(validMeetupPayload),
  });
  const resPostLobbiesNoAuth = await postLobbies(reqPostLobbiesNoAuth);
  assert(
    resPostLobbiesNoAuth.status === 401,
    'POST /api/lobbies without auth returns 401 Unauthorized',
    `Got status ${resPostLobbiesNoAuth.status}`
  );

  // 5.2 POST /api/lobbies with bogus session cookie -> 401
  const reqPostLobbiesBogusCookie = new NextRequest('http://localhost:3000/api/lobbies', {
    method: 'POST',
    headers: { cookie: 'leavetheroom_session=nonexistent_session_12345' },
    body: JSON.stringify(validMeetupPayload),
  });
  const resPostLobbiesBogusCookie = await postLobbies(reqPostLobbiesBogusCookie);
  assert(
    resPostLobbiesBogusCookie.status === 401,
    'POST /api/lobbies with bogus cookie returns 401 Unauthorized',
    `Got status ${resPostLobbiesBogusCookie.status}`
  );

  // 5.3 POST /api/lobbies with empty Bearer -> 401
  const reqPostLobbiesEmptyBearer = new NextRequest('http://localhost:3000/api/lobbies', {
    method: 'POST',
    headers: { authorization: 'Bearer   ' },
    body: JSON.stringify(validMeetupPayload),
  });
  const resPostLobbiesEmptyBearer = await postLobbies(reqPostLobbiesEmptyBearer);
  assert(
    resPostLobbiesEmptyBearer.status === 401,
    'POST /api/lobbies with empty Bearer returns 401 Unauthorized',
    `Got status ${resPostLobbiesEmptyBearer.status}`
  );

  // 5.4 Authenticated POST /api/lobbies succeeds and prevents host spoofing
  const reqPostLobbiesAuth = new NextRequest('http://localhost:3000/api/lobbies', {
    method: 'POST',
    headers: { 'x-user-id': 'user-liam' },
    body: JSON.stringify({
      ...validMeetupPayload,
      hostId: 'user-maya', // Host spoofing attempt! Liam claims Maya is host
    }),
  });
  const resPostLobbiesAuth = await postLobbies(reqPostLobbiesAuth);
  const dataPostLobbiesAuth = await resPostLobbiesAuth.json();
  const createdLobby = dataPostLobbiesAuth.lobby || dataPostLobbiesAuth.data?.lobby;
  assert(
    resPostLobbiesAuth.status === 201 && createdLobby !== undefined,
    'POST /api/lobbies with valid auth succeeds (201 Created)',
    `Status: ${resPostLobbiesAuth.status}`
  );
  assert(
    createdLobby && createdLobby.hostId === 'user-liam',
    'POST /api/lobbies hostId bound to session caller (Liam), spoofed hostId (Maya) ignored',
    `Actual hostId: ${createdLobby?.hostId}`
  );

  // ============================================================================
  // TASK 6: PUT /api/lobbies UNAUTHENTICATED DATABASE RESET DEFENSE
  // ============================================================================
  console.log('\n--- 6. Testing PUT /api/lobbies Database Reset Protection ---');

  // 6.1 Unauthenticated PUT /api/lobbies -> 401
  const reqResetUnauth = new NextRequest('http://localhost:3000/api/lobbies', {
    method: 'PUT',
  });
  const resResetUnauth = await putLobbies(reqResetUnauth);
  assert(
    resResetUnauth.status === 401,
    'PUT /api/lobbies unauthenticated reset returns 401 Unauthorized',
    `Got status ${resResetUnauth.status}`
  );

  // 6.2 PUT /api/lobbies with invalid session cookie -> 401
  const reqResetBadCookie = new NextRequest('http://localhost:3000/api/lobbies', {
    method: 'PUT',
    headers: { cookie: 'seeme_session=signed_out' },
  });
  const resResetBadCookie = await putLobbies(reqResetBadCookie);
  assert(
    resResetBadCookie.status === 401,
    'PUT /api/lobbies with invalid session cookie returns 401 Unauthorized',
    `Got status ${resResetBadCookie.status}`
  );

  // 6.3 PUT /api/lobbies authenticated as regular user (non-admin) -> 403 Forbidden
  const reqResetNonAdmin = new NextRequest('http://localhost:3000/api/lobbies', {
    method: 'PUT',
    headers: { 'x-user-id': 'user-liam' }, // Liam is role USER
  });
  const resResetNonAdmin = await putLobbies(reqResetNonAdmin);
  assert(
    resResetNonAdmin.status === 403,
    'PUT /api/lobbies authenticated as non-admin returns 403 Forbidden',
    `Got status ${resResetNonAdmin.status}`
  );

  // 6.4 PUT /api/lobbies with role-tampering header -> 403 Forbidden
  const reqResetSpoofHeader = new NextRequest('http://localhost:3000/api/lobbies', {
    method: 'PUT',
    headers: {
      'x-user-id': 'user-liam',
      'x-user-role': 'ADMIN', // Client tries to spoof admin role in custom header
    },
  });
  const resResetSpoofHeader = await putLobbies(reqResetSpoofHeader);
  assert(
    resResetSpoofHeader.status === 403,
    'PUT /api/lobbies with spoofed x-user-role header returns 403 Forbidden',
    `Got status ${resResetSpoofHeader.status}`
  );

  // 6.5 PUT /api/lobbies authenticated as admin (user-maya) succeeds in dev environment
  const reqResetAdmin = new NextRequest('http://localhost:3000/api/lobbies', {
    method: 'PUT',
    headers: { 'x-user-id': 'user-maya' }, // Maya is role ADMIN
  });
  const resResetAdmin = await putLobbies(reqResetAdmin);
  assert(
    resResetAdmin.status === 200,
    'PUT /api/lobbies authenticated as admin (Maya) succeeds (200 OK)',
    `Got status ${resResetAdmin.status}`
  );

  // ============================================================================
  // FINAL SUMMARY
  // ============================================================================
  console.log('\n================================================================');
  console.log('ADVERSARIAL SECURITY VERIFICATION SUMMARY');
  console.log('================================================================');
  console.log(`Total Assertions: ${totalTests}`);
  console.log(`Passed:           ${passedTests}`);
  console.log(`Failed:           ${failures.length}`);
  console.log(`Pass Rate:        ${((passedTests / totalTests) * 100).toFixed(1)}%`);

  if (failures.length > 0) {
    console.error('\nFAILURES ENCOUNTERED:');
    failures.forEach((f) => console.error(` - ${f}`));
    throw new Error(`${failures.length} adversarial security tests failed!`);
  }

  console.log('\nVERDICT: 100% ADVERSARIAL PASS RATE [APPROVE]');
}

// Execute when run directly via tsx / node
if (process.argv[1]?.includes('m1_security_adversarial')) {
  runSecurityAdversarialSuite().catch((err) => {
    console.error('Test execution failed:', err);
    process.exit(1);
  });
}
