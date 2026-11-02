import {
  TestCollector,
  backupDatabase,
  restoreDatabase,
  buildRequest,
  api,
} from './common';
import {
  SUPPORTED_LANGUAGES,
  DICTIONARY,
  getTranslation,
  SupportedLanguage,
} from '../../src/lib/i18n';
import { attachAndSortByDistance } from '../../src/lib/geo';

export async function runTier3CrossFeatureCombinations(): Promise<TestCollector> {
  const collector = new TestCollector('Tier 3 - Cross-Feature Combinations');
  console.log('\n================================================================');
  console.log('RUNNING TIER 3: CROSS-FEATURE COMBINATIONS');
  console.log('================================================================\n');

  backupDatabase();

  try {
    // -------------------------------------------------------------------------
    // COMBINATION 1: Auth Wall + Route Access + Session Lifecycle
    // -------------------------------------------------------------------------
    console.log('--- Combination 1: Auth Wall + Route Access + Session Lifecycle ---');

    // 1.1 Unauthenticated caller querying self-profile returns 401
    const unauthProfileReq = buildRequest('/api/users/profile');
    const unauthProfileRes = await api.getProfile(unauthProfileReq);
    collector.assert(
      unauthProfileRes.status === 401,
      'AuthWall-Lifecycle',
      'Unauthenticated GET /api/users/profile blocked by auth wall (401)'
    );

    // 1.2 Sign in via Google OAuth session provisioning
    const googleLoginReq = buildRequest('/api/auth/session', {
      method: 'POST',
      body: {
        action: 'GOOGLE_AUTH',
        email: 'combo.tester@gmail.com',
        name: 'Combo Tester',
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde',
      },
    });
    const googleLoginRes = await api.session(googleLoginReq);
    collector.assert(
      googleLoginRes.status === 200,
      'AuthWall-Lifecycle',
      'POST /api/auth/session (GOOGLE_AUTH) provisions user account (200 OK)'
    );

    const googleLoginData = await googleLoginRes.json();
    const newUserId = googleLoginData.user?.id;
    collector.assert(
      Boolean(newUserId) && googleLoginData.authenticated === true,
      'AuthWall-Lifecycle',
      'Session response indicates authenticated === true with new user ID'
    );

    // 1.3 Verify cookie is issued
    const setCookieHeader = googleLoginRes.headers.get('set-cookie');
    collector.assert(
      Boolean(setCookieHeader) && setCookieHeader!.includes('seeme_session='),
      'AuthWall-Lifecycle',
      'Session sets secure seeme_session HTTP cookie'
    );

    // 1.4 Authenticated caller queries self-profile via cookie
    const authProfileReq = buildRequest('/api/users/profile', {
      cookies: { seeme_session: newUserId },
    });
    const authProfileRes = await api.getProfile(authProfileReq);
    collector.assert(
      authProfileRes.status === 200,
      'AuthWall-Lifecycle',
      'Authenticated user successfully accesses profile via session cookie (200 OK)'
    );

    const authProfileData = await authProfileRes.json();
    collector.assert(
      authProfileData.user?.email === 'combo.tester@gmail.com',
      'AuthWall-Lifecycle',
      'Self-profile returns full unredacted email for authenticated owner'
    );

    // 1.5 Sign out clears session
    const logoutReq = buildRequest('/api/auth/session', {
      method: 'POST',
      body: { action: 'LOGOUT' },
    });
    const logoutRes = await api.session(logoutReq);
    const logoutCookieHeader = logoutRes.headers.get('set-cookie');
    collector.assert(
      logoutRes.status === 200 && Boolean(logoutCookieHeader) && logoutCookieHeader!.includes('Max-Age=0'),
      'AuthWall-Lifecycle',
      'POST /api/auth/session (LOGOUT) clears session cookie with Max-Age=0'
    );

    // -------------------------------------------------------------------------
    // COMBINATION 2: Create Meetup + Join + Chat Gating + Arrival Check-In
    // -------------------------------------------------------------------------
    console.log('--- Combination 2: Create Meetup + Join + Chat Gating + Arrival Check-In ---');

    // 2.1 Host creates an OPEN meetup
    const createComboReq = buildRequest('/api/meetups', {
      method: 'POST',
      headers: { 'x-user-id': 'user-maya' },
      body: {
        title: 'Open Ping Pong & Chat Flow',
        category: 'Ping Pong',
        venueName: 'Tompkins Square Tables',
        lat: 40.7265,
        lng: -73.9815,
        maxParticipants: 4,
        joinMode: 'OPEN',
      },
    });
    const createComboRes = await api.createMeetup(createComboReq);
    collector.assert(createComboRes.status === 201, 'Meetup-Chat-CheckIn', 'Host creates OPEN meetup (201 Created)');

    const comboData = await createComboRes.json();
    const comboMeetupId = comboData.data?.meetup?.id || comboData.lobby?.id;

    // 2.2 Non-member Liam tries to send message BEFORE joining -> MUST be rejected with 403
    const earlyChatReq = buildRequest(`/api/meetups/${comboMeetupId}/messages`, {
      method: 'POST',
      headers: { 'x-user-id': 'user-liam' },
      body: { text: 'Hey, is there an open spot?' },
    });
    const earlyChatRes = await api.postMessage(earlyChatReq, { params: { id: comboMeetupId } });
    collector.assert(
      earlyChatRes.status === 403,
      'Meetup-Chat-CheckIn',
      'Non-member posting chat is strictly rejected with 403 Forbidden before joining'
    );

    // 2.3 Liam joins OPEN meetup -> 200 OK
    const liamJoinReq = buildRequest(`/api/meetups/${comboMeetupId}/join`, {
      method: 'POST',
      headers: { 'x-user-id': 'user-liam' },
      body: { action: 'JOIN' },
    });
    const liamJoinRes = await api.joinMeetup(liamJoinReq, { params: { id: comboMeetupId } });
    collector.assert(liamJoinRes.status === 200, 'Meetup-Chat-CheckIn', 'Liam successfully joins OPEN meetup');

    // 2.4 Liam can now post chat messages -> 201 Created
    const liamChatReq = buildRequest(`/api/meetups/${comboMeetupId}/messages`, {
      method: 'POST',
      headers: { 'x-user-id': 'user-liam' },
      body: { text: 'Joined! On my way with extra ping pong balls.' },
    });
    const liamChatRes = await api.postMessage(liamChatReq, { params: { id: comboMeetupId } });
    collector.assert(
      liamChatRes.status === 201,
      'Meetup-Chat-CheckIn',
      'Joined participant successfully posts in-room chat (201 Created)'
    );

    // 2.5 Liam checks in as ARRIVED with spot clue
    const liamCheckInReq = buildRequest(`/api/meetups/${comboMeetupId}/join`, {
      method: 'POST',
      headers: { 'x-user-id': 'user-liam' },
      body: {
        action: 'CHECK_IN',
        arrivalStatus: 'ARRIVED',
        spotClue: 'Table 2 under the oak tree, navy hoodie',
      },
    });
    const liamCheckInRes = await api.joinMeetup(liamCheckInReq, { params: { id: comboMeetupId } });
    collector.assert(liamCheckInRes.status === 200, 'Meetup-Chat-CheckIn', 'Liam completes arrival check-in with spot clue');

    // 2.6 Verify arrival system message was added to chat history
    const getChatReq = buildRequest(`/api/meetups/${comboMeetupId}/messages`);
    const getChatRes = await api.getMessages(getChatReq, { params: { id: comboMeetupId } });
    const chatHistoryData = await getChatRes.json();
    const systemMessages = (chatHistoryData.data?.messages || chatHistoryData.messages || []).filter(
      (m: any) => m.isSystem
    );
    collector.assert(
      systemMessages.length > 0 && systemMessages.some((m: any) => m.text?.includes('Liam Vance')),
      'Meetup-Chat-CheckIn',
      'Arrival check-in automatically broadcasts a system message to in-room chat'
    );

    // Clean up meetup
    await api.deleteMeetup(
      buildRequest(`/api/meetups/${comboMeetupId}`, { method: 'DELETE', headers: { 'x-user-id': 'user-maya' } }),
      { params: { id: comboMeetupId } }
    );

    // -------------------------------------------------------------------------
    // COMBINATION 3: Approval-Required Meetup + Request + Host Review + Capacity Guard
    // -------------------------------------------------------------------------
    console.log('--- Combination 3: Approval-Required Meetup + Request + Host Review + Capacity Guard ---');

    // 3.1 Host Elena creates meetup with joinMode='APPROVAL_REQUIRED' and maxParticipants=2
    const createApprovalReq = buildRequest('/api/meetups', {
      method: 'POST',
      headers: { 'x-user-id': 'user-elena' },
      body: {
        title: 'Competitive Chess Match (1v1)',
        category: 'Chess',
        venueName: 'Washington Sq Park Tables',
        lat: 40.7302,
        lng: -73.9985,
        maxParticipants: 2,
        joinMode: 'APPROVAL_REQUIRED',
        skillCompatibility: 'COMPETITIVE',
      },
    });
    const createApprovalRes = await api.createMeetup(createApprovalReq);
    collector.assert(createApprovalRes.status === 201, 'Approval-Capacity', 'Host creates APPROVAL_REQUIRED 2-player meetup');

    const approvalData = await createApprovalRes.json();
    const approvalMeetupId = approvalData.data?.meetup?.id || approvalData.lobby?.id;

    // 3.2 Liam and Marcus both send join requests while meetup has capacity 1/2
    const liamReqJoinReq = buildRequest(`/api/meetups/${approvalMeetupId}/join`, {
      method: 'POST',
      headers: { 'x-user-id': 'user-liam' },
      body: { action: 'REQUEST_JOIN', note: '1600 USCF rating, ready to play' },
    });
    const liamReqJoinRes = await api.joinMeetup(liamReqJoinReq, { params: { id: approvalMeetupId } });
    collector.assert(
      liamReqJoinRes.status === 200,
      'Approval-Capacity',
      'Candidate Liam sends join request with qualification note'
    );

    const marcusReqJoinReq = buildRequest(`/api/meetups/${approvalMeetupId}/join`, {
      method: 'POST',
      headers: { 'x-user-id': 'user-marcus' },
      body: { action: 'REQUEST_JOIN', note: 'Interested in playing next' },
    });
    const marcusReqJoinRes = await api.joinMeetup(marcusReqJoinReq, { params: { id: approvalMeetupId } });
    collector.assert(
      marcusReqJoinRes.status === 200,
      'Approval-Capacity',
      'Candidate Marcus sends join request while meetup is 1/2'
    );

    // 3.3 Liam still cannot chat while request is PENDING -> 403
    const pendingChatReq = buildRequest(`/api/meetups/${approvalMeetupId}/messages`, {
      method: 'POST',
      headers: { 'x-user-id': 'user-liam' },
      body: { text: 'Am I approved yet?' },
    });
    const pendingChatRes = await api.postMessage(pendingChatReq, { params: { id: approvalMeetupId } });
    collector.assert(
      pendingChatRes.status === 403,
      'Approval-Capacity',
      'Candidate cannot post chat while join request is PENDING (403 Forbidden)'
    );

    // 3.4 Host Elena accepts Liam's request (meetup becomes 2/2 full)
    const acceptReq = buildRequest(`/api/meetups/${approvalMeetupId}/join`, {
      method: 'POST',
      headers: { 'x-user-id': 'user-elena' },
      body: { action: 'ACCEPT_REQUEST', targetUserId: 'user-liam' },
    });
    const acceptRes = await api.joinMeetup(acceptReq, { params: { id: approvalMeetupId } });
    collector.assert(acceptRes.status === 200, 'Approval-Capacity', 'Host accepts join request (meetup now 2/2 full)');

    // 3.5 Now that Liam is accepted participant, he can chat
    const approvedChatReq = buildRequest(`/api/meetups/${approvalMeetupId}/messages`, {
      method: 'POST',
      headers: { 'x-user-id': 'user-liam' },
      body: { text: 'Thanks for accepting! Bringing my weighted board.' },
    });
    const approvedChatRes = await api.postMessage(approvedChatReq, { params: { id: approvalMeetupId } });
    collector.assert(
      approvedChatRes.status === 201,
      'Approval-Capacity',
      'Accepted participant can now post chat messages (201 Created)'
    );

    // 3.6 Host attempting to accept Marcus now that meetup is full (2/2) -> MUST return 400 capacity rejection
    const acceptBeyondCapReq = buildRequest(`/api/meetups/${approvalMeetupId}/join`, {
      method: 'POST',
      headers: { 'x-user-id': 'user-elena' },
      body: { action: 'ACCEPT_REQUEST', targetUserId: 'user-marcus' },
    });
    const acceptBeyondCapRes = await api.joinMeetup(acceptBeyondCapReq, { params: { id: approvalMeetupId } });
    collector.assert(
      acceptBeyondCapRes.status === 400,
      'Approval-Capacity',
      'Host accepting request on full meetup strictly rejected with 400 capacity ceiling error'
    );

    // Clean up
    await api.deleteMeetup(
      buildRequest(`/api/meetups/${approvalMeetupId}`, { method: 'DELETE', headers: { 'x-user-id': 'user-elena' } }),
      { params: { id: approvalMeetupId } }
    );

    // -------------------------------------------------------------------------
    // COMBINATION 4: Language Switcher + Localized UI Strings + Theme Toggle
    // -------------------------------------------------------------------------
    console.log('--- Combination 4: Language Switcher + Localized UI Strings + Theme Toggle ---');

    const languages: SupportedLanguage[] = ['en', 'uk', 'pl', 'de', 'fr'];
    const navigationKeys = ['explore', 'map', 'my_meetups', 'profile'] as const;

    for (const lang of languages) {
      const allKeysPresent = navigationKeys.every((key) => {
        const translation = getTranslation(lang, key);
        return Boolean(translation) && translation.length > 0;
      });
      collector.assert(
        allKeysPresent,
        'i18n-Theme',
        `Language '${lang}' translates all 4 primary navigation keys cleanly`
      );
    }

    // Verify Ukrainian Cyrillic and Polish Latin-Ext strings
    const ukExplore = getTranslation('uk', 'explore');
    const plExplore = getTranslation('pl', 'explore');
    const ukWelcome = getTranslation('uk', 'welcome_sub');
    const plWelcome = getTranslation('pl', 'welcome_sub');

    collector.assert(
      ukExplore === 'Огляд' && ukWelcome.includes('Знаходьте реальних людей'),
      'i18n-Theme',
      'Ukrainian locale correctly renders native Cyrillic strings'
    );

    collector.assert(
      plExplore === 'Odkrywaj' && plWelcome.includes('sprawdzonymi'),
      'i18n-Theme',
      'Polish locale correctly renders native Polish Latin-Ext strings'
    );

    // BAN ALL EMOJIS DIRECTIVE: Verify absolute zero emojis in i18n values
    const emojiRegex = new RegExp('[\\p{Extended_Pictographic}\\u{1F300}-\\u{1F9FF}\\u{2600}-\\u{26FF}\\u{2700}-\\u{27BF}]', 'u');
    const allTranslations = Object.values(DICTIONARY).flatMap((dict) => Object.values(dict));
    const hasEmojis = allTranslations.some((str) => typeof str === 'string' && emojiRegex.test(str));
    collector.assert(
      !hasEmojis,
      'Emoji-Ban',
      'CRITICAL: i18n dictionary is 100% free of emojis (anti-slop editorial compliance)'
    );

    // -------------------------------------------------------------------------
    // COMBINATION 5: Age Filtering + Geo Map Coordinates + Distance Radius
    // -------------------------------------------------------------------------
    console.log('--- Combination 5: Age Filtering + Geo Map Coordinates + Distance Radius ---');

    // Query LIVE meetups with user coordinates (Greenwich Village) & radius 5km
    const geo5kmReq = buildRequest('/api/meetups?lat=40.7308&lng=-73.9973&radius=5&status=LIVE');
    const geo5kmRes = await api.listMeetups(geo5kmReq);
    const geo5kmData = await geo5kmRes.json();
    const liveMeetups5km = geo5kmData.data?.meetups || [];

    collector.assert(
      liveMeetups5km.every((m: any) => m.distanceKm <= 5),
      'Geo-Radius-Sort',
      'GET /api/meetups radius=5km returns only meetups within 5km radius'
    );

    // Verify distance sorting: within LIVE status, array is sorted in ascending order of distanceKm
    let isAscending = true;
    for (let i = 1; i < liveMeetups5km.length; i++) {
      if (liveMeetups5km[i].distanceKm < liveMeetups5km[i - 1].distanceKm) {
        isAscending = false;
        break;
      }
    }
    collector.assert(
      isAscending,
      'Geo-Radius-Sort',
      'Proximity-filtered meetups are strictly sorted in ascending order of Haversine distance within status tier'
    );

    // Expand radius to 50km
    const geo50kmReq = buildRequest('/api/meetups?lat=40.7308&lng=-73.9973&radius=50');
    const geo50kmRes = await api.listMeetups(geo50kmReq);
    const geo50kmData = await geo50kmRes.json();
    const meetups50km = geo50kmData.data?.meetups || [];

    collector.assert(
      meetups50km.length >= liveMeetups5km.length,
      'Geo-Radius-Sort',
      'Expanding radius from 5km to 50km returns greater than or equal number of meetups'
    );

    // -------------------------------------------------------------------------
    // COMBINATION 6: Want-to-Play Radar Beacon + User Profile Settings
    // -------------------------------------------------------------------------
    console.log('--- Combination 6: Want-to-Play Radar Beacon + User Profile Settings ---');

    // Toggle Beacon ON via PUT /api/users/profile
    const activateBeaconReq = buildRequest('/api/users/profile', {
      method: 'PUT',
      headers: { 'x-user-id': 'user-liam' },
      body: {
        beacon: {
          active: true,
          categories: ['Chess', 'Ping Pong'],
          radiusKm: 10,
          note: 'Ready for blitz chess in SoHo',
          updatedAt: new Date().toISOString(),
        },
      },
    });
    const activateBeaconRes = await api.updateProfile(activateBeaconReq);
    collector.assert(activateBeaconRes.status === 200, 'Beacon-Settings', 'Update profile activates availability beacon (200 OK)');

    // Verify beacon is active in profile
    const beaconProfileReq = buildRequest('/api/users/profile?userId=user-liam');
    const beaconProfileRes = await api.getProfile(beaconProfileReq);
    const beaconProfileData = await beaconProfileRes.json();
    collector.assert(
      beaconProfileData.user?.beacon?.active === true &&
        beaconProfileData.user?.beacon?.categories?.includes('Chess'),
      'Beacon-Settings',
      'User profile reflects active beacon with specified categories and 10km radius'
    );

    // Update settings distance unit to 'mi'
    const settingsReq = buildRequest('/api/users/profile', {
      method: 'PUT',
      headers: { 'x-user-id': 'user-liam' },
      body: {
        settings: { distanceUnit: 'mi' },
      },
    });
    const settingsRes = await api.updateProfile(settingsReq);
    const settingsData = await settingsRes.json();
    collector.assert(
      settingsData.user?.settings?.distanceUnit === 'mi',
      'Beacon-Settings',
      'Settings successfully update distanceUnit to imperial miles (mi)'
    );

    // Toggle Beacon OFF via PUT /api/users/profile
    const deactivateBeaconReq = buildRequest('/api/users/profile', {
      method: 'PUT',
      headers: { 'x-user-id': 'user-liam' },
      body: {
        beacon: {
          active: false,
          categories: [],
          radiusKm: 5,
          note: '',
          updatedAt: new Date().toISOString(),
        },
      },
    });
    const deactivateBeaconRes = await api.updateProfile(deactivateBeaconReq);
    const deactData = await deactivateBeaconRes.json();
    collector.assert(
      deactData.user?.beacon?.active === false,
      'Beacon-Settings',
      'Update profile successfully turns off availability beacon'
    );

    // -------------------------------------------------------------------------
    // COMBINATION 7: Host Banning / Moderation + Re-Join & Feed Exclusion
    // -------------------------------------------------------------------------
    console.log('--- Combination 7: Host Banning / Moderation + Re-Join & Feed Exclusion ---');

    // Create meetup
    const createModReq = buildRequest('/api/meetups', {
      method: 'POST',
      headers: { 'x-user-id': 'user-elena' },
      body: {
        title: 'Moderation Test Meetup',
        category: 'Coffee',
        venueName: 'Cafe',
        lat: 40.724,
        lng: -73.995,
        maxParticipants: 4,
        joinMode: 'OPEN',
      },
    });
    const createModRes = await api.createMeetup(createModReq);
    const modData = await createModRes.json();
    const modMeetupId = modData.data?.meetup?.id || modData.lobby?.id;

    // Marcus joins
    await api.joinMeetup(
      buildRequest(`/api/meetups/${modMeetupId}/join`, {
        method: 'POST',
        headers: { 'x-user-id': 'user-marcus' },
        body: { action: 'JOIN' },
      }),
      { params: { id: modMeetupId } }
    );

    // Host Elena bans Marcus from the meetup
    const banReq = buildRequest(`/api/meetups/${modMeetupId}/join`, {
      method: 'POST',
      headers: { 'x-user-id': 'user-elena' },
      body: { action: 'BAN_FROM_LOBBY', targetUserId: 'user-marcus' },
    });
    const banRes = await api.joinMeetup(banReq, { params: { id: modMeetupId } });
    collector.assert(
      banRes.status === 200,
      'Moderation-Exclusion',
      'Host successfully bans unruly participant with BAN_FROM_LOBBY (200 OK)'
    );

    // Verify Marcus was removed from participants
    const checkMeetupRes = await api.getMeetup(buildRequest(`/api/meetups/${modMeetupId}`), {
      params: { id: modMeetupId },
    });
    const checkMeetupData = await checkMeetupRes.json();
    const currentMeetup = checkMeetupData.data?.meetup || checkMeetupData.lobby;
    collector.assert(
      !currentMeetup.participants.some((p: any) => p.id === 'user-marcus'),
      'Moderation-Exclusion',
      'Banned user is immediately removed from meetup participants list'
    );

    // Banned user Marcus attempts to re-join -> MUST return 403 Forbidden
    const reJoinReq = buildRequest(`/api/meetups/${modMeetupId}/join`, {
      method: 'POST',
      headers: { 'x-user-id': 'user-marcus' },
      body: { action: 'JOIN' },
    });
    const reJoinRes = await api.joinMeetup(reJoinReq, { params: { id: modMeetupId } });
    collector.assert(
      reJoinRes.status === 403,
      'Moderation-Exclusion',
      'Banned user attempting to re-join is strictly blocked with 403 Forbidden'
    );

    // Clean up
    await api.deleteMeetup(
      buildRequest(`/api/meetups/${modMeetupId}`, { method: 'DELETE', headers: { 'x-user-id': 'user-elena' } }),
      { params: { id: modMeetupId } }
    );

  } finally {
    restoreDatabase();
  }

  collector.printSummary();
  return collector;
}

if (require.main === module || process.argv[1]?.includes('tier3_combinations')) {
  runTier3CrossFeatureCombinations().then((collector) => {
    const stats = collector.getStats();
    process.exit(stats.failed === 0 ? 0 : 1);
  });
}
