import { Directory, File, Paths } from 'expo-file-system';

import {
  type ILogger,
  type LogEntry,
  type LoggerConfig,
  LogLevel,
} from './types';

export class BufferedLogger implements ILogger {
  private buffer: LogEntry[] = [];
  private flushTimer?: ReturnType<typeof setInterval>;
  private isDisposed = false;
  private logFileUri: string;
  private currentFileSize = 0;

  private readonly config: LoggerConfig = {
    level: LogLevel.INFO,
    bufferSize: 100,
    flushIntervalMs: 5000,
    maxFileSize: 10 * 1024 * 1024, // 10MB
    maxFiles: 5,
    enableConsole: __DEV__,
    enableFile: true,
    filename: 'app.log',
  };

  constructor(config?: Partial<LoggerConfig>) {
    this.config = { ...this.config, ...config };
    this.logFileUri = new File(
      Paths.document,
      'logs',
      this.config.filename
    ).uri;
    this.buffer = [];
    this.initializeLogDirectory();
    this.startFlushTimer();
  }

  private async initializeLogDirectory(): Promise<void> {
    try {
      const logsDir = new Directory(Paths.document, 'logs');
      if (!logsDir.exists) {
        logsDir.create({ intermediates: true, overwrite: true });
      }

      // Get current file size if exists
      const logFile = new File(this.logFileUri);
      if (logFile.exists) {
        this.currentFileSize = logFile.size || 0;
      }
    } catch (error) {
      if (this.config.enableConsole) {
        console.error(
          '[BufferedLogger] Failed to initialize log directory:',
          error
        );
      }
    }
  }

  private startFlushTimer(): void {
    this.flushTimer = setInterval(async () => {
      if (this.buffer.length > 0) {
        await this.flush();
      }
    }, this.config.flushIntervalMs);
  }

  private shouldLog(level: LogLevel): boolean {
    return level >= this.config.level && !this.isDisposed;
  }

  private log(level: LogLevel, message: string, category = 'APP'): void {
    if (!this.shouldLog(level)) return;

    const entry: LogEntry = {
      timestamp: Date.now(),
      level,
      category,
      message,
    };

    // Console output if enabled
    if (this.config.enableConsole) {
      this.logToConsole(entry);
    }

    // Buffer for file output if enabled
    if (this.config.enableFile) {
      this.buffer.push(entry);

      // Auto-flush if buffer is full
      if (this.buffer.length >= this.config.bufferSize) {
        // Use setTimeout to avoid blocking the current execution
        setTimeout(() => this.flush(), 0);
      }
    }
  }

  private logToConsole(entry: LogEntry): void {
    const timestamp = new Date(entry.timestamp).toISOString();
    const levelStr = LogLevel[entry.level];
    const prefix = `[${timestamp}] ${levelStr} [${entry.category}]`;

    switch (entry.level) {
      case LogLevel.DEBUG:
        console.debug(prefix, entry.message);
        break;
      case LogLevel.INFO:
        console.info(prefix, entry.message);
        break;
      case LogLevel.WARN:
        console.warn(prefix, entry.message);
        break;
      case LogLevel.ERROR:
        console.error(prefix, entry.message);
        break;
    }
  }

  private formatLogEntry(entry: LogEntry): string {
    const timestamp = new Date(entry.timestamp).toISOString();
    const levelStr = LogLevel[entry.level].padEnd(5);
    const categoryStr = entry.category.padEnd(12);

    return `${timestamp} ${levelStr} [${categoryStr}] ${entry.message}\n`;
  }

  async flush(): Promise<void> {
    if (
      this.buffer.length === 0 ||
      this.isDisposed ||
      !this.config.enableFile
    ) {
      return;
    }

    const entriesToFlush = [...this.buffer];
    this.buffer = [];

    try {
      await this.rotateLogFileIfNeeded();

      const logText = entriesToFlush
        .map((entry) => this.formatLogEntry(entry))
        .join('');

      // Read existing content and append
      let existingContent = '';
      try {
        const logFile = new File(this.logFileUri);
        if (logFile.exists) {
          existingContent = await logFile.text();
        }
      } catch {
        // File doesn't exist, that's fine
      }

      const logFile = new File(this.logFileUri);
      if (!logFile.exists) {
        logFile.create({ intermediates: true });
      }
      logFile.write(existingContent + logText);

      this.currentFileSize = await this.getFileSize(this.logFileUri);
    } catch (error) {
      // If writing fails, put entries back in buffer for retry
      this.buffer.unshift(...entriesToFlush);

      if (this.config.enableConsole) {
        console.error('[BufferedLogger] Failed to flush logs:', error);
      }
    }
  }

  private async rotateLogFileIfNeeded(): Promise<void> {
    if (this.currentFileSize < this.config.maxFileSize) {
      return;
    }

    try {
      const logsDir = new Directory(Paths.document, 'logs');

      // Rotate existing log files
      for (let i = this.config.maxFiles - 1; i >= 1; i--) {
        const oldFile = new File(logsDir, `${this.config.filename}.${i}`);
        const newFile = new File(logsDir, `${this.config.filename}.${i + 1}`);

        if (oldFile.exists) {
          if (i + 1 <= this.config.maxFiles) {
            if (newFile.exists) {
              newFile.delete();
            }
            oldFile.move(newFile);
          } else {
            oldFile.delete();
          }
        }
      }

      // Move current log to .1
      const currentFile = new File(this.logFileUri);
      if (currentFile.exists) {
        const rotatedFile = new File(logsDir, `${this.config.filename}.1`);
        if (rotatedFile.exists) {
          rotatedFile.delete();
        }
        currentFile.move(rotatedFile);
      }

      this.currentFileSize = 0;
    } catch (error) {
      if (this.config.enableConsole) {
        console.error('[BufferedLogger] Failed to rotate log files:', error);
      }
    }
  }

  debug(message: string, category = 'APP'): void {
    this.log(LogLevel.DEBUG, message, category);
  }

  info(message: string, category = 'APP'): void {
    this.log(LogLevel.INFO, message, category);
  }

  warn(message: string, category = 'APP'): void {
    this.log(LogLevel.WARN, message, category);
  }

  error(message: string, category = 'APP'): void {
    this.log(LogLevel.ERROR, message, category);
  }

  async dispose(): Promise<void> {
    this.isDisposed = true;

    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = undefined;
    }

    // Final flush
    await this.flush();
  }

  // Utility methods for configuration
  setLogLevel(level: LogLevel): void {
    this.config.level = level;
  }

  getLogLevel(): LogLevel {
    return this.config.level;
  }

  async getFileSize(fileUri: string): Promise<number> {
    try {
      const file = new File(fileUri);
      if (file.exists) {
        return file.size || 0;
      }
      return 0;
    } catch (error) {
      console.error('Error getting file size:', error);
      return 0;
    }
  }

  async getLogFileContents(): Promise<string> {
    try {
      const logFile = new File(this.logFileUri);
      if (logFile.exists) {
        return await logFile.text();
      }
      return '';
    } catch {
      return '';
    }
  }

  async clearLogs(): Promise<void> {
    try {
      const logFile = new File(this.logFileUri);
      if (logFile.exists) {
        logFile.delete();
        this.currentFileSize = 0;
      }
    } catch (error) {
      if (this.config.enableConsole) {
        console.error('[BufferedLogger] Failed to clear logs:', error);
      }
    }
  }
}
