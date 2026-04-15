import '@testing-library/react-native/extend-expect';

// react-hook form setup for testing
// @ts-ignore
global.window = {};
// @ts-ignore
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
