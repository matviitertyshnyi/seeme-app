import fs from 'fs';
import path from 'path';
import { NextRequest, NextResponse } from 'next/server';

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

export function backupDatabase() {
  if (fs.existsSync(DB_PATH)) {
    dbSnapshot = fs.readFileSync(DB_PATH, 'utf-8');
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
