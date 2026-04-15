// Type augmentation for expo-file-system.
// The 'next' API classes (Directory, File, Paths) are part of the package at
// expo-file-system/next but are not re-exported from the main entry point.
// Declaring them here allows `import { Directory, File, Paths } from 'expo-file-system'`
// to type-check without pulling in the package's TypeScript source files.
declare module 'expo-file-system' {
  export type CreateOptions = {
    intermediates?: boolean;
    overwrite?: boolean;
  };

  export declare class Directory {
    constructor(...uris: (string | File | Directory)[]);
    readonly uri: string;
    validatePath(): void;
    delete(): void;
    exists: boolean;
    create(options?: CreateOptions): void;
    copy(destination: Directory | File): void;
    move(destination: Directory | File): void;
    listAsRecords(): { isDirectory: string; uri: string }[];
    list(): (Directory | File)[];
    readonly parentDirectory: Directory;
  }

  export declare class File {
    constructor(...uris: (string | File | Directory)[]);
    readonly uri: string;
    readonly parentDirectory: Directory;
    validatePath(): void;
    delete(): void;
    exists: boolean;
    create(options?: CreateOptions): void;
    copy(destination: Directory | File): void;
    move(destination: Directory | File): void;
    text(): Promise<string>;
    write(content: string | Uint8Array): void;
    readonly size: number | undefined;
  }

  export declare class Paths {
    static get document(): Directory;
    static get cache(): Directory;
  }
}
