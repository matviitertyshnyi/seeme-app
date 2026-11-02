import fs from 'fs';
import path from 'path';
import os from 'os';
import { DatabaseSchema } from '@/types/lobby';
import { INITIAL_SEED_DATA } from '@/lib/seed';

const REDIS_KEY = 'seeme:db';

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

// Synchronous local file fallback
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
    if (!Array.isArray(parsed.ratings)) {
      parsed.ratings = INITIAL_SEED_DATA.ratings || [];
    }
    if (!Array.isArray(parsed.notifications)) {
      parsed.notifications = INITIAL_SEED_DATA.notifications || [];
    }
    return parsed;
  } catch {
    const seedClone = JSON.parse(JSON.stringify(INITIAL_SEED_DATA)) as DatabaseSchema;
    try {
      writeLocalDb(seedClone);
    } catch {
      // Ignore write fallback error
    }
    return seedClone;
  }
}

function writeLocalDb(data: DatabaseSchema): void {
  ensureDirExists(activeDbDir);
  try {
    fs.writeFileSync(activeDbPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch {
    const fallbackDir = path.join(os.tmpdir(), 'seeme-data');
    if (!fs.existsSync(fallbackDir)) {
      fs.mkdirSync(fallbackDir, { recursive: true });
    }
    activeDbDir = fallbackDir;
    activeDbPath = path.join(fallbackDir, 'db.json');
    fs.writeFileSync(activeDbPath, JSON.stringify(data, null, 2), 'utf-8');
  }
}

/**
 * Reads from Cloud Database (Upstash Redis / Vercel KV) if environment variables are set.
 * Otherwise seamlessly falls back to local/tmp JSON storage.
 */
export async function readDb(): Promise<DatabaseSchema> {
  const cloud = getCloudConfig();
  if (cloud) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

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

        // If cloud key is empty or null, seed the cloud database!
        const initialSeed = INITIAL_SEED_DATA;
        await writeDb(initialSeed);
        return initialSeed;
      }
    } catch (err) {
      console.warn('[Cloud DB] Read failed, falling back to local storage:', err);
    }
  }

  return readLocalDb();
}

/**
 * Writes to Cloud Database (Upstash Redis / Vercel KV) if environment variables are set.
 * Also mirrors to local file storage for reliability.
 */
export async function writeDb(data: DatabaseSchema): Promise<void> {
  // Always update local storage first
  writeLocalDb(data);

  const cloud = getCloudConfig();
  if (cloud) {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4500);

      const payload = JSON.stringify(data);
      const res = await fetch(`${cloud.url}/set/${REDIS_KEY}`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${cloud.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify([payload]),
        signal: controller.signal,
      });
      clearTimeout(timeoutId);

      if (!res.ok) {
        // Retry with standard string payload if array format was not expected
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

// Export sync fallbacks for any non-async helpers
export { readLocalDb as readDbSync, writeLocalDb as writeDbSync };
