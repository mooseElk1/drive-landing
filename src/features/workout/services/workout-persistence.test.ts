import * as FileSystem from 'expo-file-system';

import {
  atomicWrite,
  createEmptyDatabaseSerializable,
  getWorkoutEntriesByIds,
  initializeWorkoutDatabase,
  loadWorkout,
  persistWorkout,
  readWorkoutDatabase,
} from '@/features/workout/services/workout-persistence';
import { ProcessedSensorData } from '@/types/processed-sensor-data';
import { WorkoutClass } from '@/types/workout';
import type { WorkoutEntry } from '@/types/workout-database';
import { WorkoutType } from '@/types/workout-database';
jest.setTimeout(20000);

jest.mock('expo-file-system', () => {
  const mockFiles = new Map<string, string>();
  const mockDirs = new Set<string>(['/mock/doc', '/mock/cache']);
  const mockSpies = {
    createDirectory: jest.fn(),
    createFile: jest.fn(),
    write: jest.fn(),
    text: jest.fn(),
    move: jest.fn(),
    delete: jest.fn(),
  };

  function mockNormalizePath(input: string): string {
    const normalized = input.replace(/\/+/g, '/').replace(/\/$/, '');
    return normalized || '/';
  }

  function mockToPathPart(part: unknown): string {
    if (typeof part === 'string') {
      return mockNormalizePath(part);
    }

    if (
      typeof part === 'object' &&
      part !== null &&
      'uri' in part &&
      typeof (part as { uri: unknown }).uri === 'string'
    ) {
      return mockNormalizePath((part as { uri: string }).uri);
    }

    throw new Error(`Unsupported path part: ${String(part)}`);
  }

  function mockJoinPathParts(parts: unknown[]): string {
    const joined = parts.map(mockToPathPart).join('/');
    return mockNormalizePath(joined);
  }

  class Directory {
    uri: string;

    constructor(...parts: unknown[]) {
      this.uri = mockJoinPathParts(parts);
    }

    get exists(): boolean {
      return mockDirs.has(this.uri);
    }

    create(options?: unknown): void {
      mockDirs.add(this.uri);
      mockSpies.createDirectory(this.uri, options);
    }
  }

  class File {
    uri: string;

    constructor(...parts: unknown[]) {
      this.uri = mockJoinPathParts(parts);
    }

    get exists(): boolean {
      return mockFiles.has(this.uri);
    }

    get size(): number {
      return (mockFiles.get(this.uri) || '').length;
    }

    get parentDirectory(): Directory {
      const idx = this.uri.lastIndexOf('/');
      const parent = idx > 0 ? this.uri.slice(0, idx) : '/';
      return new Directory(parent);
    }

    create(options?: unknown): void {
      mockDirs.add(this.parentDirectory.uri);
      if (!mockFiles.has(this.uri)) {
        mockFiles.set(this.uri, '');
      }
      mockSpies.createFile(this.uri, options);
    }

    write(content: string): void {
      mockFiles.set(this.uri, content);
      mockSpies.write(this.uri, content);
    }

    async text(): Promise<string> {
      mockSpies.text(this.uri);
      const content = mockFiles.get(this.uri);
      if (content === undefined) {
        throw new Error(`ENOENT: ${this.uri}`);
      }
      return content;
    }

    move(destination: unknown): void {
      const destinationUri = mockToPathPart(destination);
      const content = mockFiles.get(this.uri);
      if (content === undefined) {
        throw new Error(`ENOENT: ${this.uri}`);
      }

      const idx = destinationUri.lastIndexOf('/');
      const parent = idx > 0 ? destinationUri.slice(0, idx) : '/';
      mockDirs.add(parent);
      mockFiles.set(destinationUri, content);
      mockFiles.delete(this.uri);
      mockSpies.move(this.uri, destinationUri);
      this.uri = destinationUri;
    }

    delete(): void {
      mockFiles.delete(this.uri);
      mockSpies.delete(this.uri);
    }
  }

  return {
    Directory,
    File,
    Paths: {
      document: '/mock/doc',
      cache: '/mock/cache',
    },
    __mock: {
      files: mockFiles,
      dirs: mockDirs,
      spies: mockSpies,
      reset: () => {
        mockFiles.clear();
        mockDirs.clear();
        mockDirs.add('/mock/doc');
        mockDirs.add('/mock/cache');
        Object.values(mockSpies).forEach((spy) => spy.mockClear());
      },
    },
  };
});

type MockedExpoFs = {
  __mock: {
    files: Map<string, string>;
    dirs: Set<string>;
    spies: {
      createDirectory: jest.Mock;
      createFile: jest.Mock;
      write: jest.Mock;
      text: jest.Mock;
      move: jest.Mock;
      delete: jest.Mock;
    };
    reset: () => void;
  };
};

const mockedFs = FileSystem as unknown as MockedExpoFs;

beforeEach(() => {
  mockedFs.__mock.reset();
});

test('readWorkoutDatabase creates empty db when none exists', async () => {
  const dirPath = '/mock/doc/data';
  const filePath = `${dirPath}/file-db.json`;

  const db = await readWorkoutDatabase();

  expect(mockedFs.__mock.spies.createDirectory).toHaveBeenCalledWith(dirPath, {
    intermediates: true,
    overwrite: true,
  });
  const persisted = mockedFs.__mock.files.get(filePath);
  expect(persisted).toBeDefined();
  const parsedWritten = JSON.parse(persisted || '{}');
  expect(parsedWritten.workouts).toEqual({});
  expect(parsedWritten.metadata.totalWorkouts).toBe(0);
  expect(db.metadata).toBeDefined();
  expect(db.metadata.createdAt instanceof Date).toBe(true);
  expect(db.workouts).toEqual({});
});

test('readWorkoutDatabase parses dates and workouts', async () => {
  const id = 'w1';
  const fileContent = {
    workouts: {
      [id]: {
        id,
        name: 'Test Workout',
        date: new Date().toISOString(),
        duration: 1,
        type: WorkoutType.GENERAL,
        filePath: '/mock/doc/data/w1.json',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    },
    metadata: {
      version: '1.0.0',
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      totalWorkouts: 1,
    },
  };

  mockedFs.__mock.dirs.add('/mock/doc/data');
  mockedFs.__mock.files.set(
    '/mock/doc/data/file-db.json',
    JSON.stringify(fileContent)
  );

  const db = await readWorkoutDatabase();

  expect(db.workouts[id]).toBeDefined();
  expect(db.workouts[id]!.date instanceof Date).toBe(true);
  expect(db.workouts[id]!.createdAt instanceof Date).toBe(true);
  expect(db.metadata.createdAt instanceof Date).toBe(true);
});

test('atomicWrite uses temp file and move', async () => {
  const targetPath = '/mock/doc/data/tmpfile';
  const content = 'hello';

  await atomicWrite(targetPath, content);

  expect(mockedFs.__mock.spies.write).toHaveBeenCalledWith(
    `${targetPath}.tmp`,
    content
  );
  expect(mockedFs.__mock.spies.move).toHaveBeenCalledWith(
    `${targetPath}.tmp`,
    targetPath
  );
});

test('initializeWorkoutDatabase creates directory and DB file on fresh install', async () => {
  const dirPath = '/mock/doc/data';
  const filePath = `${dirPath}/file-db.json`;

  await initializeWorkoutDatabase();

  expect(mockedFs.__mock.spies.createDirectory).toHaveBeenCalledWith(dirPath, {
    intermediates: true,
    overwrite: true,
  });
  expect(mockedFs.__mock.files.has(filePath)).toBe(true);
});

test('persistWorkout writes workout file and updates DB', async () => {
  const filePath = '/mock/doc/data/file-db.json';

  // Prepare an existing DB (empty)
  const initialDb = createEmptyDatabaseSerializable();
  mockedFs.__mock.dirs.add('/mock/doc/data');
  mockedFs.__mock.files.set(filePath, JSON.stringify(initialDb));

  const psd = new ProcessedSensorData({
    channels: { timestamp: [1000], velocity_magnitude: [3] },
  });
  const workout = new WorkoutClass({
    name: 'Test',
    date: new Date(),
    data: psd,
    sprintAnalysis: {
      summary: {
        startedAt: 1000,
        endedAt: 1100,
        durationMs: 100,
        distanceM: 1,
        driveCount: 1,
        peakVelocity: null,
        peakPower: null,
      },
      driveEvents: [],
    },
  });

  const resultDb = await persistWorkout(workout);

  expect(mockedFs.__mock.spies.write).toHaveBeenCalled();
  expect(mockedFs.__mock.spies.move).toHaveBeenCalled();
  const workoutWrite = mockedFs.__mock.spies.write.mock.calls.find(
    ([path]) => typeof path === 'string' && path.includes('/workout_')
  );
  expect(workoutWrite).toBeDefined();
  const persistedWorkout = JSON.parse((workoutWrite?.[1] as string) || '{}');
  expect(persistedWorkout.sprintAnalysis?.summary?.driveCount).toBe(1);
  // Result DB should include one workout
  expect(resultDb.metadata.totalWorkouts).toBe(1);
});

test('getWorkoutEntriesByIds returns entries in request order and skips missing or deleted', async () => {
  const t = new Date().toISOString();
  const entry = (id: string, extra?: Record<string, unknown>) => ({
    id,
    name: id,
    date: t,
    duration: 1,
    type: WorkoutType.GENERAL,
    filePath: `/mock/doc/data/${id}.json`,
    createdAt: t,
    updatedAt: t,
    ...extra,
  });

  const fileContent = {
    workouts: {
      b: entry('b'),
      a: entry('a'),
      deleted: entry('deleted', { deletedAt: t }),
    },
    metadata: {
      version: '1.0.0',
      createdAt: t,
      lastUpdated: t,
      totalWorkouts: 3,
    },
  };

  mockedFs.__mock.dirs.add('/mock/doc/data');
  mockedFs.__mock.files.set(
    '/mock/doc/data/file-db.json',
    JSON.stringify(fileContent)
  );

  const rows = await getWorkoutEntriesByIds([
    'a',
    'no_such_id',
    'b',
    'deleted',
    'a',
  ]);

  expect(rows.map((w) => w.id)).toEqual(['a', 'b', 'a']);
  expect(rows[0]!.date instanceof Date).toBe(true);
});

test('getWorkoutEntriesByIds returns empty array for empty id list', async () => {
  const fileContent = createEmptyDatabaseSerializable();
  mockedFs.__mock.dirs.add('/mock/doc/data');
  mockedFs.__mock.files.set(
    '/mock/doc/data/file-db.json',
    JSON.stringify(fileContent)
  );

  await expect(getWorkoutEntriesByIds([])).resolves.toEqual([]);
});

test('loadWorkout reconstructs WorkoutClass from stored JSON', async () => {
  const entry: WorkoutEntry = {
    id: 'w1',
    name: 'Test Workout',
    date: new Date(),
    duration: 1,
    type: WorkoutType.GENERAL,
    filePath: '/mock/doc/data/w1.json',
    createdAt: new Date(),
    updatedAt: new Date(),
  };

  const workoutPayload = {
    id: 'w1',
    name: 'Test Workout',
    date: new Date().toISOString(),
    sprintAnalysis: {
      summary: {
        startedAt: 1000,
        endedAt: 1100,
        durationMs: 100,
        distanceM: 1,
        driveCount: 1,
        peakVelocity: null,
        peakPower: null,
      },
      driveEvents: [],
    },
    data: { channels: { timestamp: [1000], velocity_magnitude: [2] } },
  };
  mockedFs.__mock.files.set(entry.filePath, JSON.stringify(workoutPayload));

  const loaded = await loadWorkout(entry);

  expect(loaded).not.toBeNull();
  if (loaded) {
    expect(loaded).toBeInstanceOf(WorkoutClass);
    expect(loaded.name).toBe('Test Workout');
    expect(loaded.date instanceof Date).toBe(true);
    expect(loaded.data.getChannelData('timestamp')).toEqual([1000]);
    expect(loaded.sprintAnalysis?.summary.driveCount).toBe(1);
  }
});
