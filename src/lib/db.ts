import fs from 'fs';
import path from 'path';
import os from 'os';
import { AsyncLocalStorage } from 'async_hooks';
import { DatabaseSchema, UserPersona } from '@/types/lobby';
import { Meetup, ChatMessage } from '@/lib/types';
import { INITIAL_SEED_DATA } from '@/lib/seed';
import { getMapPinLabelForCategory, getDefaultCoverForCategory } from '@/lib/geo';

const REDIS_KEY = 'seeme:db';

// AsyncLocalStorage store to track active in-flight database transactions
const txStorage = new AsyncLocalStorage<DatabaseSchema>();

interface CloudConfig {
  url: string;
  token: string;
  provider: 'upstash' | 'vercel-kv';
}

function getCloudConfig(): CloudConfig | null {
  const upstashUrl = process.env.UPSTASH_REDIS_REST_URL;
  const upstashToken = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (upstashUrl && upstashToken) {
    return { url: upstashUrl.replace(/\/$/, ''), token: upstashToken, provider: 'upstash' };
  }

  const kvUrl = process.env.KV_REST_API_URL;
  const kvToken = process.env.KV_REST_API_TOKEN;
  if (kvUrl && kvToken) {
    return { url: kvUrl.replace(/\/$/, ''), token: kvToken, provider: 'vercel-kv' };
  }

  return null;
}

export function isCloudDatabaseConnected(): boolean {
  return getCloudConfig() !== null;
}

let activeDbDir: string = path.join(process.cwd(), 'data');
let activeDbPath: string = path.join(activeDbDir, 'db.json');

function resolveDbPaths() {
  const isServerless = Boolean(process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME);
  if (isServerless) {
    activeDbDir = path.join(os.tmpdir(), 'seeme-data');
    activeDbPath = path.join(activeDbDir, 'db.json');
  } else {
    activeDbDir = path.join(process.cwd(), 'data');
    activeDbPath = path.join(activeDbDir, 'db.json');
  }
}

resolveDbPaths();

function ensureDirExists(dirPath: string) {
  try {
    if (!fs.existsSync(dirPath)) {
      fs.mkdirSync(dirPath, { recursive: true });
    }
  } catch {
    const fallbackDir = path.join(os.tmpdir(), 'seeme-data');
    if (!fs.existsSync(fallbackDir)) {
      fs.mkdirSync(fallbackDir, { recursive: true });
    }
    activeDbDir = fallbackDir;
    activeDbPath = path.join(fallbackDir, 'db.json');
  }
}

// Mutex and atomic file write implementation
let writeMutex: Promise<unknown> = Promise.resolve();

function enqueueWrite<T>(op: () => Promise<T>): Promise<T> {
  const current = writeMutex.then(op, op);
  writeMutex = current.then(
    () => {},
    () => {}
  );
  return current;
}

async function atomicWriteLocalFile(targetPath: string, data: DatabaseSchema): Promise<void> {
  const dir = path.dirname(targetPath);
  ensureDirExists(dir);

  const payload = JSON.stringify(data, null, 2);
  const randomSuffix = Math.random().toString(36).substring(2, 9);
  const tmpPath = path.join(dir, `.tmp-${Date.now()}-${randomSuffix}.json`);

  try {
    await fs.promises.writeFile(tmpPath, payload, 'utf-8');

    try {
      await fs.promises.rename(tmpPath, targetPath);
    } catch (renameErr: any) {
      if (
        process.platform === 'win32' &&
        (renameErr.code === 'EPERM' || renameErr.code === 'EBUSY' || renameErr.code === 'EEXIST')
      ) {
        await new Promise((resolve) => setTimeout(resolve, 30));
        await fs.promises.copyFile(tmpPath, targetPath);
        await fs.promises.unlink(tmpPath).catch(() => {});
      } else {
        throw renameErr;
      }
    }
  } catch (err) {
    await fs.promises.unlink(tmpPath).catch(() => {});
    throw err;
  }
}

// Local DB read and write fallbacks
function readLocalDb(): DatabaseSchema {
  resolveDbPaths();
  ensureDirExists(activeDbDir);

  try {
    if (!fs.existsSync(activeDbPath)) {
      const repoDbPath = path.join(process.cwd(), 'data', 'db.json');
      let initialSeed: DatabaseSchema = INITIAL_SEED_DATA;
      if (fs.existsSync(repoDbPath)) {
        try {
          const rawRepo = fs.readFileSync(repoDbPath, 'utf-8');
          initialSeed = JSON.parse(rawRepo);
        } catch {
          initialSeed = INITIAL_SEED_DATA;
        }
      }
      writeLocalDb(initialSeed);
      return initialSeed;
    }

    const raw = fs.readFileSync(activeDbPath, 'utf-8');
    const parsed = JSON.parse(raw) as DatabaseSchema;
    if (!parsed || !Array.isArray(parsed.lobbies) || !Array.isArray(parsed.personas)) {
      throw new Error('Invalid database structure');
    }
    if (!Array.isArray(parsed.ratings)) parsed.ratings = INITIAL_SEED_DATA.ratings || [];
    if (!Array.isArray(parsed.notifications)) parsed.notifications = INITIAL_SEED_DATA.notifications || [];
    if (!Array.isArray(parsed.messages)) parsed.messages = INITIAL_SEED_DATA.messages || [];
    INITIAL_SEED_DATA.personas.forEach((seedPersona) => {
      if (!parsed.personas.some((p) => p.id === seedPersona.id)) {
        parsed.personas.push(seedPersona);
      }
    });
    return parsed;
  } catch {
    const seedClone = JSON.parse(JSON.stringify(INITIAL_SEED_DATA)) as DatabaseSchema;
    try {
      writeLocalDb(seedClone);
    } catch {
      // ignore write error
    }
    return seedClone;
  }
}

function writeLocalDb(data: DatabaseSchema): void {
  ensureDirExists(activeDbDir);
  const jsonStr = JSON.stringify(data, null, 2);
  const randomSuffix = Math.random().toString(36).substring(2, 9);
  const tmpPath = path.join(activeDbDir, `.tmp-sync-${Date.now()}-${randomSuffix}.json`);

  try {
    fs.writeFileSync(tmpPath, jsonStr, 'utf-8');
    try {
      fs.renameSync(tmpPath, activeDbPath);
    } catch (e: any) {
      if (process.platform === 'win32') {
        fs.copyFileSync(tmpPath, activeDbPath);
        try {
          fs.unlinkSync(tmpPath);
        } catch {}
      } else {
        throw e;
      }
    }
  } catch {
    const fallbackDir = path.join(os.tmpdir(), 'seeme-data');
    ensureDirExists(fallbackDir);
    activeDbDir = fallbackDir;
    activeDbPath = path.join(fallbackDir, 'db.json');
    fs.writeFileSync(activeDbPath, jsonStr, 'utf-8');
  }
}

// Core persistent readDb and writeDb
export async function readDb(): Promise<DatabaseSchema> {
  const activeTxDb = txStorage.getStore();
  if (activeTxDb) {
    return activeTxDb;
  }

  const cloud = getCloudConfig();
  if (cloud) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch(`${cloud.url}/get/${REDIS_KEY}`, {
        headers: { Authorization: `Bearer ${cloud.token}` },
        cache: 'no-store',
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const body = (await res.json()) as { result?: unknown };
        if (body && body.result) {
          let parsed: DatabaseSchema | null = null;
          if (typeof body.result === 'string') {
            try {
              parsed = JSON.parse(body.result) as DatabaseSchema;
            } catch {
              parsed = null;
            }
          } else if (typeof body.result === 'object' && body.result !== null) {
            parsed = body.result as DatabaseSchema;
          }

          if (parsed && Array.isArray(parsed.lobbies) && Array.isArray(parsed.personas)) {
            if (!Array.isArray(parsed.ratings)) parsed.ratings = INITIAL_SEED_DATA.ratings || [];
            if (!Array.isArray(parsed.notifications)) parsed.notifications = INITIAL_SEED_DATA.notifications || [];
            if (!Array.isArray(parsed.messages)) parsed.messages = INITIAL_SEED_DATA.messages || [];
            return parsed;
          }
        }

        // Empty cloud DB: seed it
        const initialSeed = INITIAL_SEED_DATA;
        await writeDb(initialSeed);
        return initialSeed;
      }
    } catch (err) {
      console.warn('[Cloud DB] Read failed, falling back to local atomic storage:', err);
    }
  }

  return readLocalDb();
}

export async function writeDb(data: DatabaseSchema): Promise<void> {
  const activeTxDb = txStorage.getStore();
  if (!activeTxDb) {
    // 1. Thread-safe atomic file write
    await enqueueWrite(async () => {
      resolveDbPaths();
      await atomicWriteLocalFile(activeDbPath, data);
    });
  } else {
    // Already in transaction holding the write mutex
    resolveDbPaths();
    await atomicWriteLocalFile(activeDbPath, data);
  }

  // 2. Cloud mirror via Upstash Redis REST
  const cloud = getCloudConfig();
  if (cloud) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const payload = JSON.stringify(data);
      const res = await fetch(`${cloud.url}/`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cloud.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(['SET', REDIS_KEY, payload]),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        await fetch(`${cloud.url}/set/${REDIS_KEY}`, {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${cloud.token}`,
            'Content-Type': 'application/json',
          },
          body: payload,
        });
      }
    } catch (err) {
      console.warn('[Cloud DB] Write failed:', err);
    }
  }
}

export async function resetDb(): Promise<DatabaseSchema> {
  const seedClone = JSON.parse(JSON.stringify(INITIAL_SEED_DATA)) as DatabaseSchema;
  await writeDb(seedClone);
  return seedClone;
}

export async function withDbMutation<T>(
  mutator: (db: DatabaseSchema) => Promise<T> | T
): Promise<T> {
  const activeTxDb = txStorage.getStore();
  if (activeTxDb) {
    // Re-entrant: reuse active transaction snapshot without nesting locks
    return await mutator(activeTxDb);
  }

  return enqueueWrite(async () => {
    const db = await readDb();
    return txStorage.run(db, async () => {
      const result = await mutator(db);

      let shouldWrite = true;
      if (result && typeof result === 'object' && 'status' in (result as any)) {
        const status = (result as any).status;
        if (typeof status === 'number' && status >= 400) {
          shouldWrite = false;
        }
      }

      if (shouldWrite) {
        resolveDbPaths();
        await atomicWriteLocalFile(activeDbPath, db);

        const cloud = getCloudConfig();
        if (cloud) {
          try {
            const controller = new AbortController();
            const timeoutId = setTimeout(() => controller.abort(), 4000);
            const payload = JSON.stringify(db);
            const res = await fetch(`${cloud.url}/`, {
              method: 'POST',
              headers: {
                Authorization: `Bearer ${cloud.token}`,
                'Content-Type': 'application/json',
              },
              body: JSON.stringify(['SET', REDIS_KEY, payload]),
              signal: controller.signal,
            });
            clearTimeout(timeoutId);

            if (!res.ok) {
              await fetch(`${cloud.url}/set/${REDIS_KEY}`, {
                method: 'POST',
                headers: {
                  Authorization: `Bearer ${cloud.token}`,
                  'Content-Type': 'application/json',
                },
                body: payload,
              });
            }
          } catch (err) {
            console.warn('[Cloud DB] Write failed:', err);
          }
        }
      }

      return result;
    });
  });
}

export { withDbMutation as mutateDb };

// Pluggable repository implementation (IMeetupRepository)
export interface MeetupFilters {
  category?: string;
  status?: string;
  userLat?: number;
  userLng?: number;
  radiusKm?: number;
  hostId?: string;
  participantId?: string;
  search?: string;
}

export interface IMeetupRepository {
  getMeetup(id: string): Promise<Meetup | null>;
  listMeetups(filters?: MeetupFilters): Promise<Meetup[]>;
  createMeetup(data: Omit<Meetup, 'id' | 'createdAt'> & { id?: string; createdAt?: string }): Promise<Meetup>;
  updateMeetup(id: string, updates: Partial<Meetup>): Promise<Meetup | null>;
  deleteMeetup(id: string): Promise<boolean>;
  getUser(id: string): Promise<UserPersona | null>;
  getUserByEmail(email: string): Promise<UserPersona | null>;
  updateUser(id: string, updates: Partial<UserPersona>): Promise<UserPersona | null>;
  getMessages(meetupId: string): Promise<ChatMessage[]>;
  addMessage(
    meetupId: string,
    message: Partial<ChatMessage> & { senderId: string; senderName: string; text: string }
  ): Promise<ChatMessage>;
  reset(): Promise<DatabaseSchema>;
  getRawDb(): Promise<DatabaseSchema>;
}

export const meetupRepository: IMeetupRepository = {
  async getMeetup(id: string): Promise<Meetup | null> {
    const db = await readDb();
    const found = db.lobbies.find((m) => m.id === id);
    return found ? (found as unknown as Meetup) : null;
  },

  async listMeetups(filters?: MeetupFilters): Promise<Meetup[]> {
    const db = await readDb();
    let results = [...db.lobbies] as unknown as Meetup[];

    if (filters?.category) {
      results = results.filter(
        (m) => m.category.toLowerCase() === filters.category!.toLowerCase()
      );
    }

    if (filters?.status) {
      results = results.filter(
        (m) => (m.roomStatus || 'LIVE').toUpperCase() === filters.status!.toUpperCase()
      );
    }

    if (filters?.hostId) {
      results = results.filter((m) => m.hostId === filters.hostId);
    }

    if (filters?.participantId) {
      results = results.filter((m) =>
        m.participants.some((p) => p.id === filters.participantId)
      );
    }

    if (filters?.search) {
      const q = filters.search.toLowerCase();
      results = results.filter(
        (m) =>
          m.title.toLowerCase().includes(q) ||
          m.venueName.toLowerCase().includes(q) ||
          m.category.toLowerCase().includes(q)
      );
    }

    return results;
  },

  async createMeetup(
    data: Omit<Meetup, 'id' | 'createdAt'> & { id?: string; createdAt?: string }
  ): Promise<Meetup> {
    const db = await readDb();
    const id = data.id || `lobby-${Date.now()}`;
    const createdAt = data.createdAt || new Date().toISOString();

    const newMeetup: Meetup = {
      ...data,
      id,
      mapPinLabel: data.mapPinLabel || getMapPinLabelForCategory(data.category),
      coverImage: data.coverImage || getDefaultCoverForCategory(data.category),
      roomStatus: data.roomStatus || 'LIVE',
      participants: data.participants || [],
      pendingRequests: data.pendingRequests || [],
      bannedUserIds: data.bannedUserIds || [],
      createdAt,
    };

    db.lobbies.unshift(newMeetup as any);
    await writeDb(db);
    return newMeetup;
  },

  async updateMeetup(id: string, updates: Partial<Meetup>): Promise<Meetup | null> {
    const db = await readDb();
    const index = db.lobbies.findIndex((m) => m.id === id);
    if (index === -1) return null;

    db.lobbies[index] = {
      ...db.lobbies[index],
      ...(updates as any),
      updatedAt: new Date().toISOString(),
    };

    await writeDb(db);
    return db.lobbies[index] as unknown as Meetup;
  },

  async deleteMeetup(id: string): Promise<boolean> {
    const db = await readDb();
    const index = db.lobbies.findIndex((m) => m.id === id);
    if (index === -1) return false;

    db.lobbies.splice(index, 1);
    db.messages = db.messages.filter((msg) => msg.lobbyId !== id);
    await writeDb(db);
    return true;
  },

  async getUser(id: string): Promise<UserPersona | null> {
    const db = await readDb();
    return db.personas.find((p) => p.id === id) || null;
  },

  async getUserByEmail(email: string): Promise<UserPersona | null> {
    const db = await readDb();
    const clean = email.toLowerCase().trim();
    return db.personas.find((p) => p.email?.toLowerCase().trim() === clean) || null;
  },

  async updateUser(id: string, updates: Partial<UserPersona>): Promise<UserPersona | null> {
    const db = await readDb();
    const index = db.personas.findIndex((p) => p.id === id);
    if (index === -1) return null;

    db.personas[index] = {
      ...db.personas[index],
      ...updates,
    };

    // Keep participant snapshots in active meetups synchronized
    db.lobbies.forEach((lobby) => {
      lobby.participants.forEach((part) => {
        if (part.id === id) {
          if (updates.name) part.name = updates.name;
          if (updates.avatar) part.avatar = updates.avatar;
          if (updates.age) part.age = updates.age;
          if (updates.skillBadge) part.skillBadge = updates.skillBadge;
          if (updates.tagline) part.tagline = updates.tagline;
        }
      });
    });

    await writeDb(db);
    return db.personas[index];
  },

  async getMessages(meetupId: string): Promise<ChatMessage[]> {
    const db = await readDb();
    return db.messages.filter((msg) => msg.lobbyId === meetupId);
  },

  async addMessage(
    meetupId: string,
    message: Partial<ChatMessage> & { senderId: string; senderName: string; text: string }
  ): Promise<ChatMessage> {
    const db = await readDb();
    const newMessage: ChatMessage = {
      id: message.id || `msg-${Date.now()}`,
      lobbyId: meetupId,
      senderId: message.senderId,
      senderName: message.senderName,
      senderAvatar: message.senderAvatar || '',
      text: message.text,
      isSystem: Boolean(message.isSystem),
      createdAt: message.createdAt || new Date().toISOString(),
    };

    db.messages.push(newMessage);
    await writeDb(db);
    return newMessage;
  },

  async reset(): Promise<DatabaseSchema> {
    return resetDb();
  },

  async getRawDb(): Promise<DatabaseSchema> {
    return readDb();
  },
};

// Export individual functions for ergonomic import
export const {
  getMeetup,
  listMeetups,
  createMeetup,
  updateMeetup,
  deleteMeetup,
  getUser,
  getUserByEmail,
  updateUser,
  getMessages,
  addMessage,
} = meetupRepository;

export { readLocalDb as readDbSync, writeLocalDb as writeDbSync };
