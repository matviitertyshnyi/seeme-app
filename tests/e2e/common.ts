import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

// Ensure E2E tests run purely against isolated local snapshot and never mutate cloud Redis
delete process.env.UPSTASH_REDIS_REST_URL;
delete process.env.UPSTASH_REDIS_REST_TOKEN;
delete process.env.KV_REST_API_URL;
delete process.env.KV_REST_API_TOKEN;

// API Handlers
import { POST as createMeetupHandler, GET as listMeetupsHandler } from '../../src/app/api/meetups/route';
import {
  GET as getMeetupHandler,
  PUT as updateMeetupHandler,
  DELETE as deleteMeetupHandler,
} from '../../src/app/api/meetups/[id]/route';
import { POST as joinMeetupHandler } from '../../src/app/api/meetups/[id]/join/route';
import { POST as postMessageHandler, GET as getMessagesHandler } from '../../src/app/api/meetups/[id]/messages/route';
import { GET as getProfileHandler, PUT as updateProfileHandler } from '../../src/app/api/users/profile/route';
import { POST as sessionHandler, GET as getSessionHandler } from '../../src/app/api/auth/session/route';
import { POST as usersActionHandler } from '../../src/app/api/users/route';

// Legacy Proxy Handlers
import { GET as legacyListHandler, POST as legacyCreateHandler } from '../../src/app/api/lobbies/route';
import {
  GET as legacyGetHandler,
  PUT as legacyUpdateHandler,
  DELETE as legacyDeleteHandler,
} from '../../src/app/api/lobbies/[id]/route';
import { POST as legacyJoinHandler } from '../../src/app/api/lobbies/[id]/join/route';
import { POST as legacyMessageHandler, GET as legacyGetMessagesHandler } from '../../src/app/api/lobbies/[id]/messages/route';

export { readDb, writeDb } from '../../src/lib/db';
import { INITIAL_SEED_DATA } from '../../src/lib/seed';

export interface AssertionRecord {
  tier: string;
  category: string;
  testName: string;
  passed: boolean;
  detail?: string;
  durationMs?: number;
}

export class TestCollector {
  private records: AssertionRecord[] = [];
  private tierName: string;
  private startTime: number;

  constructor(tierName: string) {
    this.tierName = tierName;
    this.startTime = Date.now();
  }

  assert(condition: boolean, category: string, testName: string, detail?: string): boolean {
    const passed = Boolean(condition);
    this.records.push({
      tier: this.tierName,
      category,
      testName,
      passed,
      detail,
    });

    if (passed) {
      console.log(`  ✓ [PASS] [${category}] ${testName}`);
    } else {
      console.error(`  ✗ [FAIL] [${category}] ${testName}${detail ? ` -> ${detail}` : ''}`);
    }
    return passed;
  }

  record(record: AssertionRecord) {
    this.records.push(record);
    if (record.passed) {
      console.log(`  ✓ [PASS] [${record.category}] ${record.testName}`);
    } else {
      console.error(`  ✗ [FAIL] [${record.category}] ${record.testName}${record.detail ? ` -> ${record.detail}` : ''}`);
    }
  }

  getResults(): AssertionRecord[] {
    return this.records;
  }

  getStats() {
    const total = this.records.length;
    const passed = this.records.filter((r) => r.passed).length;
    const failed = total - passed;
    const passRate = total > 0 ? (passed / total) * 100 : 100;
    const duration = Date.now() - this.startTime;
    return {
      tier: this.tierName,
      total,
      passed,
      failed,
      passRate: Number(passRate.toFixed(1)),
      durationMs: duration,
    };
  }

  printSummary() {
    const stats = this.getStats();
    console.log(`\n================================================================`);
    console.log(`SUMMARY: ${stats.tier}`);
    console.log(`Total Checks: ${stats.total} | Passed: ${stats.passed} | Failed: ${stats.failed}`);
    console.log(`Pass Rate: ${stats.passRate}% | Execution: ${stats.durationMs}ms`);
    console.log(`================================================================\n`);
    if (stats.failed > 0) {
      console.error(`FAILED ASSERTIONS IN ${stats.tier}:`);
      this.records
        .filter((r) => !r.passed)
        .forEach((r) => console.error(` - [${r.category}] ${r.testName}: ${r.detail || 'Assertion failed'}`));
    }
  }
}

// Database Isolation Backup & Restore
const DB_PATH = path.join(process.cwd(), 'data', 'db.json');
let dbSnapshot: string | null = null;

const TEST_FIXTURE_PERSONAS = [
  {
    id: 'user-maya',
    email: 'maya@seeme.app',
    name: 'Maya Lin',
    age: 24,
    avatar: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
    photoVerified: true,
    skillBadge: 'Adv Pong',
    tagline: 'Product designer. Always down for 1v1 ping pong or park chess.',
    neighborhood: 'Greenwich Village',
    onboarded: true,
    verified: true,
    verificationStatus: 'VERIFIED',
    role: 'ADMIN',
    isBanned: false,
    favoriteActivities: ['Ping Pong', 'Chess', 'Coffee'],
    reliabilityScore: 99,
    meetupsAttended: 18,
    hoursPlayed: 32,
    ratingAvg: 4.9,
    ratingCount: 15,
    streakWeeks: 5,
    bannedUserIds: [],
    regularPartnerIds: ['user-liam', 'user-elena'],
    settings: {
      iosAndroidPush: true,
      soundEffects: true,
      hapticFeedback: true,
      distanceUnit: 'km',
      profileVisible: true,
      showReliabilityScore: true,
    },
  },
  {
    id: 'user-liam',
    email: 'liam@seeme.app',
    name: 'Liam Vance',
    age: 27,
    avatar: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
    photoVerified: true,
    skillBadge: '1550 Elo',
    tagline: '1550 rapid chess player. Always carrying a weighted board & clock.',
    neighborhood: 'SoHo',
    onboarded: true,
    verified: true,
    verificationStatus: 'VERIFIED',
    role: 'USER',
    isBanned: false,
    favoriteActivities: ['Chess', 'Board Games', 'Co-work'],
    reliabilityScore: 97,
    meetupsAttended: 24,
    hoursPlayed: 46,
    ratingAvg: 4.8,
    ratingCount: 21,
    streakWeeks: 7,
    bannedUserIds: [],
    regularPartnerIds: ['user-maya'],
    settings: {
      iosAndroidPush: true,
      soundEffects: true,
      hapticFeedback: true,
      distanceUnit: 'km',
      profileVisible: true,
      showReliabilityScore: true,
    },
  },
  {
    id: 'user-elena',
    email: 'elena@seeme.app',
    name: 'Elena Rostova',
    age: 25,
    avatar: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
    photoVerified: true,
    skillBadge: '3.5 NTRP',
    tagline: '3.5 NTRP tennis player, strategy board gamer, and cold brew regular.',
    neighborhood: 'East Village',
    onboarded: true,
    verified: true,
    verificationStatus: 'VERIFIED',
    role: 'USER',
    isBanned: false,
    favoriteActivities: ['Tennis', 'Board Games', 'Run Club'],
    reliabilityScore: 96,
    meetupsAttended: 14,
    hoursPlayed: 27,
    ratingAvg: 4.9,
    ratingCount: 12,
    streakWeeks: 4,
    bannedUserIds: [],
    regularPartnerIds: ['user-maya', 'user-marcus'],
    settings: {
      iosAndroidPush: true,
      soundEffects: true,
      hapticFeedback: true,
      distanceUnit: 'km',
      profileVisible: true,
      showReliabilityScore: true,
    },
  },
  {
    id: 'user-marcus',
    email: 'marcus@seeme.app',
    name: 'Marcus Cole',
    age: 28,
    avatar: 'data:image/jpeg;base64,/9j/4AAQSkZJRg==',
    photoVerified: true,
    skillBadge: '5:00/km',
    tagline: 'Easy 5:00/km social runs, half-court hoops, and third-wave espresso.',
    neighborhood: 'Chelsea',
    onboarded: true,
    verified: true,
    verificationStatus: 'VERIFIED',
    role: 'USER',
    isBanned: false,
    favoriteActivities: ['Run Club', 'Basketball', 'Coffee'],
    reliabilityScore: 95,
    meetupsAttended: 29,
    hoursPlayed: 54,
    ratingAvg: 4.7,
    ratingCount: 25,
    streakWeeks: 9,
    bannedUserIds: [],
    regularPartnerIds: ['user-elena'],
    settings: {
      iosAndroidPush: true,
      soundEffects: true,
      hapticFeedback: true,
      distanceUnit: 'km',
      profileVisible: true,
      showReliabilityScore: true,
    },
  },
];

const TEST_FIXTURE_LOBBIES = [
  {
    id: 'lobby-chess-1',
    category: 'Chess',
    mapPinLabel: 'CHESS',
    title: 'Over-the-Board 10+0 Rapid Chess',
    equipmentNote: 'Bringing 2 tournament vinyl boards, triple-weighted pieces, and two DGT digital clocks.',
    coverImage: 'https://images.unsplash.com/photo-1529699211952-734e80c4d42b?auto=format&fit=crop&w=1000&q=80',
    venueName: 'Washington Sq Park SW Tables',
    venueAddress: 'MacDougal St & W 4th St, Greenwich Village',
    lat: 40.7302,
    lng: -73.9985,
    startTime: 'Now',
    startTimeBadge: 'Live Now',
    roomStatus: 'LIVE',
    skillCompatibility: 'ALL_LEVELS',
    maxParticipants: 4,
    joinMode: 'OPEN',
    hostId: 'user-liam',
    bannedUserIds: [],
    participants: [
      {
        id: 'user-liam',
        name: 'Liam Vance',
        age: 27,
        avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=400&q=80',
        skillBadge: '1550 Elo',
        joinedAt: '2026-11-01T23:10:00.000Z',
        arrivalStatus: 'ARRIVED',
        spotClue: 'Stone table 3, dark green hoodie',
        reliabilityScore: 97,
        ratingAvg: 4.8,
      },
      {
        id: 'user-maya',
        name: 'Maya Lin',
        age: 24,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        skillBadge: '1250 Elo',
        joinedAt: '2026-11-01T23:18:00.000Z',
        arrivalStatus: 'FIVE_MIN_OUT',
        reliabilityScore: 99,
        ratingAvg: 4.9,
      },
    ],
    pendingRequests: [],
    createdAt: '2026-11-01T23:10:00.000Z',
  },
  {
    id: 'lobby-pong-1',
    category: 'Ping Pong',
    mapPinLabel: 'PONG',
    title: '1v1 Outdoor Table Ping Pong',
    equipmentNote: 'I have 2 extra butterfly ping pong paddles and a fresh pack of 3-star balls.',
    coverImage: 'https://images.unsplash.com/photo-1534158914592-062992fbe900?auto=format&fit=crop&w=1000&q=80',
    venueName: 'Tompkins Square Concrete Tables',
    venueAddress: 'E 7th St & Ave A, East Village',
    lat: 40.7265,
    lng: -73.9815,
    startTime: 'Now',
    startTimeBadge: 'Live Now',
    roomStatus: 'LIVE',
    skillCompatibility: 'CASUAL',
    maxParticipants: 2,
    joinMode: 'APPROVAL_REQUIRED',
    hostId: 'user-maya',
    bannedUserIds: [],
    participants: [
      {
        id: 'user-maya',
        name: 'Maya Lin',
        age: 24,
        avatar: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=400&q=80',
        skillBadge: 'Adv Pong',
        joinedAt: '2026-11-01T23:20:00.000Z',
        arrivalStatus: 'ARRIVED',
        reliabilityScore: 99,
        ratingAvg: 4.9,
      },
    ],
    pendingRequests: [],
    createdAt: '2026-11-01T23:20:00.000Z',
  },
  {
    id: 'lobby-coffee-1',
    category: 'Coffee',
    mapPinLabel: 'COFFEE',
    title: 'Spontaneous Cortado & Design Walk',
    equipmentNote: 'Down to chat design, startups, or music and walk SoHo.',
    coverImage: 'https://images.unsplash.com/photo-1501339847302-ac426a4a7cbb?auto=format&fit=crop&w=1000&q=80',
    venueName: 'La Cabra Roastery SoHo',
    venueAddress: '284 Lafayette St, SoHo',
    lat: 40.7244,
    lng: -73.9958,
    startTime: 'Now',
    startTimeBadge: 'Live Now',
    roomStatus: 'LIVE',
    skillCompatibility: 'ALL_LEVELS',
    maxParticipants: 2,
    joinMode: 'OPEN',
    hostId: 'user-elena',
    bannedUserIds: [],
    participants: [
      {
        id: 'user-elena',
        name: 'Elena Rostova',
        age: 25,
        avatar: 'https://images.unsplash.com/photo-1517841905240-472988babdf9?auto=format&fit=crop&w=400&q=80',
        skillBadge: 'Social',
        joinedAt: '2026-11-01T23:30:00.000Z',
        arrivalStatus: 'ARRIVED',
        reliabilityScore: 96,
        ratingAvg: 4.9,
      },
    ],
    pendingRequests: [],
    createdAt: '2026-11-01T23:30:00.000Z',
  },
];

export function backupDatabase() {
  for (const tp of TEST_FIXTURE_PERSONAS) {
    const clone = JSON.parse(JSON.stringify(tp));
    const idx = INITIAL_SEED_DATA.personas.findIndex((p: any) => p.id === tp.id);
    if (idx >= 0) {
      INITIAL_SEED_DATA.personas[idx] = clone;
    } else {
      INITIAL_SEED_DATA.personas.push(clone);
    }
  }
  for (const tl of TEST_FIXTURE_LOBBIES) {
    const clone = JSON.parse(JSON.stringify(tl));
    const idx = INITIAL_SEED_DATA.lobbies.findIndex((l: any) => l.id === tl.id);
    if (idx >= 0) {
      INITIAL_SEED_DATA.lobbies[idx] = clone;
    } else {
      INITIAL_SEED_DATA.lobbies.push(clone);
    }
  }
  if (fs.existsSync(DB_PATH)) {
    if (dbSnapshot === null) {
      dbSnapshot = fs.readFileSync(DB_PATH, 'utf-8');
    }
    try {
      const parsed = JSON.parse(dbSnapshot);
      const existingPersonaIds = new Set((parsed.personas || []).map((p: any) => p.id));
      for (const tp of TEST_FIXTURE_PERSONAS) {
        if (!existingPersonaIds.has(tp.id)) {
          parsed.personas.push(JSON.parse(JSON.stringify(tp)));
        }
      }
      const existingLobbyIds = new Set((parsed.lobbies || []).map((l: any) => l.id));
      for (const tl of TEST_FIXTURE_LOBBIES) {
        if (!existingLobbyIds.has(tl.id)) {
          parsed.lobbies.push(JSON.parse(JSON.stringify(tl)));
        }
      }
      fs.writeFileSync(DB_PATH, JSON.stringify(parsed, null, 2), 'utf-8');
    } catch {
      // ignore parse errors
    }
  }
}

export function restoreDatabase() {
  if (dbSnapshot !== null && fs.existsSync(DB_PATH)) {
    fs.writeFileSync(DB_PATH, dbSnapshot, 'utf-8');
  }
}

// Helper to construct NextRequest instances
export function buildRequest(
  urlPath: string,
  options: {
    method?: string;
    headers?: Record<string, string>;
    body?: any;
    cookies?: Record<string, string>;
  } = {}
): NextRequest {
  const method = options.method || 'GET';
  const headers = new Headers();

  if (options.headers) {
    for (const [k, v] of Object.entries(options.headers)) {
      headers.set(k, v);
    }
  }

  if (options.cookies) {
    const cookieHeader = Object.entries(options.cookies)
      .map(([k, v]) => `${k}=${encodeURIComponent(v)}`)
      .join('; ');
    headers.set('cookie', cookieHeader);
  }

  const init: RequestInit = {
    method,
    headers,
  };

  if (options.body !== undefined && method !== 'GET' && method !== 'HEAD') {
    if (!headers.has('content-type')) {
      headers.set('content-type', 'application/json');
    }
    init.body = typeof options.body === 'string' ? options.body : JSON.stringify(options.body);
  }

  const fullUrl = urlPath.startsWith('http') ? urlPath : `http://localhost:3000${urlPath.startsWith('/') ? '' : '/'}${urlPath}`;
  return new NextRequest(fullUrl, init as any);
}

// Export API handlers for use across tests
export const api = {
  createMeetup: createMeetupHandler,
  listMeetups: listMeetupsHandler,
  getMeetup: getMeetupHandler,
  updateMeetup: updateMeetupHandler,
  deleteMeetup: deleteMeetupHandler,
  joinMeetup: joinMeetupHandler,
  postMessage: postMessageHandler,
  getMessages: getMessagesHandler,
  getProfile: getProfileHandler,
  updateProfile: updateProfileHandler,
  session: sessionHandler,
  getSession: getSessionHandler,
  usersAction: usersActionHandler,

  // Legacy proxies
  legacyList: legacyListHandler,
  legacyCreate: legacyCreateHandler,
  legacyGet: legacyGetHandler,
  legacyUpdate: legacyUpdateHandler,
  legacyDelete: legacyDeleteHandler,
  legacyJoin: legacyJoinHandler,
  legacyMessage: legacyMessageHandler,
  legacyGetMessages: legacyGetMessagesHandler,
};
