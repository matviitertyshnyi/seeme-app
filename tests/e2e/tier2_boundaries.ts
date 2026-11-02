import {
  TestCollector,
  backupDatabase,
  restoreDatabase,
  buildRequest,
  api,
  readDb,
  writeDb,
} from './common';
import {
  CreateMeetupInputSchema,
  UpdateProfileInputSchema,
  SendMessageInputSchema,
  validatePayload,
} from '../../src/lib/types';

export async function runTier2BoundaryCases(): Promise<TestCollector> {
  const collector = new TestCollector('Tier 2 - Boundary & Corner Cases');
  console.log('\n================================================================');
  console.log('RUNNING TIER 2: BOUNDARY & CORNER CASES');
  console.log('================================================================\n');

  backupDatabase();

  try {
    // -------------------------------------------------------------------------
    // 1. Participant Capacity Boundaries & Ceilings
    // -------------------------------------------------------------------------
    console.log('--- 1. Participant Capacity Boundaries & Ceilings ---');

    // Schema level
    collector.assert(
      Boolean(validatePayload(CreateMeetupInputSchema, { maxParticipants: 1 }).error),
      'Capacity-Boundary',
      'Schema rejects maxParticipants = 1 (< 2)'
    );
    collector.assert(
      Boolean(validatePayload(CreateMeetupInputSchema, { maxParticipants: 0 }).error),
      'Capacity-Boundary',
      'Schema rejects maxParticipants = 0'
    );
    collector.assert(
      Boolean(validatePayload(CreateMeetupInputSchema, { maxParticipants: -1 }).error),
      'Capacity-Boundary',
      'Schema rejects negative maxParticipants (-1)'
    );
    collector.assert(
      Boolean(validatePayload(CreateMeetupInputSchema, { maxParticipants: 17 }).error),
      'Capacity-Boundary',
      'Schema rejects maxParticipants = 17 (> 16)'
    );
    collector.assert(
      Boolean(validatePayload(CreateMeetupInputSchema, { maxParticipants: 3.5 }).error),
      'Capacity-Boundary',
      'Schema rejects fractional maxParticipants (3.5)'
    );

    // API level: create meetup with exact min capacity (2)
    const createMinCapReq = buildRequest('/api/meetups', {
      method: 'POST',
      headers: { 'x-user-id': 'user-maya' },
      body: {
        title: 'Boundary 1v1 Match',
        category: 'Ping Pong',
        venueName: 'Washington Sq Park',
        lat: 40.73,
        lng: -73.99,
        maxParticipants: 2,
        joinMode: 'OPEN',
      },
    });
    const createMinCapRes = await api.createMeetup(createMinCapReq);
    collector.assert(
      createMinCapRes.status === 201,
      'Capacity-Boundary',
      'POST /api/meetups accepts valid min capacity maxParticipants = 2'
    );
    const minCapData = await createMinCapRes.json();
    const minCapId = minCapData.data?.meetup?.id || minCapData.lobby?.id;

    // Fill capacity to 2/2 by joining Liam
    const join2Req = buildRequest(`/api/meetups/${minCapId}/join`, {
      method: 'POST',
      headers: { 'x-user-id': 'user-liam' },
      body: { action: 'JOIN' },
    });
    const join2Res = await api.joinMeetup(join2Req, { params: { id: minCapId } });
    collector.assert(
      join2Res.status === 200,
      'Capacity-Boundary',
      'Second participant joins successfully, reaching 2/2 capacity'
    );

    // Attempt 3rd join on full room (2/2) -> MUST return 400 capacity rejection
    const join3OverflowReq = buildRequest(`/api/meetups/${minCapId}/join`, {
      method: 'POST',
      headers: { 'x-user-id': 'user-elena' },
      body: { action: 'JOIN' },
    });
    const join3OverflowRes = await api.joinMeetup(join3OverflowReq, { params: { id: minCapId } });
    collector.assert(
      join3OverflowRes.status === 400,
      'Capacity-Boundary',
      'POST /api/meetups/[id]/join returns 400 when capacity ceiling reached (2/2)'
    );

    const joinOverflowData = await join3OverflowRes.json();
    collector.assert(
      joinOverflowData.error?.toLowerCase().includes('capacity') ||
        joinOverflowData.error?.toLowerCase().includes('full'),
      'Capacity-Boundary',
      'Capacity ceiling error message explicitly cites capacity/full'
    );

    // Host attempting to reduce capacity below current participant count (2) to 1 -> MUST return 400
    const reduceCapReq = buildRequest(`/api/meetups/${minCapId}`, {
      method: 'PUT',
      headers: { 'x-user-id': 'user-maya' },
      body: { maxParticipants: 1 },
    });
    const reduceCapRes = await api.updateMeetup(reduceCapReq, { params: { id: minCapId } });
    collector.assert(
      reduceCapRes.status === 400,
      'Capacity-Boundary',
      'PUT /api/meetups/[id] rejects reducing capacity below current participant count (400)'
    );

    // Clean up
    await api.deleteMeetup(
      buildRequest(`/api/meetups/${minCapId}`, { method: 'DELETE', headers: { 'x-user-id': 'user-maya' } }),
      { params: { id: minCapId } }
    );

    // -------------------------------------------------------------------------
    // 2. Distance Radius & Coordinates Boundaries
    // -------------------------------------------------------------------------
    console.log('--- 2. Distance Radius & Coordinates Boundaries ---');

    // radius = 0 -> 400
    const radiusZeroReq = buildRequest('/api/meetups?lat=40.73&lng=-73.99&radius=0');
    const radiusZeroRes = await api.listMeetups(radiusZeroReq);
    collector.assert(
      radiusZeroRes.status === 400,
      'Geo-Boundary',
      'GET /api/meetups?radius=0 returns 400 (radius must be positive)'
    );

    // radius = -10 -> 400
    const radiusNegReq = buildRequest('/api/meetups?lat=40.73&lng=-73.99&radius=-10');
    const radiusNegRes = await api.listMeetups(radiusNegReq);
    collector.assert(
      radiusNegRes.status === 400,
      'Geo-Boundary',
      'GET /api/meetups?radius=-10 returns 400 for negative radius'
    );

    // lat without lng -> 400
    const latOnlyReq = buildRequest('/api/meetups?lat=40.73');
    const latOnlyRes = await api.listMeetups(latOnlyReq);
    collector.assert(
      latOnlyRes.status === 400,
      'Geo-Boundary',
      'GET /api/meetups with latitude but missing longitude returns 400'
    );

    // lat > 90 -> 400
    const latOverReq = buildRequest('/api/meetups?lat=90.001&lng=-73.99');
    const latOverRes = await api.listMeetups(latOverReq);
    collector.assert(
      latOverRes.status === 400,
      'Geo-Boundary',
      'GET /api/meetups with latitude > 90 returns 400'
    );

    // lat < -90 -> 400
    const latUnderReq = buildRequest('/api/meetups?lat=-90.001&lng=-73.99');
    const latUnderRes = await api.listMeetups(latUnderReq);
    collector.assert(
      latUnderRes.status === 400,
      'Geo-Boundary',
      'GET /api/meetups with latitude < -90 returns 400'
    );

    // lng > 180 -> 400
    const lngOverReq = buildRequest('/api/meetups?lat=40.73&lng=180.001');
    const lngOverRes = await api.listMeetups(lngOverReq);
    collector.assert(
      lngOverRes.status === 400,
      'Geo-Boundary',
      'GET /api/meetups with longitude > 180 returns 400'
    );

    // lng < -180 -> 400
    const lngUnderReq = buildRequest('/api/meetups?lat=40.73&lng=-180.001');
    const lngUnderRes = await api.listMeetups(lngUnderReq);
    collector.assert(
      lngUnderRes.status === 400,
      'Geo-Boundary',
      'GET /api/meetups with longitude < -180 returns 400'
    );

    // Valid exact boundaries: lat=90, lng=180
    const exactGeoReq = buildRequest('/api/meetups?lat=90&lng=180&radius=50');
    const exactGeoRes = await api.listMeetups(exactGeoReq);
    collector.assert(
      exactGeoRes.status === 200,
      'Geo-Boundary',
      'GET /api/meetups accepts exact edge boundaries lat=90, lng=180 (200 OK)'
    );

    // -------------------------------------------------------------------------
    // 3. String Length & Text Boundaries
    // -------------------------------------------------------------------------
    console.log('--- 3. String Length & Text Boundaries ---');

    // Title < 3 chars -> 400
    const titleShortReq = buildRequest('/api/meetups', {
      method: 'POST',
      headers: { 'x-user-id': 'user-maya' },
      body: {
        title: 'AB',
        category: 'Ping Pong',
        venueName: 'Park',
        lat: 40.73,
        lng: -73.99,
      },
    });
    const titleShortRes = await api.createMeetup(titleShortReq);
    collector.assert(
      titleShortRes.status === 400,
      'String-Boundary',
      'POST /api/meetups rejects title < 3 characters with 400'
    );

    // Title whitespace only -> 400
    const titleWsReq = buildRequest('/api/meetups', {
      method: 'POST',
      headers: { 'x-user-id': 'user-maya' },
      body: {
        title: '        ',
        category: 'Ping Pong',
        venueName: 'Park',
        lat: 40.73,
        lng: -73.99,
      },
    });
    const titleWsRes = await api.createMeetup(titleWsReq);
    collector.assert(
      titleWsRes.status === 400,
      'String-Boundary',
      'POST /api/meetups rejects whitespace-only title with 400'
    );

    // Title > 100 chars -> 400
    const titleLongReq = buildRequest('/api/meetups', {
      method: 'POST',
      headers: { 'x-user-id': 'user-maya' },
      body: {
        title: 'A'.repeat(101),
        category: 'Ping Pong',
        venueName: 'Park',
        lat: 40.73,
        lng: -73.99,
      },
    });
    const titleLongRes = await api.createMeetup(titleLongReq);
    collector.assert(
      titleLongRes.status === 400,
      'String-Boundary',
      'POST /api/meetups rejects title > 100 characters with 400'
    );

    // Message text empty -> 400
    const emptyMsgReq = buildRequest('/api/meetups/lobby-pong-1/messages', {
      method: 'POST',
      headers: { 'x-user-id': 'user-maya' }, // Maya is host of lobby-pong-1
      body: { text: '' },
    });
    const emptyMsgRes = await api.postMessage(emptyMsgReq, { params: { id: 'lobby-pong-1' } });
    collector.assert(
      emptyMsgRes.status === 400,
      'String-Boundary',
      'POST /api/meetups/[id]/messages rejects empty text string with 400'
    );

    // Message text > 1000 chars -> 400
    const longMsgReq = buildRequest('/api/meetups/lobby-pong-1/messages', {
      method: 'POST',
      headers: { 'x-user-id': 'user-maya' },
      body: { text: 'M'.repeat(1001) },
    });
    const longMsgRes = await api.postMessage(longMsgReq, { params: { id: 'lobby-pong-1' } });
    collector.assert(
      longMsgRes.status === 400,
      'String-Boundary',
      'POST /api/meetups/[id]/messages rejects message > 1000 characters with 400'
    );

    // Message text exactly 1000 chars -> accepted (201)
    const exact1000MsgReq = buildRequest('/api/meetups/lobby-pong-1/messages', {
      method: 'POST',
      headers: { 'x-user-id': 'user-maya' },
      body: { text: 'M'.repeat(1000) },
    });
    const exact1000MsgRes = await api.postMessage(exact1000MsgReq, { params: { id: 'lobby-pong-1' } });
    collector.assert(
      exact1000MsgRes.status === 201,
      'String-Boundary',
      'POST /api/meetups/[id]/messages accepts exactly 1000 characters (201 Created)'
    );

    // -------------------------------------------------------------------------
    // 4. Age & Profile Boundaries
    // -------------------------------------------------------------------------
    console.log('--- 4. Age & Profile Boundaries ---');

    // Age < 18 -> 400
    const underAgeReq = buildRequest('/api/users/profile', {
      method: 'PUT',
      headers: { 'x-user-id': 'user-maya' },
      body: { age: 17 },
    });
    const underAgeRes = await api.updateProfile(underAgeReq);
    collector.assert(
      underAgeRes.status === 400,
      'Profile-Boundary',
      'PUT /api/users/profile rejects age < 18 with 400'
    );

    // Age > 99 -> 400
    const overAgeReq = buildRequest('/api/users/profile', {
      method: 'PUT',
      headers: { 'x-user-id': 'user-maya' },
      body: { age: 100 },
    });
    const overAgeRes = await api.updateProfile(overAgeReq);
    collector.assert(
      overAgeRes.status === 400,
      'Profile-Boundary',
      'PUT /api/users/profile rejects age > 99 with 400'
    );

    // Name < 2 chars -> 400
    const shortNameReq = buildRequest('/api/users/profile', {
      method: 'PUT',
      headers: { 'x-user-id': 'user-maya' },
      body: { name: 'A' },
    });
    const shortNameRes = await api.updateProfile(shortNameReq);
    collector.assert(
      shortNameRes.status === 400,
      'Profile-Boundary',
      'PUT /api/users/profile rejects name < 2 characters with 400'
    );

    // Valid edge boundaries: age = 18, age = 99
    const edgeAge18Req = buildRequest('/api/users/profile', {
      method: 'PUT',
      headers: { 'x-user-id': 'user-maya' },
      body: { age: 18 },
    });
    const edgeAge18Res = await api.updateProfile(edgeAge18Req);
    collector.assert(
      edgeAge18Res.status === 200,
      'Profile-Boundary',
      'PUT /api/users/profile accepts exact minimum legal age = 18'
    );

    // -------------------------------------------------------------------------
    // 5. Unauthenticated Access & Session Boundaries
    // -------------------------------------------------------------------------
    console.log('--- 5. Unauthenticated Access & Session Boundaries ---');

    // Missing session headers/cookies -> 401
    const unauthCreate = await api.createMeetup(buildRequest('/api/meetups', { method: 'POST', body: {} }));
    collector.assert(
      unauthCreate.status === 401,
      'Auth-Boundary',
      'Unauthenticated POST /api/meetups returns 401'
    );

    const unauthJoin = await api.joinMeetup(
      buildRequest('/api/meetups/lobby-pong-1/join', { method: 'POST', body: { action: 'JOIN' } }),
      { params: { id: 'lobby-pong-1' } }
    );
    collector.assert(
      unauthJoin.status === 401,
      'Auth-Boundary',
      'Unauthenticated POST /api/meetups/[id]/join returns 401'
    );

    const unauthMsg = await api.postMessage(
      buildRequest('/api/meetups/lobby-pong-1/messages', { method: 'POST', body: { text: 'Hi' } }),
      { params: { id: 'lobby-pong-1' } }
    );
    collector.assert(
      unauthMsg.status === 401,
      'Auth-Boundary',
      'Unauthenticated POST /api/meetups/[id]/messages returns 401'
    );

    const unauthProfilePut = await api.updateProfile(
      buildRequest('/api/users/profile', { method: 'PUT', body: { name: 'Hacker' } })
    );
    collector.assert(
      unauthProfilePut.status === 401,
      'Auth-Boundary',
      'Unauthenticated PUT /api/users/profile returns 401'
    );

    // Explicit signed-out cookie -> 401
    const signedOutCookieReq = buildRequest('/api/meetups', {
      method: 'POST',
      cookies: { seeme_session: 'signed_out' },
      body: { title: 'Test' },
    });
    const signedOutCookieRes = await api.createMeetup(signedOutCookieReq);
    collector.assert(
      signedOutCookieRes.status === 401,
      'Auth-Boundary',
      'Request with cookie seeme_session=signed_out strictly returns 401'
    );

    // Fake bearer token -> 401
    const fakeBearerReq = buildRequest('/api/meetups', {
      method: 'POST',
      headers: { authorization: 'Bearer fake-token-12345' },
      body: { title: 'Test' },
    });
    const fakeBearerRes = await api.createMeetup(fakeBearerReq);
    collector.assert(
      fakeBearerRes.status === 401,
      'Auth-Boundary',
      'Request with invalid Bearer token strictly returns 401'
    );

    // -------------------------------------------------------------------------
    // 6. Resource Not Found (404) Boundaries
    // -------------------------------------------------------------------------
    console.log('--- 6. Resource Not Found (404) Boundaries ---');

    const get404Res = await api.getMeetup(buildRequest('/api/meetups/non-existent-999'), {
      params: { id: 'non-existent-999' },
    });
    collector.assert(
      get404Res.status === 404,
      'NotFound-Boundary',
      'GET /api/meetups/non-existent returns 404 Not Found'
    );

    const delete404Res = await api.deleteMeetup(
      buildRequest('/api/meetups/non-existent-999', { method: 'DELETE', headers: { 'x-user-id': 'user-maya' } }),
      { params: { id: 'non-existent-999' } }
    );
    collector.assert(
      delete404Res.status === 404,
      'NotFound-Boundary',
      'DELETE /api/meetups/non-existent returns 404 Not Found'
    );

    const update404Res = await api.updateMeetup(
      buildRequest('/api/meetups/non-existent-999', { method: 'PUT', headers: { 'x-user-id': 'user-maya' }, body: { title: 'New' } }),
      { params: { id: 'non-existent-999' } }
    );
    collector.assert(
      update404Res.status === 404,
      'NotFound-Boundary',
      'PUT /api/meetups/non-existent returns 404 Not Found'
    );

    // -------------------------------------------------------------------------
    // 7. Self-Action & Participant Constraints
    // -------------------------------------------------------------------------
    console.log('--- 7. Self-Action & Participant Constraints ---');

    // Host attempting LEAVE -> 400
    const hostLeaveReq = buildRequest('/api/meetups/lobby-coffee-1/join', {
      method: 'POST',
      headers: { 'x-user-id': 'user-elena' }, // Elena is regular user host of lobby-coffee-1
      body: { action: 'LEAVE' },
    });
    const hostLeaveRes = await api.joinMeetup(hostLeaveReq, { params: { id: 'lobby-coffee-1' } });
    collector.assert(
      hostLeaveRes.status === 400,
      'SelfAction-Boundary',
      'Host attempting LEAVE action instead of cancelling returns 400'
    );

    // Host attempting BAN on themselves -> 400
    const hostSelfBanReq = buildRequest('/api/meetups/lobby-pong-1/join', {
      method: 'POST',
      headers: { 'x-user-id': 'user-maya' },
      body: { action: 'BAN_FROM_LOBBY', targetUserId: 'user-maya' },
    });
    const hostSelfBanRes = await api.joinMeetup(hostSelfBanReq, { params: { id: 'lobby-pong-1' } });
    collector.assert(
      hostSelfBanRes.status === 400,
      'SelfAction-Boundary',
      'Host attempting BAN_FROM_LOBBY on themselves returns 400'
    );

    // Mark user-marcus as banned in DB to test suspended account constraints
    const testDb = await readDb();
    const marcus = testDb.personas.find((p) => p.id === 'user-marcus');
    if (marcus) {
      marcus.isBanned = true;
      marcus.banReason = 'Account suspended for policy violation';
      await writeDb(testDb);
    }

    // Suspended account attempting to create meetup -> 403
    const bannedUserCreateReq = buildRequest('/api/meetups', {
      method: 'POST',
      headers: { 'x-user-id': 'user-marcus' },
      body: {
        title: 'Banned User Pong',
        category: 'Ping Pong',
        venueName: 'Park',
        lat: 40.73,
        lng: -73.99,
      },
    });
    const bannedUserCreateRes = await api.createMeetup(bannedUserCreateReq);
    collector.assert(
      bannedUserCreateRes.status === 403,
      'SelfAction-Boundary',
      'Suspended/banned account creating meetup is blocked with 403 Forbidden'
    );

  } finally {
    restoreDatabase();
  }

  collector.printSummary();
  return collector;
}

if (require.main === module || process.argv[1]?.includes('tier2_boundaries')) {
  runTier2BoundaryCases().then((collector) => {
    const stats = collector.getStats();
    process.exit(stats.failed === 0 ? 0 : 1);
  });
}
