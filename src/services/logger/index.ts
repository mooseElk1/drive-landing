// React Native app state change listener for cleanup
import { AppState, type NativeEventSubscription } from 'react-native';

import { BufferedLogger } from './buffered-logger';
import { LogLevel } from './types';

// Global logger instance with performance-optimized settings
export const logger = new BufferedLogger({
  level: __DEV__ ? LogLevel.DEBUG : LogLevel.INFO,
  bufferSize: 50, // Smaller buffer for faster flushes during high-frequency logging
  flushIntervalMs: 2000, // More frequent flushes
  maxFileSize: 5 * 1024 * 1024, // 5MB files
  maxFiles: 3,
  enableConsole: __DEV__, // Console only in development
  enableFile: true,
  filename: 'drive-app.log',
});

// Export types and classes for custom logger instances
export { BufferedLogger } from './buffered-logger';

// Convenience functions for common logging patterns
export const logVelocityFSM = (message: string) => {
  logger.debug(message, 'VELOCITY_FSM');
};

export const logWorkoutData = (message: string) => {
  logger.info(message, 'WORKOUT');
};

export const logPerformance = (message: string) => {
  logger.warn(message, 'PERFORMANCE');
};

export const logError = (message: string) => {
  logger.error(message, 'ERROR');
};

// Hook to ensure logger is properly cleaned up when app closes
if (typeof window !== 'undefined') {
  window.addEventListener?.('beforeunload', () => {
    logger.dispose();
  });
}

let appStateSubscription: NativeEventSubscription;

const handleAppStateChange = (nextAppState: string) => {
  if (nextAppState === 'background' || nextAppState === 'inactive') {
    // Flush logs when app goes to background
    logger.flush();
  }
};

// Subscribe to app state changes
try {
  appStateSubscription = AppState.addEventListener(
    'change',
    handleAppStateChange
  );
} catch {
  // AppState might not be available in all environments
}

export const cleanupLogger = () => {
  if (appStateSubscription) {
    appStateSubscription.remove?.();
  }
  return logger.dispose();
};
