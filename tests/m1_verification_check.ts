import { NextRequest } from 'next/server';
import { GET as getUsers, POST as postUsers } from '@/app/api/users/route';
import { GET as getLobbies, POST as postLobbies, PUT as putLobbies } from '@/app/api/lobbies/route';
import { POST as postSession } from '@/app/api/auth/session/route';
import { PUT as putProfile } from '@/app/api/users/profile/route';
import { readDb } from '@/lib/db';

async function testM1() {
  console.log('Testing M1 Security & API requirements...');

  // 1. Unauthenticated mutating actions in POST /api/users return 401
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
  for (const action of mutatingActions) {
    const req = new NextRequest('http://localhost:3000/api/users', {
      method: 'POST',
      body: JSON.stringify({ action }),
    });
    const res = await postUsers(req);
    if (res.status !== 401) {
      throw new Error(`Expected 401 for unauth ${action}, got ${res.status}`);
    }
  }
  console.log('PASS: All 9 mutating actions reject unauthenticated requests with 401');

  // 2. Login password bypass fix in /api/users and /api/auth/session
  // Register a user with password
  const testPwEmail = `pwtest_${Date.now()}@example.com`;
  const regReq = new NextRequest('http://localhost:3000/api/users', {
    method: 'POST',
    body: JSON.stringify({
      action: 'REGISTER_OR_CREATE_PROFILE',
      name: 'Password Protected Tester',
      email: testPwEmail,
      password: 'mypassword123',
    }),
  });
  const regRes = await postUsers(regReq);
  const regData = await regRes.json();
  const testUserId = regData.persona.id;

  // Attempt login without password in /api/users -> must return 401
  const reqNoPassUser = new NextRequest('http://localhost:3000/api/users', {
    method: 'POST',
    body: JSON.stringify({ action: 'LOGIN', userId: testUserId }),
  });
  const resNoPassUser = await postUsers(reqNoPassUser);
  if (resNoPassUser.status !== 401) {
    throw new Error(`Expected 401 for login without password in users, got ${resNoPassUser.status}`);
  }

  // Attempt login without password in /api/auth/session -> must return 401
  const reqNoPassSession = new NextRequest('http://localhost:3000/api/auth/session', {
    method: 'POST',
    body: JSON.stringify({ action: 'LOGIN', userId: testUserId }),
  });
  const resNoPassSession = await postSession(reqNoPassSession);
  if (resNoPassSession.status !== 401) {
    throw new Error(`Expected 401 for login without password in session, got ${resNoPassSession.status}`);
  }

  // Attempt login with incorrect password -> must return 401
  const reqBadPass = new NextRequest('http://localhost:3000/api/users', {
    method: 'POST',
    body: JSON.stringify({ action: 'LOGIN', userId: testUserId, password: 'wrongpassword' }),
  });
  const resBadPass = await postUsers(reqBadPass);
  if (resBadPass.status !== 401) {
    throw new Error(`Expected 401 for wrong password in users, got ${resBadPass.status}`);
  }

  // Attempt login with correct password -> must return 200
  const reqGoodPass = new NextRequest('http://localhost:3000/api/users', {
    method: 'POST',
    body: JSON.stringify({ action: 'LOGIN', userId: testUserId, password: 'mypassword123' }),
  });
  const resGoodPass = await postUsers(reqGoodPass);
  if (resGoodPass.status !== 200) {
    throw new Error(`Expected 200 for correct password in users, got ${resGoodPass.status}`);
  }
  console.log('PASS: Login password enforcement verified (omitted -> 401, wrong -> 401, correct -> 200)');

  // 3. Plaintext password redaction in GET /api/users and GET /api/lobbies
  const resGetUsers = await getUsers(new NextRequest('http://localhost:3000/api/users'));
  const usersData = await resGetUsers.json();
  const leakedInUsers = usersData.personas.some((p: any) => p.password !== undefined);
  if (leakedInUsers) throw new Error('Plaintext password leaked in GET /api/users');

  const resGetLobbies = await getLobbies(new NextRequest('http://localhost:3000/api/lobbies'));
  const lobbiesData = await resGetLobbies.json();
  const leakedInLobbies = lobbiesData.personas.some((p: any) => p.password !== undefined);
  if (leakedInLobbies) throw new Error('Plaintext password leaked in GET /api/lobbies');
  console.log('PASS: Plaintext passwords redacted from GET /api/users and GET /api/lobbies');

  // 4. POST /api/lobbies rejects unauthenticated requests with 401
  const reqPostLobbies = new NextRequest('http://localhost:3000/api/lobbies', {
    method: 'POST',
    body: JSON.stringify({ category: 'Ping Pong', title: 'Test Meetup', venueName: 'Park', lat: 40.7, lng: -73.9 }),
  });
  const resPostLobbies = await postLobbies(reqPostLobbies);
  if (resPostLobbies.status !== 401) {
    throw new Error(`Expected 401 for unauth POST /api/lobbies, got ${resPostLobbies.status}`);
  }
  console.log('PASS: Unauthenticated POST /api/lobbies returns 401');

  // 5. PUT /api/lobbies cannot be invoked anonymously
  const reqPutLobbies = new NextRequest('http://localhost:3000/api/lobbies', { method: 'PUT' });
  const resPutLobbies = await putLobbies(reqPutLobbies);
  if (resPutLobbies.status !== 401) {
    throw new Error(`Expected 401 for unauth PUT /api/lobbies, got ${resPutLobbies.status}`);
  }

  // Non-admin cannot reset db
  const reqPutLobbiesUser = new NextRequest('http://localhost:3000/api/lobbies', {
    method: 'PUT',
    headers: { 'x-user-id': 'user-liam' },
  });
  const resPutLobbiesUser = await putLobbies(reqPutLobbiesUser);
  if (resPutLobbiesUser.status !== 403) {
    throw new Error(`Expected 403 for non-admin PUT /api/lobbies, got ${resPutLobbiesUser.status}`);
  }
  console.log('PASS: PUT /api/lobbies requires auth and admin privileges');

  console.log('ALL M1 VERIFICATION CHECKS PASSED EMPIRICALLY!');
}

testM1().catch((e) => {
  console.error(e);
  process.exit(1);
});
