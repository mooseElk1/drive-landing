import { Directory, File, Paths } from 'expo-file-system';

import { WorkoutClass } from '@/types/workout';
import {
  calculateDuration,
  calculateWorkoutMetrics,
  createWorkoutEntry,
  WorkoutType,
} from '@/types/workout-database';
import {
  type WorkoutEntry,
  type WorkoutTrackingDatabase,
} from '@/types/workout-database';

// Constants
const FILESYSTEM_ROOT = Paths.document || Paths.cache || '';
const DATA_DIRECTORY = new Directory(FILESYSTEM_ROOT, 'data');
const FILE_DB = new File(DATA_DIRECTORY, 'file-db.json');
const DIRECTORY_PATH = DATA_DIRECTORY.uri;
const FILE_DB_PATH = FILE_DB.uri;

function createWorkoutDataFilePath(): string {
  const suffix = `${Date.now()}_${Math.random().toString(36).slice(2, 10)}`;
  return `${DIRECTORY_PATH}/workout_${suffix}.json`;
}

// Simple async mutex to serialize DB operations and avoid races
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

// Atomic write helper (write to temp then move)
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

  // Replace by move from temp to target.
  if (targetFile.exists) {
    targetFile.delete();
  }
  tmpFile.move(targetFile);
}

// Safe JSON read that backs up corrupted files
async function safeReadJson(path: string): Promise<unknown | null> {
  try {
    const fileContent = await new File(path).text();
    return JSON.parse(fileContent);
  } catch (err) {
    try {
      const backupPath = `${path}.corrupt.${Date.now()}`;
      // try to move the bad file out of the way
      const sourceFile = new File(path);
      if (sourceFile.exists) {
        sourceFile.move(new File(backupPath));
      }
      console.error(`Workout DB corrupted — backed up to ${backupPath}`, err);
    } catch (e) {
      console.error('Failed to backup corrupted workout DB', e);
    }
    return null;
  }
}

// Serializable shapes used on-disk (dates are ISO strings)
type SerializableWorkoutEntry = Omit<
  WorkoutEntry,
  'date' | 'createdAt' | 'updatedAt'
> & {
  date: string;
  createdAt: string;
  updatedAt: string;
};

type SerializableWorkoutTrackingDatabase = {
  workouts: Record<string, SerializableWorkoutEntry>;
  metadata: {
    version: string;
    createdAt: string;
    lastUpdated: string;
    totalWorkouts: number;
  };
};

function isObject(o: unknown): o is Record<string, unknown> {
  return typeof o === 'object' && o !== null;
}

function isSerializableWorkoutEntry(o: unknown): o is SerializableWorkoutEntry {
  if (!isObject(o)) return false;
  return (
    typeof o.id === 'string' &&
    typeof o.name === 'string' &&
    typeof o.date === 'string' &&
    typeof o.duration === 'number' &&
    typeof o.type === 'string' &&
    typeof o.filePath === 'string' &&
    typeof o.createdAt === 'string' &&
    typeof o.updatedAt === 'string'
  );
}

function isSerializableWorkoutDatabase(
  o: unknown
): o is SerializableWorkoutTrackingDatabase {
  if (!isObject(o)) return false;
  const meta = o.metadata;
  const workouts = o.workouts;
  if (!isObject(meta) || typeof meta.version !== 'string') return false;
  if (
    typeof meta.createdAt !== 'string' ||
    typeof meta.lastUpdated !== 'string'
  )
    return false;
  if (typeof meta.totalWorkouts !== 'number') return false;
  if (!isObject(workouts)) return false;
  // shallow check of entries
  return Object.values(workouts).every((v) => isSerializableWorkoutEntry(v));
}

/**
 * Unified workout persistence service
 * Replaces the legacy file-writer.ts and consolidates persistence logic
 */

/**
 * Initialize the workout database directory and file
 */
/**
 * Create the canonical serializable empty DB object (dates as ISO strings).
 * Exported so tests can rely on the same shape the initializer uses.
 */
export function createEmptyDatabaseSerializable(): SerializableWorkoutTrackingDatabase {
  return {
    workouts: {},
    metadata: {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      totalWorkouts: 0,
    },
  };
}

export const initializeWorkoutDatabase = async (): Promise<void> => {
  if (!FILESYSTEM_ROOT) {
    throw new Error(
      'No writable filesystem root available for workout persistence'
    );
  }

  // Initialize directories/files without acquiring the db mutex to avoid deadlocks.
  if (!DATA_DIRECTORY.exists) {
    DATA_DIRECTORY.create({
      intermediates: true,
      overwrite: true,
    });
  }

  if (!FILE_DB.exists) {
    const serializable = createEmptyDatabaseSerializable();
    await atomicWrite(FILE_DB_PATH, JSON.stringify(serializable, null, 0));
  }
};

/**
 * Read the workout tracking database
 */
export const readWorkoutDatabase =
  async (): Promise<WorkoutTrackingDatabase> => {
    return dbMutex.run(async () => {
      await initializeWorkoutDatabase();

      const parsed = await safeReadJson(FILE_DB_PATH);
      if (!parsed || !isSerializableWorkoutDatabase(parsed)) {
        // corrupted or unreadable file — return a fresh DB
        return {
          workouts: {},
          metadata: {
            version: '1.0.0',
            createdAt: new Date(),
            lastUpdated: new Date(),
            totalWorkouts: 0,
          },
        };
      }

      // Convert date strings back to Date objects safely
      const serial = parsed as SerializableWorkoutTrackingDatabase;
      const db: WorkoutTrackingDatabase = {
        workouts: Object.fromEntries(
          Object.entries(serial.workouts || {}).map(
            ([id, workout]: [string, SerializableWorkoutEntry]) => [
              id,
              {
                ...workout,
                date: new Date(workout.date),
                createdAt: new Date(workout.createdAt),
                updatedAt: new Date(workout.updatedAt),
              },
            ]
          )
        ),
        metadata: {
          version: serial.metadata.version,
          createdAt: new Date(serial.metadata.createdAt || Date.now()),
          lastUpdated: new Date(serial.metadata.lastUpdated || Date.now()),
          totalWorkouts: serial.metadata.totalWorkouts,
        },
      };

      return db;
    });
  };

/**
 * Write the workout tracking database
 */
export const writeWorkoutDatabase = async (
  db: WorkoutTrackingDatabase
): Promise<WorkoutTrackingDatabase> => {
  // Serialize Dates to ISO strings for stable on-disk representation
  const serializable = {
    ...db,
    metadata: {
      ...db.metadata,
      createdAt:
        db.metadata.createdAt instanceof Date
          ? db.metadata.createdAt.toISOString()
          : db.metadata.createdAt,
      lastUpdated:
        db.metadata.lastUpdated instanceof Date
          ? db.metadata.lastUpdated.toISOString()
          : db.metadata.lastUpdated,
    },
    workouts: Object.fromEntries(
      Object.entries(db.workouts).map(([id, w]: [string, WorkoutEntry]) => [
        id,
        {
          ...w,
          date: w.date instanceof Date ? w.date.toISOString() : w.date,
          createdAt:
            w.createdAt instanceof Date
              ? w.createdAt.toISOString()
              : w.createdAt,
          updatedAt:
            w.updatedAt instanceof Date
              ? w.updatedAt.toISOString()
              : w.updatedAt,
        } as SerializableWorkoutEntry,
      ])
    ),
  };

  await dbMutex.run(async () => {
    await atomicWrite(FILE_DB_PATH, JSON.stringify(serializable, null, 0));
  });
  return db;
};

/**
 * Save a workout to the file system and database
 */
export const persistWorkout = async (
  workout: WorkoutClass,
  options?: {
    metricsPatch?: Partial<WorkoutEntry['metrics']>;
  }
): Promise<WorkoutTrackingDatabase> => {
  await initializeWorkoutDatabase();

  const filePath = createWorkoutDataFilePath();
  const duration = calculateDuration(workout.data);
  const baseMetrics = calculateWorkoutMetrics(workout.data);
  const metrics = { ...baseMetrics, ...(options?.metricsPatch ?? {}) };

  const entry = createWorkoutEntry({
    id: workout.id,
    name: workout.name,
    type: WorkoutType.GENERAL,
    filePath,
    duration,
    metrics,
  });

  // Write the workout data file (use explicit toJSON if available so we store
  // a stable, minimal representation) — use atomic write
  // Prefer calling a well-typed toJSON if available on the instance
  const maybeToJSON = workout as unknown as { toJSON?: () => unknown };
  let payload: unknown | WorkoutClass = workout;
  if (typeof maybeToJSON.toJSON === 'function') {
    payload = maybeToJSON.toJSON();
  }
  const fileContent = JSON.stringify(payload, null, 0);
  await atomicWrite(filePath, fileContent);

  // Update the database
  const db = await readWorkoutDatabase();
  db.workouts[entry.id] = entry;
  db.metadata.totalWorkouts = Object.keys(db.workouts).length;
  db.metadata.lastUpdated = new Date();

  return await writeWorkoutDatabase(db);
};

export async function softDeleteWorkout(
  workoutId: string,
  deletedReason: 'user' | 'system' = 'user'
): Promise<WorkoutTrackingDatabase> {
  const db = await readWorkoutDatabase();
  const entry = db.workouts[workoutId];
  if (!entry) return db;

  db.workouts[workoutId] = {
    ...entry,
    deletedAt: new Date().toISOString(),
    deletedReason,
    updatedAt: new Date(),
  };
  db.metadata.totalWorkouts = Object.keys(db.workouts).length;
  db.metadata.lastUpdated = new Date();
  return await writeWorkoutDatabase(db);
}

export async function getWorkoutEntries(params?: {
  includeDeleted?: boolean;
}): Promise<WorkoutEntry[]> {
  const db = await readWorkoutDatabase();
  const includeDeleted = params?.includeDeleted ?? false;
  return Object.values(db.workouts).filter((w) =>
    includeDeleted ? true : !w.deletedAt
  );
}

/** Batch-resolve workouts by id (e.g. session sprintIds). Skips missing or soft-deleted entries. */
export async function getWorkoutEntriesByIds(
  ids: string[]
): Promise<WorkoutEntry[]> {
  const db = await readWorkoutDatabase();
  const out: WorkoutEntry[] = [];
  for (const id of ids) {
    const entry = db.workouts[id];
    if (!entry || entry.deletedAt) continue;
    out.push(entry);
  }
  return out;
}

/**
 * Delete a workout from the file system and database
 */
export const deleteWorkout = async (
  entry: WorkoutEntry
): Promise<WorkoutTrackingDatabase> => {
  const db = await readWorkoutDatabase();

  // Remove from database
  delete db.workouts[entry.id];
  db.metadata.totalWorkouts = Object.keys(db.workouts).length;
  db.metadata.lastUpdated = new Date();

  // Delete the file (ignore errors if file doesn't exist)
  try {
    const workoutFile = new File(entry.filePath);
    if (workoutFile.exists) {
      workoutFile.delete();
    }
  } catch {
    // Silently ignore file deletion errors
  }

  return await writeWorkoutDatabase(db);
};

/**
 * Load a workout from the file system
 */
export const loadWorkout = async (
  entry: WorkoutEntry
): Promise<WorkoutClass | null> => {
  try {
    const workoutFile = new File(entry.filePath);
    if (!workoutFile.exists) {
      throw new Error(`Workout file not found: ${entry.filePath}`);
    }

    const fileContent = await workoutFile.text();
    const workoutData = JSON.parse(fileContent);

    // Reconstruct the WorkoutClass instance using the canonical deserializer
    const wc = WorkoutClass as unknown as {
      fromJSON?: (obj: unknown) => WorkoutClass;
    };
    if (typeof wc.fromJSON === 'function') {
      return wc.fromJSON(workoutData);
    }

    // Fallback for older format
    return new WorkoutClass({
      name: workoutData.name || entry.name,
      date: new Date(workoutData.date || entry.date),
      data: workoutData.data || { channels: {} },
    });
  } catch (_error) {
    console.error('Failed to load workout:', _error);
    return null;
  }
};
