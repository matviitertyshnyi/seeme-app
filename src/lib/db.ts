import fs from 'fs';
import path from 'path';
import os from 'os';
import { DatabaseSchema } from '@/types/lobby';
import { INITIAL_SEED_DATA } from '@/lib/seed';

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
    // If local dir is read-only, switch active path to os.tmpdir
    const fallbackDir = path.join(os.tmpdir(), 'seeme-data');
    if (!fs.existsSync(fallbackDir)) {
      fs.mkdirSync(fallbackDir, { recursive: true });
    }
    activeDbDir = fallbackDir;
    activeDbPath = path.join(fallbackDir, 'db.json');
  }
}

export function readDb(): DatabaseSchema {
  resolveDbPaths();
  ensureDirExists(activeDbDir);

  try {
    if (!fs.existsSync(activeDbPath)) {
      // If we are in /tmp, check if source data/db.json exists in repo to clone it
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
      writeDb(initialSeed);
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
    parsed.personas = parsed.personas.map((p) => ({
      reliabilityScore: 98,
      meetupsAttended: 10,
      hoursPlayed: 18,
      ratingAvg: 4.9,
      ratingCount: 8,
      streakWeeks: 3,
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
      ...p,
    }));
    return parsed;
  } catch {
    const seedClone = JSON.parse(JSON.stringify(INITIAL_SEED_DATA)) as DatabaseSchema;
    try {
      writeDb(seedClone);
    } catch {
      // Ignore write fallback error
    }
    return seedClone;
  }
}

export function writeDb(data: DatabaseSchema): void {
  ensureDirExists(activeDbDir);
  try {
    fs.writeFileSync(activeDbPath, JSON.stringify(data, null, 2), 'utf-8');
  } catch (err) {
    // If writing to project dir failed due to read-only filesystem (common in serverless)
    const fallbackDir = path.join(os.tmpdir(), 'seeme-data');
    if (!fs.existsSync(fallbackDir)) {
      fs.mkdirSync(fallbackDir, { recursive: true });
    }
    activeDbDir = fallbackDir;
    activeDbPath = path.join(fallbackDir, 'db.json');
    fs.writeFileSync(activeDbPath, JSON.stringify(data, null, 2), 'utf-8');
  }
}

export function resetDb(): DatabaseSchema {
  const seedClone = JSON.parse(JSON.stringify(INITIAL_SEED_DATA)) as DatabaseSchema;
  writeDb(seedClone);
  return seedClone;
}
