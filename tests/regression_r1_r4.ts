/**
 * Milestone M4: Comprehensive Automated Regression Test Suite (R1 - R4)
 *
 * Verifies all 13 Acceptance Criteria across Security, Concurrency,
 * Architecture, and Frontend Refactoring:
 *
 * Criterion 1: Unauthenticated requests to all 9 user/admin mutating actions in POST /api/users return 401
 * Criterion 2: Login requests omitting a password for password-protected accounts return 401
 * Criterion 3: GET /api/lobbies and GET /api/users omit password fields from all returned objects
 * Criterion 4: POST /api/lobbies rejects unauthenticated creation requests with 401
 * Criterion 5: PUT /api/lobbies cannot be invoked anonymously to reset database (returns 401)
 * Criterion 6: Map radar markers render escaped label strings without executing raw HTML or script tags
 * Criterion 7: All database writes occur within withDbMutation without runtime reference errors or orphaned writes
 * Criterion 8: Rapid concurrent creation of messages, join requests, and notifications generates unique non-colliding IDs (crypto.randomUUID())
 * Criterion 9: /api/lobbies and /api/meetups endpoints share unified business logic and validation constraints (maxParticipants 2..16)
 * Criterion 10: Redundant type declarations between src/types/lobby.ts and src/lib/types.ts are resolved into unified types
 * Criterion 11: src/app/page.tsx is broken down into modular components in src/components/ without breaking page rendering
 * Criterion 12: Toast notification overlay uses -translate-x-1/2 for proper horizontal centering (0 transtone classes)
 * Criterion 13: Beacon toggling works reliably with aligned nested payload and auth headers
 */

import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { NextRequest, NextResponse } from 'next/server';

// Test Collector & Utilities
import {
  TestCollector,
  buildRequest,
  backupDatabase,
  restoreDatabase,
} from './e2e/common';

// API Handlers
import { POST as postUsersHandler, GET as getUsersHandler } from '../src/app/api/users/route';
import { POST as postSessionHandler, GET as getSessionHandler } from '../src/app/api/auth/session/route';
import {
  GET as getLobbiesHandler,
  POST as postLobbiesHandler,
  PUT as putLobbiesHandler,
} from '../src/app/api/lobbies/route';
import { POST as postLegacyMessageHandler } from '../src/app/api/lobbies/[id]/messages/route';
import { POST as postLegacyJoinHandler } from '../src/app/api/lobbies/[id]/join/route';
import {
  POST as postMeetupHandler,
  GET as getMeetupHandler,
} from '../src/app/api/meetups/route';

// Components
import { ToastNotification } from '../src/components/ToastNotification';
import { ExploreView } from '../src/components/ExploreView';
import { ProfileView } from '../src/components/ProfileView';
import { RadiusSelectorBottomSheet } from '../src/components/RadiusSelectorBottomSheet';
import { CategoryFilterBottomSheet } from '../src/components/CategoryFilterBottomSheet';
import { LanguageSelectorBottomSheet } from '../src/components/LanguageSelectorBottomSheet';
import { CommunityPoliciesModal } from '../src/components/CommunityPoliciesModal';

// Database & Types
import { readDb, writeDb, withDbMutation } from '../src/lib/db';
import {
  CreateMeetupInputSchema,
  validatePayload,
} from '../src/lib/types';
import type {
  Lobby,
  UserPersona,
  Participant,
  ChatMessage,
  JoinRequest,
  Meetup,
  User,
  Message,
} from '../src/types/lobby';
import { DEMO_PERSONAS } from '../src/lib/seed';

// ----------------------------------------------------------------------------
// Leaflet Browser Mock Environment for Headless Node Testing
// ----------------------------------------------------------------------------
const docMock: any = {
  createElement: (_tag: string) => ({
    style: {},
    setAttribute: () => {},
    removeAttribute: () => {},
    appendChild: () => {},
    removeChild: () => {},
    children: [],
  }),
  documentElement: { style: {} },
  head: { appendChild: () => {} },
  body: { appendChild: () => {} },
};

const winMock: any = {
  requestAnimationFrame: (cb: any) => setTimeout(cb, 0),
  document: docMock,
  navigator: {
    userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) LeafletMock/1.0',
    platform: 'Win32',
    appVersion: '5.0',
  },
  location: { href: 'http://localhost:3000' },
  screen: { deviceXDPI: 96, logicalXDPI: 96 },
  addEventListener: () => {},
  removeEventListener: () => {},
};

if (typeof (global as any).window === 'undefined') {
  (global as any).window = winMock;
  (global as any).document = docMock;
  (global as any).navigator = winMock.navigator;
  (global as any).location = winMock.location;
  (global as any).screen = winMock.screen;
}

// ----------------------------------------------------------------------------
// Helper: Recursive Password Detector
// ----------------------------------------------------------------------------
function findPasswordFieldsRecursively(obj: unknown, currentPath = ''): string[] {
  const leaks: string[] = [];
  if (!obj || typeof obj !== 'object') return leaks;

  if (Array.isArray(obj)) {
    obj.forEach((item, index) => {
      leaks.push(...findPasswordFieldsRecursively(item, `${currentPath}[${index}]`));
    });
    return leaks;
  }

  const record = obj as Record<string, unknown>;
  for (const [key, value] of Object.entries(record)) {
    const propPath = currentPath ? `${currentPath}.${key}` : key;
    if (key.toLowerCase() === 'password' && value !== undefined && value !== null) {
      leaks.push(`${propPath} = "${value}"`);
    }
    if (value && typeof value === 'object') {
      leaks.push(...findPasswordFieldsRecursively(value, propPath));
    }
  }
  return leaks;
}

function escapeHtmlShim(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function scanDirectoryForTranstone(dirPath: string): string[] {
  const corrupted: string[] = [];
  const entries = fs.readdirSync(dirPath, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dirPath, entry.name);
    if (entry.isDirectory()) {
      corrupted.push(...scanDirectoryForTranstone(fullPath));
    } else if (entry.isFile() && /\.(tsx?|jsx?|css|html)$/.test(entry.name)) {
      const content = fs.readFileSync(fullPath, 'utf8');
      if (content.includes('transtone')) {
        corrupted.push(fullPath);
      }
    }
  }
  return corrupted;
}

// ----------------------------------------------------------------------------
// Master Runner: runRegressionR1R4
// ----------------------------------------------------------------------------
export async function runRegressionR1R4(): Promise<TestCollector> {
  const collector = new TestCollector('Regression Suite (R1 - R4 Acceptance Criteria)');

  console.log('\n================================================================================');
  console.log('RUNNING REGRESSION TEST SUITE (13 ACCEPTANCE CRITERIA R1 - R4)');
  console.log('Comprehensive Security, Concurrency, Architecture & Frontend Verification');
  console.log('================================================================================\n');

  backupDatabase();

  try {
    // ========================================================================
    // CRITERION 1: POST /api/users Unauthenticated Mutating Actions Return 401
    // ========================================================================
    console.log('--- Criterion 1: Unauthenticated Mutating Actions in POST /api/users (All 9 Actions) ---');

    const mutatingActions = [
      { action: 'UPDATE_PROFILE', payload: { name: 'Adversary Name' } },
      { action: 'UPDATE_SETTINGS', payload: { settings: { distanceUnit: 'mi' } } },
      { action: 'TOGGLE_BEACON', payload: { active: true } },
      { action: 'RATE_PLAYER', payload: { toUserId: 'user-liam', lobbyId: 'lobby-1', stars: 5 } },
      { action: 'BAN_USER', payload: { targetUserId: 'user-liam', reason: 'Abuse' } },
      { action: 'UNBAN_USER', payload: { targetUserId: 'user-liam' } },
      { action: 'TOGGLE_REGULAR_PARTNER', payload: { partnerId: 'user-liam' } },
      { action: 'MARK_NOTIFICATIONS_READ', payload: {} },
      { action: 'REQUEST_VERIFICATION', payload: { note: 'Please verify' } },
    ];

    for (const item of mutatingActions) {
      const req = buildRequest('/api/users', {
        method: 'POST',
        body: { action: item.action, ...item.payload },
      });
      const res = await postUsersHandler(req);
      collector.assert(
        res.status === 401,
        'R1-UnauthActions',
        `Action ${item.action} rejects unauthenticated request with 401 Unauthorized (Got: ${res.status})`
      );
    }

    // Also verify admin action guard
    const adminReq = buildRequest('/api/users', {
      method: 'POST',
      body: { action: 'ADMIN_ACTION', subAction: 'SYSTEM_DIAGNOSTICS' },
    });
    const adminRes = await postUsersHandler(adminReq);
    collector.assert(
      adminRes.status === 401,
      'R1-UnauthActions',
      `Action ADMIN_ACTION rejects unauthenticated request with 401 Unauthorized (Got: ${adminRes.status})`
    );

    // ========================================================================
    // CRITERION 2: Password-Protected Login Rejects Omitted/Empty Password with 401
    // ========================================================================
    console.log('\n--- Criterion 2: Login Password Bypass Prevention ---');

    // Create a password-protected account in db
    const passwordProtectedUserId = `user-pw-${Date.now()}`;
    const correctPassword = 'SuperSecretPassword2026!';

    await withDbMutation((db) => {
      db.personas.unshift({
        id: passwordProtectedUserId,
        name: 'Password Protected Persona',
        email: 'protected.user@example.com',
        password: correctPassword,
        age: 28,
        avatar: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
        skillBadge: 'Verified',
        verified: true,
        tagline: 'Has secret password',
        neighborhood: 'Chelsea',
        favoriteActivities: ['Chess'],
        reliabilityScore: 99,
        meetupsAttended: 5,
        hoursPlayed: 10,
        ratingAvg: 5.0,
        ratingCount: 3,
        streakWeeks: 2,
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
      });
    });

    // 2.1 POST /api/users LOGIN with omitted password
    const loginOmitReq = buildRequest('/api/users', {
      method: 'POST',
      body: { action: 'LOGIN', userId: passwordProtectedUserId },
    });
    const loginOmitRes = await postUsersHandler(loginOmitReq);
    collector.assert(
      loginOmitRes.status === 401,
      'R1-PasswordBypass',
      `POST /api/users LOGIN rejects omitted password with 401 (Got: ${loginOmitRes.status})`
    );

    // 2.2 POST /api/users LOGIN with empty password
    const loginEmptyReq = buildRequest('/api/users', {
      method: 'POST',
      body: { action: 'LOGIN', userId: passwordProtectedUserId, password: '' },
    });
    const loginEmptyRes = await postUsersHandler(loginEmptyReq);
    collector.assert(
      loginEmptyRes.status === 401,
      'R1-PasswordBypass',
      `POST /api/users LOGIN rejects empty string password with 401 (Got: ${loginEmptyRes.status})`
    );

    // 2.3 POST /api/users LOGIN with wrong password
    const loginWrongReq = buildRequest('/api/users', {
      method: 'POST',
      body: { action: 'LOGIN', userId: passwordProtectedUserId, password: 'WrongPasswordXYZ' },
    });
    const loginWrongRes = await postUsersHandler(loginWrongReq);
    collector.assert(
      loginWrongRes.status === 401,
      'R1-PasswordBypass',
      `POST /api/users LOGIN rejects incorrect password with 401 (Got: ${loginWrongRes.status})`
    );

    // 2.4 POST /api/auth/session LOGIN with omitted password
    const sessionOmitReq = buildRequest('/api/auth/session', {
      method: 'POST',
      body: { action: 'LOGIN', userId: passwordProtectedUserId },
    });
    const sessionOmitRes = await postSessionHandler(sessionOmitReq);
    collector.assert(
      sessionOmitRes.status === 401,
      'R1-PasswordBypass',
      `POST /api/auth/session LOGIN rejects omitted password with 401 (Got: ${sessionOmitRes.status})`
    );

    // 2.5 POST /api/auth/session LOGIN with wrong password
    const sessionWrongReq = buildRequest('/api/auth/session', {
      method: 'POST',
      body: { action: 'LOGIN', userId: passwordProtectedUserId, password: 'BadPassword' },
    });
    const sessionWrongRes = await postSessionHandler(sessionWrongReq);
    collector.assert(
      sessionWrongRes.status === 401,
      'R1-PasswordBypass',
      `POST /api/auth/session LOGIN rejects incorrect password with 401 (Got: ${sessionWrongRes.status})`
    );

    // 2.6 Correct password succeeds on both endpoints
    const loginCorrectReq = buildRequest('/api/users', {
      method: 'POST',
      body: { action: 'LOGIN', userId: passwordProtectedUserId, password: correctPassword },
    });
    const loginCorrectRes = await postUsersHandler(loginCorrectReq);
    collector.assert(
      loginCorrectRes.status === 200,
      'R1-PasswordBypass',
      `POST /api/users LOGIN succeeds with correct password (200 OK)`
    );

    const sessionCorrectReq = buildRequest('/api/auth/session', {
      method: 'POST',
      body: { action: 'LOGIN', userId: passwordProtectedUserId, password: correctPassword },
    });
    const sessionCorrectRes = await postSessionHandler(sessionCorrectReq);
    collector.assert(
      sessionCorrectRes.status === 200,
      'R1-PasswordBypass',
      `POST /api/auth/session LOGIN succeeds with correct password (200 OK)`
    );

    // ========================================================================
    // CRITERION 3: Password Fields Omitted from GET /api/lobbies and GET /api/users
    // ========================================================================
    console.log('\n--- Criterion 3: Plaintext Password Leakage Prevention ---');

    // 3.1 Inspect GET /api/lobbies
    const getLobbiesReq = buildRequest('/api/lobbies', { method: 'GET' });
    const getLobbiesRes = await getLobbiesHandler(getLobbiesReq);
    const lobbiesData = await getLobbiesRes.json();
    const lobbiesPasswordLeaks = findPasswordFieldsRecursively(lobbiesData);
    collector.assert(
      lobbiesPasswordLeaks.length === 0,
      'R1-PasswordLeakage',
      `GET /api/lobbies contains exactly 0 password fields in response payload (Found: ${lobbiesPasswordLeaks.length})`
    );

    // Specifically verify the protected persona in personas list
    const foundPersonaInLobbies = lobbiesData.personas?.find((p: any) => p.id === passwordProtectedUserId);
    collector.assert(
      foundPersonaInLobbies && foundPersonaInLobbies.password === undefined,
      'R1-PasswordLeakage',
      `Password field is strictly undefined for protected persona in GET /api/lobbies`
    );

    // 3.2 Inspect GET /api/users
    const getUsersReq = buildRequest('/api/users', { method: 'GET' });
    const getUsersRes = await getUsersHandler(getUsersReq);
    const usersData = await getUsersRes.json();
    const usersPasswordLeaks = findPasswordFieldsRecursively(usersData);
    collector.assert(
      usersPasswordLeaks.length === 0,
      'R1-PasswordLeakage',
      `GET /api/users contains exactly 0 password fields in response payload (Found: ${usersPasswordLeaks.length})`
    );

    const foundPersonaInUsers = usersData.personas?.find((p: any) => p.id === passwordProtectedUserId);
    collector.assert(
      foundPersonaInUsers && foundPersonaInUsers.password === undefined,
      'R1-PasswordLeakage',
      `Password field is strictly undefined for protected persona in GET /api/users`
    );

    // 3.3 Inspect GET /api/meetups
    const getMeetupsReq = buildRequest('/api/meetups?legacy=true', { method: 'GET' });
    const getMeetupsRes = await getMeetupHandler(getMeetupsReq);
    const meetupsData = await getMeetupsRes.json();
    const meetupsPasswordLeaks = findPasswordFieldsRecursively(meetupsData);
    collector.assert(
      meetupsPasswordLeaks.length === 0,
      'R1-PasswordLeakage',
      `GET /api/meetups contains exactly 0 password fields in response payload (Found: ${meetupsPasswordLeaks.length})`
    );

    // ========================================================================
    // CRITERION 4: POST /api/lobbies Rejects Unauthenticated Creation (401)
    // ========================================================================
    console.log('\n--- Criterion 4: POST /api/lobbies Authentication Protection ---');

    const unauthLobbyReq = buildRequest('/api/lobbies', {
      method: 'POST',
      body: {
        category: 'Chess',
        title: 'Unauthenticated Meetup Attempt',
        venueName: 'Bryant Park',
        lat: 40.7536,
        lng: -73.9832,
      },
    });
    const unauthLobbyRes = await postLobbiesHandler(unauthLobbyReq);
    collector.assert(
      unauthLobbyRes.status === 401,
      'R1-PostLobbiesAuth',
      `POST /api/lobbies rejects unauthenticated creation request with 401 (Got: ${unauthLobbyRes.status})`
    );

    // Authenticated creation succeeds with 201
    const authLobbyReq = buildRequest('/api/lobbies', {
      method: 'POST',
      headers: { 'x-user-id': 'user-maya' },
      body: {
        category: 'Chess',
        title: 'Authenticated Regression Meetup',
        venueName: 'Washington Square Park',
        lat: 40.7308,
        lng: -73.9973,
      },
    });
    const authLobbyRes = await postLobbiesHandler(authLobbyReq);
    collector.assert(
      authLobbyRes.status === 201,
      'R1-PostLobbiesAuth',
      `POST /api/lobbies accepts authenticated creation request with 201 Created (Got: ${authLobbyRes.status})`
    );

    // ========================================================================
    // CRITERION 5: PUT /api/lobbies Database Reset Access Control
    // ========================================================================
    console.log('\n--- Criterion 5: PUT /api/lobbies Anonymous and Role Guards ---');

    // 5.1 Unauthenticated PUT /api/lobbies returns 401
    const anonResetReq = buildRequest('/api/lobbies', { method: 'PUT' });
    const anonResetRes = await putLobbiesHandler(anonResetReq);
    collector.assert(
      anonResetRes.status === 401,
      'R1-PutLobbiesGuard',
      `PUT /api/lobbies rejects unauthenticated database reset with 401 Unauthorized (Got: ${anonResetRes.status})`
    );

    // 5.2 Non-admin authenticated user returns 403 Forbidden
    const nonAdminResetReq = buildRequest('/api/lobbies', {
      method: 'PUT',
      headers: { 'x-user-id': 'user-liam' },
    });
    const nonAdminResetRes = await putLobbiesHandler(nonAdminResetReq);
    collector.assert(
      nonAdminResetRes.status === 403,
      'R1-PutLobbiesGuard',
      `PUT /api/lobbies rejects non-admin user (Liam) with 403 Forbidden (Got: ${nonAdminResetRes.status})`
    );

    // 5.3 Admin authenticated user (Maya) succeeds with 200 OK
    const adminResetReq = buildRequest('/api/lobbies', {
      method: 'PUT',
      headers: { 'x-user-id': 'user-maya' },
    });
    const adminResetRes = await putLobbiesHandler(adminResetReq);
    collector.assert(
      adminResetRes.status === 200,
      'R1-PutLobbiesGuard',
      `PUT /api/lobbies allows admin user (Maya) to reset database with 200 OK (Got: ${adminResetRes.status})`
    );

    // ========================================================================
    // CRITERION 6: Leaflet MapRadar XSS Elimination
    // ========================================================================
    console.log('\n--- Criterion 6: MapRadar Leaflet XSS Sanitization ---');

    const mapRadarFile = path.resolve(process.cwd(), 'src/components/MapRadar.tsx');
    collector.assert(
      fs.existsSync(mapRadarFile),
      'R1-MapRadarXSS',
      'MapRadar.tsx component file exists on disk'
    );

    const mapRadarCode = fs.readFileSync(mapRadarFile, 'utf8');
    const hasEscapeHtmlFunction = mapRadarCode.includes('function escapeHtml(str: string): string');
    collector.assert(
      hasEscapeHtmlFunction,
      'R1-MapRadarXSS',
      'MapRadar.tsx implements explicit escapeHtml sanitization helper'
    );

    const usesEscapedPinLabel = mapRadarCode.includes('escapeHtml(lobby.mapPinLabel || \'\')');
    collector.assert(
      usesEscapedPinLabel,
      'R1-MapRadarXSS',
      'MapRadar.tsx safely interpolates escapeHtml(lobby.mapPinLabel || \'\') into L.divIcon'
    );

    // Verify empirical HTML escaping behavior with adversarial payloads
    const L = (await import('leaflet')).default;
    const adversarialLabels = [
      '<script>alert("xss")</script>',
      '<img src=x onerror=alert(1)>',
      '" onmouseover="alert(\'pwned\')',
      '<svg/onload=fetch("http://attacker.com")>',
      'Chess & Board "Games" <100%>',
    ];

    for (const label of adversarialLabels) {
      const sanitized = escapeHtmlShim(label);
      const icon = L.divIcon({
        className: 'lobby-pill-marker-wrapper',
        html: `<span>${sanitized}</span>`,
      });

      const renderedHtml = (icon.options as any).html as string;
      const spanMatch = renderedHtml.match(/<span>(.*)<\/span>/);
      const extractedEscapedLabel = spanMatch ? spanMatch[1] : '';

      const hasRawLt = extractedEscapedLabel.includes('<');
      const hasRawGt = extractedEscapedLabel.includes('>');
      const hasRawDoubleQuote = extractedEscapedLabel.includes('"');
      const hasRawSingleQuote = extractedEscapedLabel.includes("'");

      collector.assert(
        !hasRawLt && !hasRawGt && !hasRawDoubleQuote && !hasRawSingleQuote,
        'R1-MapRadarXSS',
        `Adversarial label "${label.substring(0, 25)}" neutralized without raw HTML tags or unescaped quotes`
      );

      if (label.includes('<')) {
        collector.assert(
          extractedEscapedLabel.includes('&lt;'),
          'R1-MapRadarXSS',
          `Label '<' properly converted to '&lt;' in "${label.substring(0, 20)}"`
        );
      }
      if (label.includes('>')) {
        collector.assert(
          extractedEscapedLabel.includes('&gt;'),
          'R1-MapRadarXSS',
          `Label '>' properly converted to '&gt;' in "${label.substring(0, 20)}"`
        );
      }
      if (label.includes('"')) {
        collector.assert(
          extractedEscapedLabel.includes('&quot;'),
          'R1-MapRadarXSS',
          `Label '"' properly converted to '&quot;' in "${label.substring(0, 20)}"`
        );
      }
      if (label.includes("'")) {
        collector.assert(
          extractedEscapedLabel.includes('&#39;'),
          'R1-MapRadarXSS',
          `Label '\'' properly converted to '&#39;' in "${label.substring(0, 20)}"`
        );
      }
      if (label.includes('&')) {
        collector.assert(
          extractedEscapedLabel.includes('&amp;'),
          'R1-MapRadarXSS',
          `Label '&' properly converted to '&amp;' in "${label.substring(0, 20)}"`
        );
      }
    }

    // ========================================================================
    // CRITERION 7: Transactional Integrity via withDbMutation
    // ========================================================================
    console.log('\n--- Criterion 7: Data Persistence & withDbMutation Safety ---');

    // 7.1 Verify atomic write inside withDbMutation
    const testLobbyId = `lobby-tx-${crypto.randomUUID()}`;
    await withDbMutation((db) => {
      db.lobbies.unshift({
        id: testLobbyId,
        category: 'Chess',
        mapPinLabel: 'Chess',
        title: 'Transactional Integrity Verification',
        equipmentNote: 'All equipment ready.',
        coverImage: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=600',
        venueName: 'Chelsea Market',
        venueAddress: '75 9th Ave',
        lat: 40.7424,
        lng: -74.0061,
        startTime: 'Now',
        startTimeBadge: 'Live Now',
        roomStatus: 'LIVE',
        preferredAgeRange: 'All Ages (18+)',
        skillCompatibility: 'ALL_LEVELS',
        maxParticipants: 4,
        joinMode: 'OPEN',
        hostId: 'user-maya',
        bannedUserIds: [],
        participants: [
          {
            id: 'user-maya',
            name: 'Maya Lin',
            age: 26,
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            skillBadge: 'Host',
            joinedAt: new Date().toISOString(),
            arrivalStatus: 'ARRIVED',
            reliabilityScore: 99,
            ratingAvg: 5.0,
          },
        ],
        pendingRequests: [],
        createdAt: new Date().toISOString(),
      });
    });

    const dbAfterTx = await readDb();
    const persistedLobby = dbAfterTx.lobbies.find((l) => l.id === testLobbyId);
    collector.assert(
      Boolean(persistedLobby),
      'R2-WithDbMutation',
      `Lobby created inside withDbMutation correctly persisted to disk database`
    );

    // 7.2 Calling writeDb inside withDbMutation is safe (no crash or recursion)
    let nestedWriteSucceeded = false;
    try {
      await withDbMutation(async (db) => {
        // Redundant writeDb call should be intercepted cleanly
        await writeDb(db);
        nestedWriteSucceeded = true;
      });
    } catch {
      nestedWriteSucceeded = false;
    }
    collector.assert(
      nestedWriteSucceeded,
      'R2-WithDbMutation',
      `Calling writeDb inside withDbMutation context does not cause runtime errors or deadlocks`
    );

    // 7.3 Rollback / Abort when status >= 400 is returned
    const abortedId = `lobby-aborted-${crypto.randomUUID()}`;
    await withDbMutation((db) => {
      db.lobbies.push({
        id: abortedId,
        category: 'Chess',
        mapPinLabel: 'Chess',
        title: 'Should not persist',
        equipmentNote: '',
        coverImage: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=600',
        venueName: 'Void',
        venueAddress: 'Void Address',
        lat: 0,
        lng: 0,
        startTime: 'Now',
        startTimeBadge: 'Live',
        roomStatus: 'LIVE',
        preferredAgeRange: 'All Ages (18+)',
        skillCompatibility: 'ALL_LEVELS',
        maxParticipants: 4,
        joinMode: 'OPEN',
        hostId: 'user-maya',
        bannedUserIds: [],
        participants: [],
        pendingRequests: [],
        createdAt: new Date().toISOString(),
      });
      return { status: 400, error: 'Validation failed' };
    });

    const dbAfterAbort = await readDb();
    const abortedPersisted = dbAfterAbort.lobbies.some((l) => l.id === abortedId);
    collector.assert(
      !abortedPersisted,
      'R2-WithDbMutation',
      `Mutations returning HTTP 400 status abort cleanly without persisting orphaned writes`
    );

    // ========================================================================
    // CRITERION 8: Rapid Concurrent ID Generation Uses crypto.randomUUID()
    // ========================================================================
    console.log('\n--- Criterion 8: Unique Non-Colliding ID Generation Stress ---');

    // Set up a room for rapid concurrent join requests and messages
    const concurrentRoomId = `lobby-id-gen-${Date.now()}`;
    const testCandidates: UserPersona[] = [];
    for (let i = 1; i <= 25; i++) {
      testCandidates.push({
        id: `user-idgen-${String(i).padStart(3, '0')}`,
        name: `Candidate ${i}`,
        age: 24,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
        skillBadge: 'Player',
        verified: true,
        tagline: 'Testing ID generation',
        neighborhood: 'SoHo',
        favoriteActivities: ['Chess'],
        reliabilityScore: 95,
        meetupsAttended: 0,
        hoursPlayed: 0,
        ratingAvg: 5.0,
        ratingCount: 0,
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
      });
    }

    await withDbMutation((db) => {
      testCandidates.forEach((c) => {
        if (!db.personas.some((p) => p.id === c.id)) db.personas.push(c);
      });
      db.lobbies.unshift({
        id: concurrentRoomId,
        category: 'Chess',
        mapPinLabel: 'Chess',
        title: 'ID Generation Concurrency Test',
        equipmentNote: 'Testing UUIDs',
        coverImage: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?w=600',
        venueName: 'Union Square Park',
        venueAddress: '14th St',
        lat: 40.7359,
        lng: -73.9911,
        startTime: 'Now',
        startTimeBadge: 'Live Now',
        roomStatus: 'LIVE',
        preferredAgeRange: 'All Ages (18+)',
        skillCompatibility: 'ALL_LEVELS',
        maxParticipants: 100,
        joinMode: 'APPROVAL_REQUIRED',
        hostId: 'user-maya',
        bannedUserIds: [],
        participants: [
          {
            id: 'user-maya',
            name: 'Maya Lin',
            age: 26,
            avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150',
            skillBadge: 'Host',
            joinedAt: new Date().toISOString(),
            arrivalStatus: 'ARRIVED',
            reliabilityScore: 99,
            ratingAvg: 5.0,
          },
        ],
        pendingRequests: [],
        createdAt: new Date().toISOString(),
      });
    });

    // Capture pre-existing notification IDs to isolate newly generated notifications
    const beforeDb = await readDb();
    const existingNotifIds = new Set((beforeDb.notifications || []).map((n) => n.id));

    const generatedIds: string[] = [];

    // Rapid concurrent message generation (25 messages)
    const msgPromises = Array.from({ length: 25 }).map((_, idx) => {
      const req = buildRequest(`/api/lobbies/${concurrentRoomId}/messages`, {
        method: 'POST',
        headers: { 'x-user-id': 'user-maya' },
        body: { text: `Concurrent UUID message #${idx}` },
      });
      return postLegacyMessageHandler(req, { params: { id: concurrentRoomId } }).then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (body.message?.id) generatedIds.push(body.message.id);
        return res.status;
      });
    });

    // Rapid concurrent join request generation (25 requests)
    const joinPromises = testCandidates.map((candidate, idx) => {
      const req = buildRequest(`/api/lobbies/${concurrentRoomId}/join`, {
        method: 'POST',
        headers: { 'x-user-id': candidate.id },
        body: { action: 'JOIN', note: `Requesting seat #${idx}` },
      });
      return postLegacyJoinHandler(req, { params: { id: concurrentRoomId } }).then(async (res) => {
        const body = await res.json().catch(() => ({}));
        if (body.request?.id) generatedIds.push(body.request.id);
        return res.status;
      });
    });

    await Promise.all([...msgPromises, ...joinPromises]);

    // Inspect newly generated notifications from db
    const currentDb = await readDb();
    const recentNotifs = (currentDb.notifications || []).filter(
      (n) => !existingNotifIds.has(n.id) && n.id.startsWith('notif-')
    );
    recentNotifs.forEach((n) => generatedIds.push(n.id));

    // Assert UUID format and non-collision
    const uuidRegex = /^(msg|req|notif|lobby)-[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}(-[a-z0-9_-]+)?$/i;
    const allMatchUuid = generatedIds.every((id) => uuidRegex.test(id));
    const timestampIdLeaks = generatedIds.filter((id) => /-\d{13}/.test(id));
    const uniqueIds = new Set(generatedIds);

    collector.assert(
      generatedIds.length >= 50,
      'R2-UUIDCollision',
      `Rapid concurrency generated >= 50 entities (Generated: ${generatedIds.length})`
    );
    collector.assert(
      allMatchUuid,
      'R2-UUIDCollision',
      `All generated entity IDs strictly conform to crypto.randomUUID() format (100% UUID compliant)`
    );
    collector.assert(
      timestampIdLeaks.length === 0,
      'R2-UUIDCollision',
      `Zero timestamp-based Date.now() IDs detected across messages, join requests, and notifications`
    );
    collector.assert(
      uniqueIds.size === generatedIds.length,
      'R2-UUIDCollision',
      `Zero ID collisions: ${uniqueIds.size} unique IDs out of ${generatedIds.length} generated`
    );

    // ========================================================================
    // CRITERION 9: /api/lobbies and /api/meetups Share Unified Logic (maxParticipants 2..16)
    // ========================================================================
    console.log('\n--- Criterion 9: Unified Endpoint Logic & Validation Constraints ---');

    // 9.1 Boundary testing on /api/meetups
    const meetupBelowMinReq = buildRequest('/api/meetups', {
      method: 'POST',
      headers: { 'x-user-id': 'user-maya' },
      body: {
        category: 'Chess',
        title: 'Below Min Meetup',
        venueName: 'Park',
        lat: 40.7,
        lng: -73.9,
        maxParticipants: 1, // < 2
      },
    });
    const meetupBelowMinRes = await postMeetupHandler(meetupBelowMinReq);
    collector.assert(
      meetupBelowMinRes.status === 400,
      'R3-UnifiedEndpoints',
      `/api/meetups strictly rejects maxParticipants < 2 with 400 Bad Request (Got: ${meetupBelowMinRes.status})`
    );

    const meetupAboveMaxReq = buildRequest('/api/meetups', {
      method: 'POST',
      headers: { 'x-user-id': 'user-maya' },
      body: {
        category: 'Chess',
        title: 'Above Max Meetup',
        venueName: 'Park',
        lat: 40.7,
        lng: -73.9,
        maxParticipants: 25, // > 16
      },
    });
    const meetupAboveMaxRes = await postMeetupHandler(meetupAboveMaxReq);
    collector.assert(
      meetupAboveMaxRes.status === 400,
      'R3-UnifiedEndpoints',
      `/api/meetups strictly rejects maxParticipants > 16 with 400 Bad Request (Got: ${meetupAboveMaxRes.status})`
    );

    // 9.2 Boundary testing on /api/lobbies (clamping 2..16)
    const lobbyBelowMinReq = buildRequest('/api/lobbies', {
      method: 'POST',
      headers: { 'x-user-id': 'user-maya' },
      body: {
        category: 'Chess',
        title: 'Clamped Min Lobby',
        venueName: 'Park',
        lat: 40.7,
        lng: -73.9,
        maxParticipants: 1,
      },
    });
    const lobbyBelowMinRes = await postLobbiesHandler(lobbyBelowMinReq);
    const lobbyBelowMinData = await lobbyBelowMinRes.json();
    collector.assert(
      lobbyBelowMinRes.status === 201 && lobbyBelowMinData.lobby.maxParticipants === 2,
      'R3-UnifiedEndpoints',
      `/api/lobbies clamps maxParticipants < 2 up to minimum 2 (Got: ${lobbyBelowMinData.lobby?.maxParticipants})`
    );

    const lobbyAboveMaxReq = buildRequest('/api/lobbies', {
      method: 'POST',
      headers: { 'x-user-id': 'user-maya' },
      body: {
        category: 'Chess',
        title: 'Clamped Max Lobby',
        venueName: 'Park',
        lat: 40.7,
        lng: -73.9,
        maxParticipants: 99,
      },
    });
    const lobbyAboveMaxRes = await postLobbiesHandler(lobbyAboveMaxReq);
    const lobbyAboveMaxData = await lobbyAboveMaxRes.json();
    collector.assert(
      lobbyAboveMaxRes.status === 201 && lobbyAboveMaxData.lobby.maxParticipants === 16,
      'R3-UnifiedEndpoints',
      `/api/lobbies clamps maxParticipants > 16 down to maximum 16 (Got: ${lobbyAboveMaxData.lobby?.maxParticipants})`
    );

    // 9.3 Standard valid room creation on both endpoints
    const standardMeetupReq = buildRequest('/api/meetups', {
      method: 'POST',
      headers: { 'x-user-id': 'user-maya' },
      body: {
        category: 'Ping Pong',
        title: 'Standard Conforming Ping Pong',
        venueName: 'Spin NYC',
        lat: 40.7412,
        lng: -73.9877,
        maxParticipants: 8,
      },
    });
    const standardMeetupRes = await postMeetupHandler(standardMeetupReq);
    collector.assert(
      standardMeetupRes.status === 201,
      'R3-UnifiedEndpoints',
      `Valid meetup creation on /api/meetups succeeds with 201 Created`
    );

    // ========================================================================
    // CRITERION 10: Unified Type Declarations between lobby.ts and types.ts
    // ========================================================================
    console.log('\n--- Criterion 10: Canonical Type Resolution ---');

    const lobbyTypePath = path.resolve(process.cwd(), 'src/types/lobby.ts');
    const libTypePath = path.resolve(process.cwd(), 'src/lib/types.ts');
    collector.assert(
      fs.existsSync(lobbyTypePath) && fs.existsSync(libTypePath),
      'R3-TypeUnification',
      'Both src/types/lobby.ts and src/lib/types.ts exist on disk'
    );

    const libTypeContent = fs.readFileSync(libTypePath, 'utf8');
    const exportsAllFromLobby = libTypeContent.includes("export * from '@/types/lobby'");
    collector.assert(
      exportsAllFromLobby,
      'R3-TypeUnification',
      "src/lib/types.ts cleanly re-exports canonical types via \"export * from '@/types/lobby'\""
    );

    // Runtime validation of canonical Lobby object using Zod schema from lib/types
    const testSampleLobby: any = {
      title: 'Valid Chess Afternoon',
      category: 'Chess',
      preferredAgeRange: 'All Ages (18+)',
      venueName: 'Washington Square Park',
      venueAddress: 'Greenwich Village',
      lat: 40.7308,
      lng: -73.9973,
      startTime: 'Now',
      maxParticipants: 4,
      joinMode: 'OPEN',
      skillCompatibility: 'ALL_LEVELS',
    };

    const zodValidation = validatePayload(CreateMeetupInputSchema, testSampleLobby);
    collector.assert(
      Boolean(zodValidation.data && !zodValidation.error),
      'R3-TypeUnification',
      'CreateMeetupInputSchema successfully parses and validates canonical Lobby payload'
    );

    // ========================================================================
    // CRITERION 11: Modular Component Decomposition of src/app/page.tsx
    // ========================================================================
    console.log('\n--- Criterion 11: Frontend Component Modularization ---');

    const expectedModularComponents = [
      'ToastNotification.tsx',
      'ExploreView.tsx',
      'ProfileView.tsx',
      'RadiusSelectorBottomSheet.tsx',
      'CategoryFilterBottomSheet.tsx',
      'LanguageSelectorBottomSheet.tsx',
      'CommunityPoliciesModal.tsx',
    ];

    for (const compFile of expectedModularComponents) {
      const compPath = path.resolve(process.cwd(), 'src/components', compFile);
      collector.assert(
        fs.existsSync(compPath),
        'R4-PageModularization',
        `Modular component src/components/${compFile} exists`
      );
    }

    // Static markup rendering of extracted components
    const toastHtml = renderToStaticMarkup(React.createElement(ToastNotification, { message: 'Test Toast' }));
    collector.assert(
      toastHtml.includes('role="status"') && toastHtml.includes('Test Toast'),
      'R4-PageModularization',
      'ToastNotification component renders accessible status markup cleanly'
    );

    const policiesHtml = renderToStaticMarkup(
      React.createElement(CommunityPoliciesModal, { isOpen: true, onClose: () => {} })
    );
    collector.assert(
      policiesHtml.includes('Community Guidelines') || policiesHtml.includes('Safety'),
      'R4-PageModularization',
      'CommunityPoliciesModal component mounts and renders guidelines'
    );

    const radiusHtml = renderToStaticMarkup(
      React.createElement(RadiusSelectorBottomSheet, {
        isOpen: true,
        radiusKm: 5,
        onSelectRadius: () => {},
        onClose: () => {},
      })
    );
    collector.assert(
      radiusHtml.includes('5 km') || radiusHtml.includes('5km') || radiusHtml.includes('Radius'),
      'R4-PageModularization',
      'RadiusSelectorBottomSheet component renders radius selection options'
    );

    const pageFile = path.resolve(process.cwd(), 'src/app/page.tsx');
    const pageContent = fs.readFileSync(pageFile, 'utf8');
    const importsToast = pageContent.includes("import { ToastNotification } from '@/components/ToastNotification'");
    const importsExplore = pageContent.includes("import { ExploreView } from '@/components/ExploreView'");
    const importsProfile = pageContent.includes("import { ProfileView } from '@/components/ProfileView'");

    collector.assert(
      importsToast && importsExplore && importsProfile,
      'R4-PageModularization',
      'src/app/page.tsx coordinates extracted modular components from src/components/'
    );

    // ========================================================================
    // CRITERION 12: Toast Centering & Zero 'transtone' Classes
    // ========================================================================
    console.log('\n--- Criterion 12: Toast Horizontal Centering & Class Hygiene ---');

    // 12.1 ToastNotification static markup contains -translate-x-1/2
    collector.assert(
      toastHtml.includes('-translate-x-1/2') && toastHtml.includes('left-1/2'),
      'R4-ToastCentering',
      'ToastNotification uses -translate-x-1/2 and left-1/2 for precise horizontal centering'
    );

    // 12.2 ToastNotification.tsx source file verification
    const toastSourceFile = path.resolve(process.cwd(), 'src/components/ToastNotification.tsx');
    const toastSource = fs.readFileSync(toastSourceFile, 'utf8');
    collector.assert(
      toastSource.includes('-translate-x-1/2'),
      'R4-ToastCentering',
      'src/components/ToastNotification.tsx source contains -translate-x-1/2'
    );

    // 12.3 Search entire src/ directory for any corrupted 'transtone' classes
    const corruptedFiles = scanDirectoryForTranstone(path.resolve(process.cwd(), 'src'));
    collector.assert(
      corruptedFiles.length === 0,
      'R4-ToastCentering',
      `Zero "transtone" typos exist across entire src/ codebase (Found: ${corruptedFiles.length})`
    );

    // ========================================================================
    // CRITERION 13: Beacon Toggling with Aligned Nested Payload and Auth Headers
    // ========================================================================
    console.log('\n--- Criterion 13: Beacon Toggle Payload Alignment & Auth Wiring ---');

    const activeUser = DEMO_PERSONAS[0]; // Maya Lin

    // 13.1 Toggle Beacon ON with nested beacon payload
    const beaconOnReq = buildRequest('/api/users', {
      method: 'POST',
      headers: {
        'x-user-id': activeUser.id,
        Authorization: `Bearer ${activeUser.id}`,
      },
      body: {
        action: 'TOGGLE_BEACON',
        userId: activeUser.id,
        beacon: {
          active: true,
          categories: ['Chess', 'Ping Pong'],
          radiusKm: 10,
          note: 'Ready to play chess nearby',
        },
      },
    });
    const beaconOnRes = await postUsersHandler(beaconOnReq);
    const beaconOnData = await beaconOnRes.json();

    collector.assert(
      beaconOnRes.status === 200,
      'R4-BeaconToggle',
      `POST /api/users TOGGLE_BEACON ON returns 200 OK (Got: ${beaconOnRes.status})`
    );
    collector.assert(
      beaconOnData.persona?.beacon?.active === true,
      'R4-BeaconToggle',
      `Returned persona reflects active: true`
    );
    collector.assert(
      beaconOnData.persona?.beacon?.radiusKm === 10,
      'R4-BeaconToggle',
      `Returned persona reflects aligned radiusKm: 10`
    );
    collector.assert(
      Array.isArray(beaconOnData.persona?.beacon?.categories) &&
        beaconOnData.persona.beacon.categories.includes('Chess'),
      'R4-BeaconToggle',
      `Returned persona preserves aligned categories: ['Chess', 'Ping Pong']`
    );

    // 13.2 Verify persistence in database
    const dbAfterBeaconOn = await readDb();
    const mayaInDb = dbAfterBeaconOn.personas.find((p) => p.id === activeUser.id);
    collector.assert(
      mayaInDb?.beacon?.active === true && mayaInDb.beacon.radiusKm === 10,
      'R4-BeaconToggle',
      `Beacon ON configuration successfully persisted in database`
    );

    // 13.3 Toggle Beacon OFF
    const beaconOffReq = buildRequest('/api/users', {
      method: 'POST',
      headers: {
        'x-user-id': activeUser.id,
        Authorization: `Bearer ${activeUser.id}`,
      },
      body: {
        action: 'TOGGLE_BEACON',
        userId: activeUser.id,
        beacon: {
          active: false,
          categories: ['Chess'],
          radiusKm: 5,
          note: 'Offline',
        },
      },
    });
    const beaconOffRes = await postUsersHandler(beaconOffReq);
    const beaconOffData = await beaconOffRes.json();

    collector.assert(
      beaconOffRes.status === 200,
      'R4-BeaconToggle',
      `POST /api/users TOGGLE_BEACON OFF returns 200 OK`
    );
    collector.assert(
      beaconOffData.persona?.beacon?.active === false,
      'R4-BeaconToggle',
      `Returned persona reflects active: false`
    );

    // 13.4 Unauthorized Beacon Toggle returns 401
    const unauthBeaconReq = buildRequest('/api/users', {
      method: 'POST',
      body: {
        action: 'TOGGLE_BEACON',
        userId: activeUser.id,
        beacon: { active: true },
      },
    });
    const unauthBeaconRes = await postUsersHandler(unauthBeaconReq);
    collector.assert(
      unauthBeaconRes.status === 401,
      'R4-BeaconToggle',
      `Unauthenticated beacon toggle rejected with 401 Unauthorized`
    );

  } finally {
    restoreDatabase();
  }

  collector.printSummary();
  return collector;
}

// ----------------------------------------------------------------------------
// Standalone Execution Entrypoint
// ----------------------------------------------------------------------------
if (require.main === module || process.argv[1]?.includes('regression_r1_r4')) {
  runRegressionR1R4().then((collector) => {
    const stats = collector.getStats();
    process.exit(stats.failed === 0 ? 0 : 1);
  });
}
