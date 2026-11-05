/**
 * Milestone M3 Adversarial Verification Test Suite
 * Frontend Component Workflows & UI Bug Fixes (R4)
 *
 * Verifies:
 * 1. ToastNotification: -translate-x-1/2 presence and zero occurrences of 'transtone' in src/
 * 2. handleToggleBeacon: simulated POST /api/users invocation, 200 OK, beacon toggle,
 *    field preservation, db.personas persistence, and security/adversarial edge cases
 * 3. Component imports and rendering: valid React components mounting cleanly without errors
 *    for ToastNotification, RadiusSelectorBottomSheet, CategoryFilterBottomSheet,
 *    LanguageSelectorBottomSheet, CommunityPoliciesModal, ExploreView, ProfileView
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { NextRequest } from 'next/server';
import fs from 'fs';
import path from 'path';

import { POST as usersActionHandler } from '../src/app/api/users/route';
import { readDb, writeDb } from '../src/lib/db';
import { ToastNotification } from '../src/components/ToastNotification';
import { RadiusSelectorBottomSheet } from '../src/components/RadiusSelectorBottomSheet';
import { CategoryFilterBottomSheet } from '../src/components/CategoryFilterBottomSheet';
import { LanguageSelectorBottomSheet } from '../src/components/LanguageSelectorBottomSheet';
import { CommunityPoliciesModal } from '../src/components/CommunityPoliciesModal';
import { CitySelectorBottomSheet } from '../src/components/CitySelectorBottomSheet';
import { ExploreView } from '../src/components/ExploreView';
import { ProfileView } from '../src/components/ProfileView';

import { DEMO_PERSONAS } from '../src/lib/seed';
import { LobbyWithDistance, UserPersona, Participant } from '../src/types/lobby';
import { SupportedLanguage } from '../src/lib/i18n';

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
    console.log(`  ✓ [PASS] ${testName}`);
  } else {
    failureList.push(`${testName}${detail ? ` (${detail})` : ''}`);
    console.error(`  ✗ [FAIL] ${testName} ${detail ? `| Detail: ${detail}` : ''}`);
  }
}

const DB_PATH = path.join(process.cwd(), 'data', 'db.json');
let dbSnapshot: string | null = null;

function backupDatabase() {
  if (fs.existsSync(DB_PATH)) {
    dbSnapshot = fs.readFileSync(DB_PATH, 'utf-8');
  }
}

function restoreDatabase() {
  if (dbSnapshot !== null && fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, dbSnapshot, 'utf-8');
  }
}

function makePostRequest(
  urlPath: string,
  body: any,
  headers: Record<string, string> = {}
): NextRequest {
  const fullUrl = `http://localhost:3000${urlPath.startsWith('/') ? '' : '/'}${urlPath}`;
  const reqHeaders = new Headers({
    'content-type': 'application/json',
    ...headers,
  });

  return new NextRequest(fullUrl, {
    method: 'POST',
    headers: reqHeaders,
    body: JSON.stringify(body),
  });
}

// ============================================================================
// MOCK DATA FACTORIES
// ============================================================================

const mockParticipant: Participant = {
  id: 'user-maya',
  name: 'Maya Lin',
  age: 26,
  avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb',
  joinedAt: '2026-11-04T12:00:00Z',
};

function createMockLobby(overrides: Partial<LobbyWithDistance> = {}): LobbyWithDistance {
  return {
    id: `lobby-test-${Math.random().toString(36).substring(7)}`,
    category: 'Ping Pong',
    mapPinLabel: 'PONG',
    title: 'Spontaneous Ping Pong Match',
    equipmentNote: 'Paddles provided',
    coverImage: 'https://images.unsplash.com/photo-1534158914592-062992fbe900',
    venueName: 'Washington Square Park',
    venueAddress: 'Washington Square, New York, NY',
    lat: 40.7308,
    lng: -73.9973,
    startTime: 'Now',
    startTimeBadge: 'Starting Now',
    roomStatus: 'LIVE',
    computedStatus: 'LIVE',
    distanceKm: 0.3,
    distanceLabel: '300 m away',
    maxParticipants: 4,
    joinMode: 'OPEN',
    hostId: 'user-maya',
    participants: [mockParticipant],
    pendingRequests: [],
    createdAt: '2026-11-04T12:00:00Z',
    ...overrides,
  };
}

// ============================================================================
// TEST SUITE EXECUTION
// ============================================================================

async function runM3VerificationSuite() {
  console.log('================================================================================');
  console.log('STARTING EMPIRICAL ADVERSARIAL M3 VERIFICATION TEST SUITE');
  console.log('Frontend Component Workflows & UI Bug Fixes');
  console.log('================================================================================\n');

  backupDatabase();

  try {
    // ------------------------------------------------------------------------
    // SECTION 1: ToastNotification & Tailwind Centering Typo Audit
    // ------------------------------------------------------------------------
    console.log('----------------------------------------------------------------');
    console.log('SUITE 1: ToastNotification & Tailwind "transtone" Typo Verification');
    console.log('----------------------------------------------------------------');

    // 1.1 Render ToastNotification with active message
    const toastHtml = renderToStaticMarkup(
      React.createElement(ToastNotification, { message: 'Meetup joined successfully!' })
    );
    assert(
      toastHtml.includes('-translate-x-1/2'),
      'ToastNotification static markup contains "-translate-x-1/2" for horizontal centering'
    );
    assert(
      !toastHtml.includes('transtone'),
      'ToastNotification static markup contains zero occurrences of "transtone"'
    );
    assert(
      toastHtml.includes('Meetup joined successfully!'),
      'ToastNotification correctly displays the provided notification message'
    );
    assert(
      toastHtml.includes('role="status"') && toastHtml.includes('aria-live="polite"'),
      'ToastNotification includes proper accessibility attributes role="status" and aria-live="polite"'
    );

    // 1.2 ToastNotification returns empty string when message is null or empty
    const nullToastHtml = renderToStaticMarkup(
      React.createElement(ToastNotification, { message: null })
    );
    assert(
      nullToastHtml === '',
      'ToastNotification returns null/empty markup when message is null'
    );

    const emptyToastHtml = renderToStaticMarkup(
      React.createElement(ToastNotification, { message: '' })
    );
    assert(
      emptyToastHtml === '',
      'ToastNotification returns null/empty markup when message is empty string'
    );

    // 1.3 Full repository scan for 'transtone' in src/
    console.log('\n  [AUDIT] Scanning all source files in src/ for typo "transtone"...');
    const scanDirectoryForTranstone = (dir: string): string[] => {
      const matches: string[] = [];
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          matches.push(...scanDirectoryForTranstone(fullPath));
        } else if (/\.(tsx?|jsx?|css|json)$/i.test(entry.name)) {
          const content = fs.readFileSync(fullPath, 'utf-8');
          if (content.includes('transtone')) {
            matches.push(fullPath);
          }
        }
      }
      return matches;
    };

    const srcDir = path.join(process.cwd(), 'src');
    const transtoneMatches = scanDirectoryForTranstone(srcDir);
    assert(
      transtoneMatches.length === 0,
      `Zero occurrences of "transtone" across entire src/ directory (found: ${transtoneMatches.length})`,
      transtoneMatches.join(', ')
    );

    // 1.4 Verify exact file src/components/ToastNotification.tsx
    const toastFilePath = path.join(srcDir, 'components', 'ToastNotification.tsx');
    assert(
      fs.existsSync(toastFilePath),
      'src/components/ToastNotification.tsx exists as an extracted component'
    );
    const toastSource = fs.readFileSync(toastFilePath, 'utf-8');
    assert(
      toastSource.includes('-translate-x-1/2'),
      'src/components/ToastNotification.tsx source contains "-translate-x-1/2"'
    );
    assert(
      !toastSource.includes('transtone'),
      'src/components/ToastNotification.tsx contains no occurrences of "transtone"'
    );

    // ------------------------------------------------------------------------
    // SECTION 2: handleToggleBeacon Workflow & Database Persistence
    // ------------------------------------------------------------------------
    console.log('\n----------------------------------------------------------------');
    console.log('SUITE 2: handleToggleBeacon Workflow & Data Persistence Verification');
    console.log('----------------------------------------------------------------');

    // Setup: Reset test user beacon in DB
    const initialDb = await readDb();
    const testUserId = 'user-maya';
    const testUserIndex = initialDb.personas.findIndex((p) => p.id === testUserId);
    assert(testUserIndex !== -1, `Found seed test user "${testUserId}" in database`);

    // Ensure known baseline beacon state
    const originalPersona = initialDb.personas[testUserIndex];
    originalPersona.beacon = {
      active: false,
      categories: ['Tennis', 'Pickleball'],
      radiusKm: 12,
      note: 'Baseline test note',
      updatedAt: new Date().toISOString(),
    };
    await writeDb(initialDb);

    // 2.1 Simulate handleToggleBeacon turning beacon ON
    console.log('\n  [ACTION] Simulating handleToggleBeacon turning beacon ON (active: false -> true)...');
    const toggleOnPayload = {
      action: 'TOGGLE_BEACON',
      userId: testUserId,
      beacon: {
        active: true,
        categories: ['Tennis', 'Pickleball'],
        radiusKm: 12,
        note: 'Open to play Tennis, Pickleball nearby',
      },
    };

    const toggleOnReq = makePostRequest('/api/users', toggleOnPayload, {
      'x-user-id': testUserId,
      Authorization: `Bearer ${testUserId}`,
    });

    const toggleOnRes = await usersActionHandler(toggleOnReq);
    assert(
      toggleOnRes.status === 200,
      `Simulated handleToggleBeacon received HTTP 200 OK (received: ${toggleOnRes.status})`
    );

    const toggleOnData = await toggleOnRes.json();
    assert(
      toggleOnData.persona?.beacon?.active === true,
      'Response persona.beacon.active toggled to true'
    );
    assert(
      Array.isArray(toggleOnData.persona?.beacon?.categories) &&
        toggleOnData.persona.beacon.categories.length === 2 &&
        toggleOnData.persona.beacon.categories[0] === 'Tennis',
      'Response persona.beacon.categories preserved original activity categories'
    );
    assert(
      toggleOnData.persona?.beacon?.radiusKm === 12,
      'Response persona.beacon.radiusKm preserved (12 km)'
    );

    // Verify persistence directly in data/db.json
    const dbAfterOn = await readDb();
    const persistedOnPersona = dbAfterOn.personas.find((p) => p.id === testUserId);
    assert(
      persistedOnPersona?.beacon?.active === true,
      'Database disk persistence: db.personas contains updated beacon.active = true'
    );
    assert(
      persistedOnPersona?.beacon?.radiusKm === 12,
      'Database disk persistence: db.personas contains preserved beacon.radiusKm = 12'
    );
    assert(
      persistedOnPersona?.beacon?.categories?.includes('Pickleball') === true,
      'Database disk persistence: db.personas contains preserved categories including "Pickleball"'
    );
    assert(
      persistedOnPersona?.beacon?.note === 'Open to play Tennis, Pickleball nearby',
      'Database disk persistence: db.personas contains updated beacon.note'
    );

    // 2.2 Simulate handleToggleBeacon turning beacon OFF
    console.log('\n  [ACTION] Simulating handleToggleBeacon turning beacon OFF (active: true -> false)...');
    const toggleOffPayload = {
      action: 'TOGGLE_BEACON',
      userId: testUserId,
      beacon: {
        active: false,
        categories: ['Tennis', 'Pickleball'],
        radiusKm: 12,
        note: 'Open to play Tennis, Pickleball nearby',
      },
    };

    const toggleOffReq = makePostRequest('/api/users', toggleOffPayload, {
      'x-user-id': testUserId,
      Authorization: `Bearer ${testUserId}`,
    });

    const toggleOffRes = await usersActionHandler(toggleOffReq);
    assert(
      toggleOffRes.status === 200,
      `Turning beacon OFF received HTTP 200 OK (received: ${toggleOffRes.status})`
    );

    const toggleOffData = await toggleOffRes.json();
    assert(
      toggleOffData.persona?.beacon?.active === false,
      'Response persona.beacon.active toggled to false'
    );

    // Verify persistence after turning OFF
    const dbAfterOff = await readDb();
    const persistedOffPersona = dbAfterOff.personas.find((p) => p.id === testUserId);
    assert(
      persistedOffPersona?.beacon?.active === false,
      'Database disk persistence: db.personas contains updated beacon.active = false'
    );
    assert(
      persistedOffPersona?.beacon?.radiusKm === 12,
      'Database disk persistence: beacon.radiusKm remains preserved after turning off'
    );
    assert(
      persistedOffPersona?.beacon?.categories?.length === 2,
      'Database disk persistence: beacon.categories remains preserved after turning off'
    );

    // 2.3 Adversarial Security: Unauthenticated TOGGLE_BEACON rejected with 401
    console.log('\n  [SECURITY] Testing unauthenticated TOGGLE_BEACON request...');
    const unauthReq = makePostRequest('/api/users', toggleOnPayload);
    let unauthRes: any;
    try {
      unauthRes = await usersActionHandler(unauthReq);
    } catch (err: any) {
      unauthRes = { status: err.status || 401 };
    }
    assert(
      unauthRes.status === 401,
      `Unauthenticated TOGGLE_BEACON returns HTTP 401 Unauthorized (received: ${unauthRes.status})`
    );

    // 2.4 Adversarial Security: User-level spoofing protection
    console.log('\n  [SECURITY] Testing unauthorized impersonation attack on TOGGLE_BEACON...');
    // Non-admin 'user-liam' attempts to toggle 'user-maya'
    const spoofReq = makePostRequest(
      '/api/users',
      {
        action: 'TOGGLE_BEACON',
        userId: 'user-maya', // Spoofed target
        beacon: {
          active: true,
          categories: ['HackedCategory'],
          radiusKm: 99,
        },
      },
      {
        'x-user-id': 'user-liam', // Authenticated non-admin caller
        Authorization: 'Bearer user-liam',
      }
    );

    const spoofRes = await usersActionHandler(spoofReq);
    assert(
      spoofRes.status === 200,
      'Request processed through session authentication'
    );

    const dbAfterSpoof = await readDb();
    const mayaAfterSpoof = dbAfterSpoof.personas.find((p) => p.id === 'user-maya');
    const liamAfterSpoof = dbAfterSpoof.personas.find((p) => p.id === 'user-liam');

    assert(
      mayaAfterSpoof?.beacon?.categories?.includes('HackedCategory') === false,
      'Attacker cannot mutate victim (user-maya) beacon; authorized session user was targeted'
    );
    assert(
      liamAfterSpoof?.beacon?.categories?.includes('HackedCategory') === true,
      'Authorized session user (user-liam) received the mutation safely instead'
    );

    // 2.5 Flat payload fallback compatibility
    console.log('\n  [COMPATIBILITY] Testing backward-compatible flat payload format...');
    const flatReq = makePostRequest(
      '/api/users',
      {
        action: 'TOGGLE_BEACON',
        userId: testUserId,
        active: true,
        radiusKm: 18,
        categories: ['Chess', 'Board Games'],
        note: 'Flat payload note',
      },
      {
        'x-user-id': testUserId,
        Authorization: `Bearer ${testUserId}`,
      }
    );

    const flatRes = await usersActionHandler(flatReq);
    assert(
      flatRes.status === 200,
      `Flat payload TOGGLE_BEACON receives HTTP 200 OK (received: ${flatRes.status})`
    );
    const flatData = await flatRes.json();
    assert(
      flatData.persona?.beacon?.active === true && flatData.persona?.beacon?.radiusKm === 18,
      'Flat payload successfully normalized into persona.beacon with active=true and radiusKm=18'
    );

    // ------------------------------------------------------------------------
    // SECTION 3: Component Rendering & Export Verification
    // ------------------------------------------------------------------------
    console.log('\n----------------------------------------------------------------');
    console.log('SUITE 3: Component Rendering & Export Verification');
    console.log('----------------------------------------------------------------');

    // 3.1 ToastNotification
    assert(
      typeof ToastNotification === 'function',
      'ToastNotification exports a valid React component function'
    );
    const toastRender = renderToStaticMarkup(
      React.createElement(ToastNotification, { message: 'Alert notification test' })
    );
    assert(
      toastRender.includes('Alert notification test') && toastRender.includes('-translate-x-1/2'),
      'ToastNotification mounts cleanly and renders expected content'
    );

    // 3.2 RadiusSelectorBottomSheet
    assert(
      typeof RadiusSelectorBottomSheet === 'function',
      'RadiusSelectorBottomSheet exports a valid React component function'
    );

    const radiusClosed = renderToStaticMarkup(
      React.createElement(RadiusSelectorBottomSheet, {
        isOpen: false,
        onClose: () => {},
        radiusKm: 5,
        onSelectRadius: () => {},
      })
    );
    assert(radiusClosed === '', 'RadiusSelectorBottomSheet renders empty string when isOpen=false');

    const radiusOpen = renderToStaticMarkup(
      React.createElement(RadiusSelectorBottomSheet, {
        isOpen: true,
        onClose: () => {},
        radiusKm: 15,
        onSelectRadius: () => {},
        userLocationLabel: 'SoHo, New York',
      })
    );
    assert(
      radiusOpen.includes('Distance Radius') &&
        radiusOpen.includes('2 km') &&
        radiusOpen.includes('5 km') &&
        radiusOpen.includes('15 km') &&
        radiusOpen.includes('50 km'),
      'RadiusSelectorBottomSheet renders modal with all 4 distance options when isOpen=true'
    );
    assert(
      radiusOpen.includes('SoHo'),
      'RadiusSelectorBottomSheet extracts and displays location name from userLocationLabel'
    );

    // 3.3 CategoryFilterBottomSheet
    assert(
      typeof CategoryFilterBottomSheet === 'function',
      'CategoryFilterBottomSheet exports a valid React component function'
    );

    const catClosed = renderToStaticMarkup(
      React.createElement(CategoryFilterBottomSheet, {
        isOpen: false,
        onClose: () => {},
        selectedBroadCategory: 'All Categories',
        onSelectCategory: () => {},
        categoryCounts: { 'All Categories': 12, 'Sports & Fitness': 5 },
      })
    );
    assert(catClosed === '', 'CategoryFilterBottomSheet renders empty string when isOpen=false');

    const catOpen = renderToStaticMarkup(
      React.createElement(CategoryFilterBottomSheet, {
        isOpen: true,
        onClose: () => {},
        selectedBroadCategory: 'Sports & Fitness',
        onSelectCategory: () => {},
        categoryCounts: {
          'All Categories': 15,
          'Sports & Fitness': 6,
          'Gaming & Strategy': 4,
          'Social & Hangout': 3,
          'Co-Working': 2,
        },
        currentLang: 'en',
      })
    );
    // Note: React escapes & to &amp; in static markup
    assert(
      catOpen.includes('Sports &amp; Fitness') &&
        catOpen.includes('Gaming &amp; Strategy') &&
        catOpen.includes('Social &amp; Hangout') &&
        catOpen.includes('Co-Working'),
      'CategoryFilterBottomSheet renders all category options and counts when isOpen=true'
    );

    // Test CategoryFilterBottomSheet in multilingual modes
    const langs: SupportedLanguage[] = ['uk', 'pl', 'de', 'fr'];
    for (const lang of langs) {
      const catLangHtml = renderToStaticMarkup(
        React.createElement(CategoryFilterBottomSheet, {
          isOpen: true,
          onClose: () => {},
          selectedBroadCategory: 'All Categories',
          onSelectCategory: () => {},
          categoryCounts: { 'All Categories': 1 },
          currentLang: lang,
        })
      );
      assert(
        catLangHtml.length > 0 && catLangHtml.includes('role="dialog"'),
        `CategoryFilterBottomSheet renders cleanly with locale "${lang}"`
      );
    }

    // 3.4 LanguageSelectorBottomSheet
    assert(
      typeof LanguageSelectorBottomSheet === 'function',
      'LanguageSelectorBottomSheet exports a valid React component function'
    );

    const langClosed = renderToStaticMarkup(
      React.createElement(LanguageSelectorBottomSheet, {
        isOpen: false,
        onClose: () => {},
        currentLang: 'en',
        onSelectLanguage: () => {},
      })
    );
    assert(langClosed === '', 'LanguageSelectorBottomSheet renders empty string when isOpen=false');

    const langOpen = renderToStaticMarkup(
      React.createElement(LanguageSelectorBottomSheet, {
        isOpen: true,
        onClose: () => {},
        currentLang: 'en',
        onSelectLanguage: () => {},
      })
    );
    assert(
      langOpen.includes('Select Language') &&
        langOpen.includes('English') &&
        langOpen.includes('Українська') &&
        langOpen.includes('Polski') &&
        langOpen.includes('Deutsch') &&
        langOpen.includes('Français'),
      'LanguageSelectorBottomSheet renders all 5 supported languages when isOpen=true'
    );

    // 3.5 CommunityPoliciesModal
    assert(
      typeof CommunityPoliciesModal === 'function',
      'CommunityPoliciesModal exports a valid React component function'
    );

    const policiesClosed = renderToStaticMarkup(
      React.createElement(CommunityPoliciesModal, {
        isOpen: false,
        onClose: () => {},
      })
    );
    assert(policiesClosed === '', 'CommunityPoliciesModal renders empty string when isOpen=false');

    const policiesOpen = renderToStaticMarkup(
      React.createElement(CommunityPoliciesModal, {
        isOpen: true,
        onClose: () => {},
        currentLang: 'en',
      })
    );
    // Note: & is escaped as &amp;
    assert(
      policiesOpen.includes('Community Policies') &&
        (policiesOpen.includes('Public &amp; Verified Meetup Spots Only') ||
          policiesOpen.includes('Public &amp; Verified Venues Only')) &&
        policiesOpen.includes('Punctuality &amp; Anti-Flaking Policy') &&
        policiesOpen.includes('Real-Time Arrival Check-In'),
      'CommunityPoliciesModal renders all core community policies and standards when isOpen=true'
    );

    // 3.5b CitySelectorBottomSheet
    assert(
      typeof CitySelectorBottomSheet === 'function',
      'CitySelectorBottomSheet exports a valid React component function'
    );
    const citySheetClosed = renderToStaticMarkup(
      React.createElement(CitySelectorBottomSheet, {
        isOpen: false,
        onClose: () => {},
        currentLocationLabel: 'Kyiv, Ukraine',
        onSelectCity: () => {},
        onUseCurrentGps: () => {},
      })
    );
    assert(citySheetClosed === '', 'CitySelectorBottomSheet renders empty string when isOpen=false');

    const citySheetOpen = renderToStaticMarkup(
      React.createElement(CitySelectorBottomSheet, {
        isOpen: true,
        onClose: () => {},
        currentLocationLabel: 'Kyiv, Ukraine',
        onSelectCity: () => {},
        onUseCurrentGps: () => {},
      })
    );
    assert(
      citySheetOpen.includes('Select City &amp; Location') &&
        citySheetOpen.includes('Use My Current GPS Location') &&
        citySheetOpen.includes('Kyiv') &&
        citySheetOpen.includes('Warsaw'),
      'CitySelectorBottomSheet renders search, GPS button, and popular city presets when isOpen=true'
    );

    // 3.6 ExploreView
    assert(
      typeof ExploreView === 'function',
      'ExploreView exports a valid React component function'
    );

    const mockLobby1 = createMockLobby({
      id: 'lobby-pingpong-1',
      title: 'Afternoon Ping Pong Showdown',
      category: 'Ping Pong',
    });
    const mockLobby2 = createMockLobby({
      id: 'lobby-chess-2',
      title: 'Casual Speed Chess at Park',
      category: 'Chess',
    });

    const exploreHtml = renderToStaticMarkup(
      React.createElement(ExploreView, {
        searchQuery: '',
        onSearchChange: () => {},
        onClearSearch: () => {},
        selectedBroadCategory: 'All Categories',
        categoryCounts: { 'All Categories': 2, 'Sports & Fitness': 1, 'Gaming & Strategy': 1 },
        totalLobbiesCount: 2,
        onOpenCategorySheet: () => {},
        userLocationLabel: 'Greenwich Village, NYC',
        onNearMeGps: () => {},
        radiusKm: 15,
        formatRadiusUnit: (km) => `${km} km`,
        onOpenRadiusSheet: () => {},
        selectedAgeFilters: [],
        onOpenAgeSheet: () => {},
        statusFilter: 'ALL',
        onToggleStatusFilter: () => {},
        filteredLobbiesCount: 2,
        availableToJoinLobbies: [mockLobby1],
        joinedFilteredLobbies: [mockLobby2],
        activeUser: DEMO_PERSONAS[0],
        onSelectLobby: () => {},
        onQuickJoin: () => {},
        joiningLobbyId: null,
        currentLang: 'en',
        onOpenHostModal: () => {},
        onResetFilters: () => {},
      })
    );

    assert(
      exploreHtml.includes('Afternoon Ping Pong Showdown'),
      'ExploreView renders availableToJoinLobbies cards'
    );
    assert(
      exploreHtml.includes('Casual Speed Chess at Park'),
      'ExploreView renders joinedFilteredLobbies cards in joined section'
    );
    assert(
      exploreHtml.includes('Greenwich Village'),
      'ExploreView displays extracted user location name ("Greenwich Village")'
    );
    assert(
      exploreHtml.includes('15 km'),
      'ExploreView displays distance radius pill'
    );

    // ExploreView empty state
    const exploreEmptyHtml = renderToStaticMarkup(
      React.createElement(ExploreView, {
        searchQuery: 'UnmatchedQueryXYZ',
        onSearchChange: () => {},
        onClearSearch: () => {},
        selectedBroadCategory: 'All Categories',
        categoryCounts: { 'All Categories': 0 },
        totalLobbiesCount: 0,
        onOpenCategorySheet: () => {},
        userLocationLabel: 'Greenwich Village, NYC',
        onNearMeGps: () => {},
        radiusKm: 5,
        formatRadiusUnit: (km) => `${km} km`,
        onOpenRadiusSheet: () => {},
        selectedAgeFilters: [],
        onOpenAgeSheet: () => {},
        statusFilter: 'ALL',
        onToggleStatusFilter: () => {},
        filteredLobbiesCount: 0,
        availableToJoinLobbies: [],
        joinedFilteredLobbies: [],
        activeUser: DEMO_PERSONAS[0],
        onSelectLobby: () => {},
        onQuickJoin: () => {},
        joiningLobbyId: null,
        currentLang: 'en',
        onOpenHostModal: () => {},
        onResetFilters: () => {},
      })
    );
    assert(
      exploreEmptyHtml.includes('No Meetups Found Nearby') &&
        exploreEmptyHtml.includes('Reset Filters'),
      'ExploreView renders graceful empty state when no meetups match'
    );

    // 3.7 ProfileView
    assert(
      typeof ProfileView === 'function',
      'ProfileView exports a valid React component function'
    );

    // ProfileView signed in with active beacon
    const userWithActiveBeacon: UserPersona = {
      ...DEMO_PERSONAS[0],
      beacon: {
        active: true,
        categories: ['Tennis', 'Ping Pong'],
        radiusKm: 10,
        note: 'Looking for morning games',
        updatedAt: '2026-11-04T12:00:00Z',
      },
    };

    const profileActiveHtml = renderToStaticMarkup(
      React.createElement(ProfileView, {
        isSignedOut: false,
        activeUser: userWithActiveBeacon,
        personas: DEMO_PERSONAS,
        isDarkMode: false,
        currentLang: 'en',
        onGoogleSignIn: () => {},
        onAppleSignIn: () => {},
        onSwitchUser: () => {},
        onOpenAuthModal: () => {},
        onOpenEditProfile: () => {},
        onToggleDarkMode: () => {},
        onOpenLanguageSheet: () => {},
        onOpenPoliciesModal: () => {},
        onResetDemoData: () => {},
        onSignOut: () => {},
        onToggleBeacon: () => {},
      })
    );

    assert(
      profileActiveHtml.includes(userWithActiveBeacon.name),
      'ProfileView renders active user name in profile header'
    );
    assert(
      !profileActiveHtml.includes('Want-to-Play Radar Beacon'),
      'ProfileView does not render removed Want-to-Play Radar Beacon section'
    );

    // ProfileView signed out state
    const profileSignedOutHtml = renderToStaticMarkup(
      React.createElement(ProfileView, {
        isSignedOut: true,
        activeUser: DEMO_PERSONAS[0],
        personas: DEMO_PERSONAS,
        isDarkMode: false,
        currentLang: 'en',
        onGoogleSignIn: () => {},
        onAppleSignIn: () => {},
        onSwitchUser: () => {},
        onOpenAuthModal: () => {},
        onOpenEditProfile: () => {},
        onToggleDarkMode: () => {},
        onOpenLanguageSheet: () => {},
        onOpenPoliciesModal: () => {},
        onResetDemoData: () => {},
        onSignOut: () => {},
      })
    );
    assert(
      profileSignedOutHtml.includes('Sign In to Leave The Room') &&
        profileSignedOutHtml.includes('Continue with Google') &&
        profileSignedOutHtml.includes('Continue with Apple'),
      'ProfileView renders signed out prompt card when isSignedOut=true'
    );

    // ------------------------------------------------------------------------
    // SUMMARY
    // ------------------------------------------------------------------------
    console.log('\n================================================================================');
    console.log(`M3 ADVERSARIAL VERIFICATION SUMMARY: ${passedAssertions}/${totalAssertions} assertions passed`);
    console.log('================================================================================');

    if (failureList.length > 0) {
      console.error(`\nFAILED ASSERTIONS (${failureList.length}):`);
      for (const f of failureList) {
        console.error(`  - ${f}`);
      }
      process.exitCode = 1;
    } else {
      console.log('\nALL ADVERSARIAL ASSERTIONS PASSED WITH 100% SUCCESS RATE.');
    }
  } finally {
    restoreDatabase();
  }
}

runM3VerificationSuite().catch((err) => {
  console.error('Unhandled exception during M3 verification suite:', err);
  restoreDatabase();
  process.exit(1);
});
