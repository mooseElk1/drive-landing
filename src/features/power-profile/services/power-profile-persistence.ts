import { Directory, File, Paths } from 'expo-file-system';

import type { AthleteProfile } from '../types/athlete-profile';
import type { PowerProfileSession } from '../types/power-session';

const FILESYSTEM_ROOT = Paths.document || Paths.cache || '';
const DATA_DIRECTORY = new Directory(FILESYSTEM_ROOT, 'data');

const POWER_PROFILE_DB_FILE = new File(DATA_DIRECTORY, 'power-profile-db.json');
const SESSIONS_DB_FILE = new File(DATA_DIRECTORY, 'sessions-db.json');

const POWER_PROFILE_DB_PATH = POWER_PROFILE_DB_FILE.uri;
const SESSIONS_DB_PATH = SESSIONS_DB_FILE.uri;

class Mutex {
  private locked = false;
  private waiters: (() => void)[] = [];

  async lock(): Promise<void> {
    if (this.locked) {
      await new Promise<void>((res) => this.waiters.push(res));
      return;
    }
    this.locked = true;
  }

  unlock(): void {
    if (!this.locked) return;
    this.locked = false;
    const next = this.waiters.shift();
    if (next) next();
  }

  async run<T>(fn: () => Promise<T>): Promise<T> {
    await this.lock();
    try {
      return await fn();
    } finally {
      this.unlock();
    }
  }
}

const dbMutex = new Mutex();

export async function atomicWrite(
  path: string,
  content: string
): Promise<void> {
  const tmp = `${path}.tmp`;
  const targetFile = new File(path);
  const tmpFile = new File(tmp);

  if (!tmpFile.parentDirectory.exists) {
    tmpFile.parentDirectory.create({ intermediates: true, overwrite: true });
  }
  if (!tmpFile.exists) {
    tmpFile.create({ intermediates: true });
  }
  tmpFile.write(content);

  if (targetFile.exists) {
    targetFile.delete();
  }
  tmpFile.move(targetFile);
}

async function safeReadJson(path: string): Promise<unknown | null> {
  try {
    const fileContent = await new File(path).text();
    return JSON.parse(fileContent);
  } catch {
    return null;
  }
}

type SerializablePowerProfileDb = {
  athletes: Record<string, AthleteProfile>;
  metadata: { version: string; createdAt: string; lastUpdated: string };
};

type SerializableSessionsDb = {
  sessions: Record<string, PowerProfileSession>;
  metadata: { version: string; createdAt: string; lastUpdated: string };
};

export function createEmptyPowerProfileDbSerializable(): SerializablePowerProfileDb {
  const now = new Date().toISOString();
  return {
    athletes: {},
    metadata: { version: '1.0.0', createdAt: now, lastUpdated: now },
  };
}

export function createEmptySessionsDbSerializable(): SerializableSessionsDb {
  const now = new Date().toISOString();
  return {
    sessions: {},
    metadata: { version: '1.0.0', createdAt: now, lastUpdated: now },
  };
}

export async function initializePowerProfileDatabases(): Promise<void> {
  if (!FILESYSTEM_ROOT) {
    throw new Error(
      'No writable filesystem root available for power profile persistence'
    );
  }

  if (!DATA_DIRECTORY.exists) {
    DATA_DIRECTORY.create({ intermediates: true, overwrite: true });
  }

  if (!POWER_PROFILE_DB_FILE.exists) {
    await atomicWrite(
      POWER_PROFILE_DB_PATH,
      JSON.stringify(createEmptyPowerProfileDbSerializable(), null, 0)
    );
  }

  if (!SESSIONS_DB_FILE.exists) {
    await atomicWrite(
      SESSIONS_DB_PATH,
      JSON.stringify(createEmptySessionsDbSerializable(), null, 0)
    );
  }
}

export async function readPowerProfileDb(): Promise<SerializablePowerProfileDb> {
  return dbMutex.run(async () => {
    await initializePowerProfileDatabases();
    const parsed = await safeReadJson(POWER_PROFILE_DB_PATH);
    if (
      parsed &&
      typeof parsed === 'object' &&
      parsed !== null &&
      'athletes' in parsed
    ) {
      return parsed as SerializablePowerProfileDb;
    }
    return createEmptyPowerProfileDbSerializable();
  });
}

export async function writePowerProfileDb(
  db: SerializablePowerProfileDb
): Promise<void> {
  await dbMutex.run(async () => {
    await atomicWrite(POWER_PROFILE_DB_PATH, JSON.stringify(db, null, 0));
  });
}

export async function readSessionsDb(): Promise<SerializableSessionsDb> {
  return dbMutex.run(async () => {
    await initializePowerProfileDatabases();
    const parsed = await safeReadJson(SESSIONS_DB_PATH);
    if (
      parsed &&
      typeof parsed === 'object' &&
      parsed !== null &&
      'sessions' in parsed
    ) {
      return parsed as SerializableSessionsDb;
    }
    return createEmptySessionsDbSerializable();
  });
}

export async function writeSessionsDb(
  db: SerializableSessionsDb
): Promise<void> {
  await dbMutex.run(async () => {
    await atomicWrite(SESSIONS_DB_PATH, JSON.stringify(db, null, 0));
  });
}

export async function saveSession(session: PowerProfileSession): Promise<void> {
  const db = await readSessionsDb();
  const next = {
    ...db,
    sessions: { ...db.sessions, [session.sessionId]: session },
    metadata: { ...db.metadata, lastUpdated: new Date().toISOString() },
  };
  await writeSessionsDb(next);
}

export async function getSessions(
  athleteId: string | null
): Promise<PowerProfileSession[]> {
  const db = await readSessionsDb();
  return Object.values(db.sessions).filter((s) => s.athleteId === athleteId);
}

export async function getSessionsInWindow(
  athleteId: string | null,
  days: number
): Promise<PowerProfileSession[]> {
  const windowMs = days * 24 * 60 * 60 * 1000;
  const cutoff = Date.now() - windowMs;
  const all = await getSessions(athleteId);
  return all.filter((s) => s.startedAt >= cutoff);
}
