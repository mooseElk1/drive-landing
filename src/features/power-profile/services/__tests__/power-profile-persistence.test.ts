import * as FileSystem from 'expo-file-system';

import {
  initializePowerProfileDatabases,
  readPowerProfileDb,
  readSessionsDb,
} from '@/features/power-profile/services/power-profile-persistence';

jest.setTimeout(20000);

jest.mock('expo-file-system', () => {
  const mockFiles = new Map<string, string>();
  const mockDirs = new Set<string>(['/mock/doc', '/mock/cache']);

  function normalize(input: string): string {
    const normalized = input.replace(/\/+/g, '/').replace(/\/$/, '');
    return normalized || '/';
  }

  function toPathPart(part: unknown): string {
    if (typeof part === 'string') return normalize(part);
    if (
      typeof part === 'object' &&
      part !== null &&
      'uri' in part &&
      typeof (part as { uri: unknown }).uri === 'string'
    ) {
      return normalize((part as { uri: string }).uri);
    }
    throw new Error(`Unsupported path part: ${String(part)}`);
  }

  function join(parts: unknown[]): string {
    return normalize(parts.map(toPathPart).join('/'));
  }

  class Directory {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = join(parts);
    }
    get exists(): boolean {
      return mockDirs.has(this.uri);
    }
    create(): void {
      mockDirs.add(this.uri);
    }
  }

  class File {
    uri: string;
    constructor(...parts: unknown[]) {
      this.uri = join(parts);
    }
    get exists(): boolean {
      return mockFiles.has(this.uri);
    }
    get parentDirectory(): Directory {
      const idx = this.uri.lastIndexOf('/');
      const parent = idx > 0 ? this.uri.slice(0, idx) : '/';
      return new Directory(parent);
    }
    create(): void {
      mockDirs.add(this.parentDirectory.uri);
      if (!mockFiles.has(this.uri)) mockFiles.set(this.uri, '');
    }
    write(content: string): void {
      mockFiles.set(this.uri, content);
    }
    async text(): Promise<string> {
      const content = mockFiles.get(this.uri);
      if (content === undefined) throw new Error(`ENOENT: ${this.uri}`);
      return content;
    }
    move(destination: unknown): void {
      const destinationUri = toPathPart(destination);
      const content = mockFiles.get(this.uri);
      if (content === undefined) throw new Error(`ENOENT: ${this.uri}`);
      mockFiles.set(destinationUri, content);
      mockFiles.delete(this.uri);
      this.uri = destinationUri;
    }
    delete(): void {
      mockFiles.delete(this.uri);
    }
  }

  return {
    Directory,
    File,
    Paths: { document: '/mock/doc', cache: '/mock/cache' },
    __mock: {
      files: mockFiles,
      dirs: mockDirs,
      reset: () => {
        mockFiles.clear();
        mockDirs.clear();
        mockDirs.add('/mock/doc');
        mockDirs.add('/mock/cache');
      },
    },
  };
});

type MockedExpoFs = {
  __mock: { files: Map<string, string>; reset: () => void };
};

const mockedFs = FileSystem as unknown as MockedExpoFs;

beforeEach(() => {
  mockedFs.__mock.reset();
});

test('initializePowerProfileDatabases creates both DB files', async () => {
  await initializePowerProfileDatabases();

  const powerProfilePath = '/mock/doc/data/power-profile-db.json';
  const sessionsPath = '/mock/doc/data/sessions-db.json';

  expect(mockedFs.__mock.files.has(powerProfilePath)).toBe(true);
  expect(mockedFs.__mock.files.has(sessionsPath)).toBe(true);
});

test('readPowerProfileDb returns empty db shape when file missing', async () => {
  const db = await readPowerProfileDb();
  expect(db.athletes).toEqual({});
  expect(db.metadata.version).toBe('1.0.0');
  expect(typeof db.metadata.createdAt).toBe('string');
  expect(typeof db.metadata.lastUpdated).toBe('string');
});

test('readSessionsDb returns empty db shape when file missing', async () => {
  const db = await readSessionsDb();
  expect(db.sessions).toEqual({});
  expect(db.metadata.version).toBe('1.0.0');
  expect(typeof db.metadata.createdAt).toBe('string');
  expect(typeof db.metadata.lastUpdated).toBe('string');
});
