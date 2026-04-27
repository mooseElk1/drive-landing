import '@testing-library/react-native/extend-expect';

// FlashList is ESM and breaks Jest in this repo. Mock it globally.
jest.mock('@shopify/flash-list', () => ({
  FlashList: () => null,
}));

// The app logger starts an interval timer at module load time.
// Mock it globally so Jest can exit cleanly.
jest.mock('@/services/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
    flush: jest.fn(),
    dispose: jest.fn(),
  },
  logVelocityFSM: jest.fn(),
  logWorkoutData: jest.fn(),
  logPerformance: jest.fn(),
  logError: jest.fn(),
  cleanupLogger: jest.fn(),
}));

// react-hook form setup for testing
// @ts-ignore - jest env: window is missing by default
global.window = {};
// @ts-ignore - jest env: window should alias global
global.window = global;

// Provide a minimal mock for expo-file-system so that BufferedLogger (which
// accesses Paths.document in its constructor at module-load time) does not
// crash in test environments that have no native file-system bridge.
// Tests that need the full file-system mock (e.g. workout-persistence.test.ts)
// supply their own jest.mock('expo-file-system', factory) which overrides this.
jest.mock('expo-file-system', () => {
  const NOOP = () => {};

  class Directory {
    uri = '/mock';
    exists = false;
    get parentDirectory(): Directory {
      return new Directory();
    }
    create = NOOP;
    delete = NOOP;
    copy = NOOP;
    move = NOOP;
    list = () => [];
    listAsRecords = () => [];
    validatePath = NOOP;
    constructor(..._parts: unknown[]) {}
  }

  class File {
    uri = '/mock/file';
    exists = false;
    size: number | undefined = 0;
    get parentDirectory(): Directory {
      return new Directory();
    }
    create = NOOP;
    delete = NOOP;
    copy = NOOP;
    move = NOOP;
    write = NOOP;
    text = async () => '';
    validatePath = NOOP;
    constructor(..._parts: unknown[]) {}
  }

  class Paths {
    static get document(): Directory {
      return new Directory();
    }
    static get cache(): Directory {
      return new Directory();
    }
  }

  return { Directory, File, Paths };
});
