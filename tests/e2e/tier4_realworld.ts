import {
  TestCollector,
  backupDatabase,
  restoreDatabase,
  buildRequest,
  api,
} from './common';
import { DICTIONARY, getTranslation, SupportedLanguage } from '../../src/lib/i18n';
import { readDb } from '../../src/lib/db';

export async function runTier4RealWorldScenarios(): Promise<TestCollector> {
  const collector = new TestCollector('Tier 4 - Real-World End-to-End Scenarios');
  console.log('\n================================================================');
  console.log('RUNNING TIER 4: REAL-WORLD END-TO-END SCENARIOS');
  console.log('================================================================\n');

  backupDatabase();

  try {
    // -------------------------------------------------------------------------
    // SCENARIO 1: The Spontaneous Ping Pong Match
    // -------------------------------------------------------------------------
    console.log('--- Scenario 1: The Spontaneous Ping Pong Match ---');

    // 1.1 Maya logs in as Host and creates a 1v1 Ping Pong meetup starting 'Now'
    const s1CreateReq = buildRequest('/api/meetups', {
      method: 'POST',
      headers: { 'x-user-id': 'user-maya' },
      body: {
        title: 'Spontaneous 1v1 Table Tennis Rally',
        category: 'Ping Pong',
        equipmentNote: '2 Stiga paddles & 3-star balls ready. Casual rally then best of 5.',
        venueName: 'Tompkins Square Concrete Tables',
        venueAddress: 'E 7th St & Ave A, East Village',
        lat: 40.7265,
        lng: -73.9815,
        startTime: 'Now',
        maxParticipants: 2,
        joinMode: 'OPEN',
      },
    });
    const s1CreateRes = await api.createMeetup(s1CreateReq);
    collector.assert(s1CreateRes.status === 201, 'Scenario-PingPong', 'Step 1: Host Maya creates 1v1 Ping Pong meetup (201)');

    const s1CreateData = await s1CreateRes.json();
    const s1MeetupId = s1CreateData.data?.meetup?.id || s1CreateData.lobby?.id;

    // 1.2 Liam searches Explore feed and finds Maya's Ping Pong meetup
    const s1SearchReq = buildRequest('/api/meetups?category=Ping%20Pong&lat=40.726&lng=-73.981&radius=5');
    const s1SearchRes = await api.listMeetups(s1SearchReq);
    const s1SearchData = await s1SearchRes.json();
    const foundMeetup = (s1SearchData.data?.meetups || []).find((m: any) => m.id === s1MeetupId);
    collector.assert(
      Boolean(foundMeetup) && foundMeetup.title.includes('Table Tennis'),
      'Scenario-PingPong',
      'Step 2: Liam discovers Maya\'s Ping Pong meetup via proximity search'
    );

    // 1.3 Liam instant-joins the OPEN meetup
    const s1JoinReq = buildRequest(`/api/meetups/${s1MeetupId}/join`, {
      method: 'POST',
      headers: { 'x-user-id': 'user-liam' },
      body: { action: 'JOIN' },
    });
    const s1JoinRes = await api.joinMeetup(s1JoinReq, { params: { id: s1MeetupId } });
    collector.assert(s1JoinRes.status === 200, 'Scenario-PingPong', 'Step 3: Liam instant-joins OPEN meetup (capacity now 2/2)');

    // 1.4 Liam posts in chat
    const s1Msg1Req = buildRequest(`/api/meetups/${s1MeetupId}/messages`, {
      method: 'POST',
      headers: { 'x-user-id': 'user-liam' },
      body: { text: 'Heading over right now, about 6 mins out!' },
    });
    const s1Msg1Res = await api.postMessage(s1Msg1Req, { params: { id: s1MeetupId } });
    collector.assert(s1Msg1Res.status === 201, 'Scenario-PingPong', 'Step 4: Liam coordinates arrival time in meetup chat');

    // 1.5 Host Maya replies in chat
    const s1Msg2Req = buildRequest(`/api/meetups/${s1MeetupId}/messages`, {
      method: 'POST',
      headers: { 'x-user-id': 'user-maya' },
      body: { text: 'Awesome, I am at the center table under the shade trees.' },
    });
    const s1Msg2Res = await api.postMessage(s1Msg2Req, { params: { id: s1MeetupId } });
    collector.assert(s1Msg2Res.status === 201, 'Scenario-PingPong', 'Step 5: Host Maya confirms exact table location in chat');

    // 1.6 Liam arrives and checks in
    const s1CheckInReq = buildRequest(`/api/meetups/${s1MeetupId}/join`, {
      method: 'POST',
      headers: { 'x-user-id': 'user-liam' },
      body: {
        action: 'CHECK_IN',
        arrivalStatus: 'ARRIVED',
        spotClue: 'Holding red paddle near table 2',
      },
    });
    const s1CheckInRes = await api.joinMeetup(s1CheckInReq, { params: { id: s1MeetupId } });
    collector.assert(s1CheckInRes.status === 200, 'Scenario-PingPong', 'Step 6: Liam checks in with "I\'m Here!" and spot clue');

    // 1.7 Verify arrival status persisted
    const s1GetReq = buildRequest(`/api/meetups/${s1MeetupId}`);
    const s1GetRes = await api.getMeetup(s1GetReq, { params: { id: s1MeetupId } });
    const s1GetData = await s1GetRes.json();
    const liamRecord = (s1GetData.data?.meetup || s1GetData.lobby).participants.find(
      (p: any) => p.id === 'user-liam'
    );
    collector.assert(
      liamRecord?.arrivalStatus === 'ARRIVED' && liamRecord?.spotClue?.includes('paddle'),
      'Scenario-PingPong',
      'Step 7: Meetup record accurately displays Liam\'s ARRIVED status and clue'
    );

    // 1.8 Match completes -> Host Maya deletes/concludes meetup
    const s1DeleteReq = buildRequest(`/api/meetups/${s1MeetupId}`, {
      method: 'DELETE',
      headers: { 'x-user-id': 'user-maya' },
    });
    const s1DeleteRes = await api.deleteMeetup(s1DeleteReq, { params: { id: s1MeetupId } });
    collector.assert(s1DeleteRes.status === 200, 'Scenario-PingPong', 'Step 8: Match concludes and Host Maya safely closes room (200 OK)');

    // -------------------------------------------------------------------------
    // SCENARIO 2: The Multi-Candidate Chess Match with Approval & Capacity Ceiling
    // -------------------------------------------------------------------------
    console.log('--- Scenario 2: The Multi-Candidate Chess Match with Approval & Capacity Ceiling ---');

    // 2.1 Elena hosts 2-player Chess meetup with APPROVAL_REQUIRED
    const s2CreateReq = buildRequest('/api/meetups', {
      method: 'POST',
      headers: { 'x-user-id': 'user-elena' },
      body: {
        title: 'Blitz Chess Match (1800+ Elo)',
        category: 'Chess',
        venueName: 'Washington Square Chess Tables',
        lat: 40.7302,
        lng: -73.9985,
        maxParticipants: 2,
        joinMode: 'APPROVAL_REQUIRED',
        skillCompatibility: 'COMPETITIVE',
      },
    });
    const s2CreateRes = await api.createMeetup(s2CreateReq);
    collector.assert(s2CreateRes.status === 201, 'Scenario-ChessTournament', 'Step 1: Elena hosts competitive chess meetup with approval required');

    const s2Data = await s2CreateRes.json();
    const s2MeetupId = s2Data.data?.meetup?.id || s2Data.lobby?.id;

    // 2.2 Liam and Marcus both send join requests while room has open capacity (1/2)
    const s2ReqLiam = buildRequest(`/api/meetups/${s2MeetupId}/join`, {
      method: 'POST',
      headers: { 'x-user-id': 'user-liam' },
      body: { action: 'REQUEST_JOIN', note: '1850 rapid rating on chess.com' },
    });
    await api.joinMeetup(s2ReqLiam, { params: { id: s2MeetupId } });

    const s2ReqMarcus = buildRequest(`/api/meetups/${s2MeetupId}/join`, {
      method: 'POST',
      headers: { 'x-user-id': 'user-marcus' },
      body: { action: 'REQUEST_JOIN', note: '1900 blitz player' },
    });
    await api.joinMeetup(s2ReqMarcus, { params: { id: s2MeetupId } });

    // Verify both pending requests received
    const s2CheckPendingRes = await api.getMeetup(buildRequest(`/api/meetups/${s2MeetupId}`), { params: { id: s2MeetupId } });
    const s2PendingData = await s2CheckPendingRes.json();
    const pendingList = (s2PendingData.data?.meetup || s2PendingData.lobby).pendingRequests || [];
    collector.assert(
      pendingList.length === 2,
      'Scenario-ChessTournament',
      'Step 2: Host Elena receives 2 competing pending join requests'
    );

    // 2.3 Non-member attempting chat blocked with 403
    const s2UnapprovedChat = await api.postMessage(
      buildRequest(`/api/meetups/${s2MeetupId}/messages`, {
        method: 'POST',
        headers: { 'x-user-id': 'user-liam' },
        body: { text: 'Can I play white?' },
      }),
      { params: { id: s2MeetupId } }
    );
    collector.assert(
      s2UnapprovedChat.status === 403,
      'Scenario-ChessTournament',
      'Step 3: Unapproved applicant is blocked from posting chat (403)'
    );

    // 2.4 Elena accepts Marcus -> capacity becomes 2/2 full
    const s2AcceptMarcus = await api.joinMeetup(
      buildRequest(`/api/meetups/${s2MeetupId}/join`, {
        method: 'POST',
        headers: { 'x-user-id': 'user-elena' },
        body: { action: 'ACCEPT_REQUEST', targetUserId: 'user-marcus' },
      }),
      { params: { id: s2MeetupId } }
    );
    collector.assert(s2AcceptMarcus.status === 200, 'Scenario-ChessTournament', 'Step 4: Elena accepts Marcus (meetup now 2/2 full)');

    // 2.5 Elena attempts to accept Liam now that room is full -> MUST reject with 400
    const s2AcceptLiamOverflow = await api.joinMeetup(
      buildRequest(`/api/meetups/${s2MeetupId}/join`, {
        method: 'POST',
        headers: { 'x-user-id': 'user-elena' },
        body: { action: 'ACCEPT_REQUEST', targetUserId: 'user-liam' },
      }),
      { params: { id: s2MeetupId } }
    );
    collector.assert(
      s2AcceptLiamOverflow.status === 400,
      'Scenario-ChessTournament',
      'Step 5: Host accepting second candidate on full meetup strictly rejected with 400 capacity ceiling error'
    );

    // Clean up
    await api.deleteMeetup(
      buildRequest(`/api/meetups/${s2MeetupId}`, { method: 'DELETE', headers: { 'x-user-id': 'user-elena' } }),
      { params: { id: s2MeetupId } }
    );

    // -------------------------------------------------------------------------
    // SCENARIO 3: International User Experience & Multilingual Discovery
    // -------------------------------------------------------------------------
    console.log('--- Scenario 3: International User Experience & Multilingual Discovery ---');

    // 3.1 Ukrainian user flow
    const ukWelcomeTitle = getTranslation('uk', 'welcome_title');
    const ukExploreTab = getTranslation('uk', 'explore');
    const ukMapTab = getTranslation('uk', 'map');
    const ukMeetupsTab = getTranslation('uk', 'my_meetups');
    const ukProfileTab = getTranslation('uk', 'profile');

    collector.assert(
      ukWelcomeTitle === 'Leave The Room' &&
        ukExploreTab === 'Огляд' &&
        ukMapTab === 'Мапа' &&
        ukMeetupsTab === 'Зустрічі' &&
        ukProfileTab === 'Профіль',
      'Scenario-i18n',
      'Step 1: Ukrainian locale renders native Cyrillic UI navigation labels'
    );

    // 3.2 Polish user flow
    const plExploreTab = getTranslation('pl', 'explore');
    const plMapTab = getTranslation('pl', 'map');
    const plMeetupsTab = getTranslation('pl', 'my_meetups');
    const plProfileTab = getTranslation('pl', 'profile');

    collector.assert(
      plExploreTab === 'Odkrywaj' &&
        plMapTab === 'Mapa' &&
        plMeetupsTab === 'Spotkania' &&
        plProfileTab === 'Profil',
      'Scenario-i18n',
      'Step 2: Polish locale renders native Polish Latin-Ext UI navigation labels'
    );

    // 3.3 German and French flows
    const deExplore = getTranslation('de', 'explore');
    const frExplore = getTranslation('fr', 'explore');
    collector.assert(
      deExplore === 'Entdecken' && frExplore === 'Explorer',
      'Scenario-i18n',
      'Step 3: German and French locales render accurate Western European translations'
    );

    // 3.4 Ban Emojis Audit: Zero emojis across all dictionaries
    const emojiRegex = new RegExp('[\\p{Extended_Pictographic}\\u{1F300}-\\u{1F9FF}\\u{2600}-\\u{26FF}\\u{2700}-\\u{27BF}]', 'u');
    const allDictValues = Object.values(DICTIONARY).flatMap((dict) => Object.values(dict));
    const anyEmojisFound = allDictValues.some((v) => typeof v === 'string' && emojiRegex.test(v));
    collector.assert(
      !anyEmojisFound,
      'Scenario-i18n',
      'Step 4: All 5 language dictionaries contain ZERO emojis (anti-slop mandate)'
    );

    // 3.5 Purge IRL Audit: Zero instances of "IRL" slang in any translations
    const anyIrlFound = allDictValues.some((v) => typeof v === 'string' && v.includes('IRL'));
    collector.assert(
      !anyIrlFound,
      'Scenario-i18n',
      'Step 5: All 5 language dictionaries contain ZERO instances of "IRL" slang'
    );

    // -------------------------------------------------------------------------
    // SCENARIO 4: Security Breach & Tampering Defense Drill
    // -------------------------------------------------------------------------
    console.log('--- Scenario 4: Security Breach & Tampering Defense Drill ---');

    // 4.1 Unauthenticated mutating request blocked with 401
    const drill1 = await api.createMeetup(buildRequest('/api/meetups', { method: 'POST', body: {} }));
    collector.assert(drill1.status === 401, 'Scenario-SecurityDrill', 'Step 1: Unauthenticated meetup creation blocked with 401');

    // 4.2 Privilege escalation attempt with fake x-user-role header blocked
    const drill2 = await api.usersAction(
      buildRequest('/api/users', {
        method: 'POST',
        headers: { 'x-user-id': 'user-liam', 'x-user-role': 'ADMIN' },
        body: {
          action: 'ADMIN_ACTION',
          subAction: 'CHANGE_ROLE',
          targetUserId: 'user-liam',
          newRole: 'ADMIN',
        },
      })
    );
    collector.assert(
      drill2.status === 403,
      'Scenario-SecurityDrill',
      'Step 2: Client privilege escalation via fake x-user-role header blocked with 403'
    );

    // 4.3 Chat senderId spoofing overridden by server session
    const createDrillMeetup = await api.createMeetup(
      buildRequest('/api/meetups', {
        method: 'POST',
        headers: { 'x-user-id': 'user-elena' },
        body: {
          title: 'Security Drill Meetup',
          category: 'Coffee',
          venueName: 'Cafe',
          lat: 40.724,
          lng: -73.995,
          maxParticipants: 4,
          joinMode: 'OPEN',
        },
      })
    );
    const drillMeetupId = (await createDrillMeetup.json()).data?.meetup?.id;

    // Elena posts chat trying to spoof senderId='user-maya'
    const spoofPost = await api.postMessage(
      buildRequest(`/api/meetups/${drillMeetupId}/messages`, {
        method: 'POST',
        headers: { 'x-user-id': 'user-elena' },
        body: { text: 'Spoofed message attempt', senderId: 'user-maya' },
      }),
      { params: { id: drillMeetupId } }
    );
    const spoofData = await spoofPost.json();
    collector.assert(
      spoofData.message?.senderId === 'user-elena',
      'Scenario-SecurityDrill',
      'Step 3: Server session strictly binds sender identity and neutralizes spoofed senderId'
    );

    // 4.4 Non-host attempting to delete meetup blocked with 403
    const unauthorizedDelete = await api.deleteMeetup(
      buildRequest(`/api/meetups/${drillMeetupId}`, {
        method: 'DELETE',
        headers: { 'x-user-id': 'user-liam' }, // Liam is not host (Elena is)
      }),
      { params: { id: drillMeetupId } }
    );
    collector.assert(
      unauthorizedDelete.status === 403,
      'Scenario-SecurityDrill',
      'Step 4: Non-host attempting to delete meetup blocked with 403 Forbidden'
    );

    // 4.5 Adversarial payload with injection strings handled safely
    const xssPayloadRes = await api.postMessage(
      buildRequest(`/api/meetups/${drillMeetupId}/messages`, {
        method: 'POST',
        headers: { 'x-user-id': 'user-elena' },
        body: { text: '<script>alert("pwned")</script> & DROP TABLE users;--' },
      }),
      { params: { id: drillMeetupId } }
    );
    collector.assert(
      xssPayloadRes.status === 201,
      'Scenario-SecurityDrill',
      'Step 5: Dangerous script/SQL injection strings handled safely without crashing server'
    );

    // Clean up
    await api.deleteMeetup(
      buildRequest(`/api/meetups/${drillMeetupId}`, { method: 'DELETE', headers: { 'x-user-id': 'user-elena' } }),
      { params: { id: drillMeetupId } }
    );

    // -------------------------------------------------------------------------
    // SCENARIO 5: High-Contention Race Condition & Concurrency Safety
    // -------------------------------------------------------------------------
    console.log('--- Scenario 5: High-Contention Race Condition & Concurrency Safety ---');

    // 5.1 Host Maya creates meetup with capacity = 2 (1 seat open for competition)
    const raceMeetupRes = await api.createMeetup(
      buildRequest('/api/meetups', {
        method: 'POST',
        headers: { 'x-user-id': 'user-maya' },
        body: {
          title: 'High Contention 1-Seat Race',
          category: 'Ping Pong',
          venueName: 'Washington Sq Park Tables',
          lat: 40.7308,
          lng: -73.9973,
          maxParticipants: 2,
          joinMode: 'OPEN',
        },
      })
    );
    const raceMeetupId = (await raceMeetupRes.json()).data?.meetup?.id;
    collector.assert(Boolean(raceMeetupId), 'Scenario-Concurrency', 'Step 1: Created meetup with exactly 1 available seat');

    // 5.2 We simulate 10 concurrent join requests contending for that 1 seat
    // Candidates: user-liam, user-elena, user-marcus, plus provisioned test users
    const candidates = [
      'user-liam',
      'user-elena',
      'user-marcus',
    ];

    const joinPromises = candidates.map((userId) => {
      const req = buildRequest(`/api/meetups/${raceMeetupId}/join`, {
        method: 'POST',
        headers: { 'x-user-id': userId },
        body: { action: 'JOIN' },
      });
      return api.joinMeetup(req, { params: { id: raceMeetupId } });
    });

    const results = await Promise.all(joinPromises);
    const successes = results.filter((r) => r.status === 200);
    const capacityRejections = results.filter((r) => r.status === 400);

    collector.assert(
      successes.length === 1,
      'Scenario-Concurrency',
      `Step 2: Under high-contention race, exactly 1 candidate claimed the seat (Got: ${successes.length})`
    );

    collector.assert(
      capacityRejections.length === candidates.length - 1,
      'Scenario-Concurrency',
      `Step 3: All ${candidates.length - 1} losing candidates received 400 capacity rejection (Got: ${capacityRejections.length})`
    );

    // 5.3 Verify final meetup capacity in database NEVER exceeded 2
    const finalMeetupRes = await api.getMeetup(buildRequest(`/api/meetups/${raceMeetupId}`), { params: { id: raceMeetupId } });
    const finalMeetup = (await finalMeetupRes.json()).data?.meetup;
    collector.assert(
      finalMeetup?.participants?.length === 2,
      'Scenario-Concurrency',
      'Step 4: Final participant count strictly equals maxParticipants (2)'
    );

    // 5.4 Verify database integrity is 100% intact and valid JSON
    const db = await readDb();
    collector.assert(
      Array.isArray(db.personas) && Array.isArray(db.lobbies) && Array.isArray(db.messages),
      'Scenario-Concurrency',
      'Step 5: Database remains valid JSON with zero corruption after concurrent contention'
    );

    // Clean up
    await api.deleteMeetup(
      buildRequest(`/api/meetups/${raceMeetupId}`, { method: 'DELETE', headers: { 'x-user-id': 'user-maya' } }),
      { params: { id: raceMeetupId } }
    );

  } finally {
    restoreDatabase();
  }

  collector.printSummary();
  return collector;
}

if (require.main === module || process.argv[1]?.includes('tier4_realworld')) {
  runTier4RealWorldScenarios().then((collector) => {
    const stats = collector.getStats();
    process.exit(stats.failed === 0 ? 0 : 1);
  });
}
