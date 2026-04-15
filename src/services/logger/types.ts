export enum LogLevel {
  DEBUG = 0,
  INFO = 1,
  WARN = 2,
  ERROR = 3,
  OFF = 4,
}

export interface LogEntry {
  timestamp: number;
  level: LogLevel;
  category: string;
  message: string;
}

export interface LoggerConfig {
  level: LogLevel;
  bufferSize: number;
  flushIntervalMs: number;
  maxFileSize: number;
  maxFiles: number;
  enableConsole: boolean;
  enableFile: boolean;
  filename: string;
}

export interface ILogger {
  debug(message: string, category?: string): void;
  info(message: string, category?: string): void;
  warn(message: string, category?: string): void;
  error(message: string, category?: string): void;
  flush(): Promise<void>;
  dispose(): Promise<void>;
}
