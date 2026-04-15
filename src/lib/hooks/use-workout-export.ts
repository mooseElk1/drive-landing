import { Directory, File, Paths } from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { useCallback, useState } from 'react';

import { CHANNELS } from '@/types/channel-names';
import { type WorkoutClass } from '@/types/workout';

export interface ExportOptions {
  format: 'csv' | 'json' | 'gpx';
  includeRawData?: boolean;
  includePeakValues?: boolean;
}

export interface ExportResult {
  success: boolean;
  filePath?: string;
  error?: string;
}

// Constants
const EXPORT_DIR = new Directory(Paths.cache, 'exports');
const RAW_CHANNELS = new Set<string>([
  CHANNELS.ACCEL_X,
  CHANNELS.ACCEL_Y,
  CHANNELS.ACCEL_Z,
  CHANNELS.ACCEL_X_GRAV,
  CHANNELS.ACCEL_Y_GRAV,
  CHANNELS.ACCEL_Z_GRAV,
  CHANNELS.GYRO_X,
  CHANNELS.GYRO_Y,
  CHANNELS.GYRO_Z,
  CHANNELS.MAG_X,
  CHANNELS.MAG_Y,
  CHANNELS.MAG_Z,
  CHANNELS.ROTATION_A,
  CHANNELS.ROTATION_B,
  CHANNELS.ROTATION_G,
  CHANNELS.BAROMETER,
  CHANNELS.ORIENTATION,
  CHANNELS.TIMESTAMP,
  CHANNELS.TIMESTAMP_ACCEL,
  CHANNELS.TIMESTAMP_GYRO,
  CHANNELS.TIMESTAMP_ROTATION,
]);

function escapeCsvValue(value: unknown): string {
  const str = String(value ?? '');
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

export function useWorkoutExport() {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  const ensureExportDirectory = useCallback(async (): Promise<void> => {
    if (!EXPORT_DIR.exists) {
      EXPORT_DIR.create({
        intermediates: true,
        overwrite: true,
      });
    }
  }, []);

  // Export utility functions
  const generateFileName = useCallback(
    (workout: WorkoutClass, format: string): string => {
      const date = workout.date.toISOString().split('T')[0];
      const safeName = workout.name.replace(/[^a-zA-Z0-9-_]/g, '_');
      return `${safeName}_${date}.${format}`;
    },
    []
  );

  const getMimeType = useCallback((format: string): string => {
    switch (format) {
      case 'csv':
        return 'text/csv';
      case 'json':
        return 'application/json';
      case 'gpx':
        return 'application/gpx+xml';
      default:
        return 'text/plain';
    }
  }, []);

  const generateCSV = useCallback(
    (workout: WorkoutClass, options: ExportOptions): string => {
      const data = workout.data.channels;
      const headers: string[] = [];
      const rows: string[][] = [];

      // Convert Map to object if needed
      const channels = data instanceof Map ? Object.fromEntries(data) : data;
      const includeRawData = options.includeRawData ?? true;

      // Get all channel names and determine max length
      const channelNames = Object.keys(channels).filter((channelName) => {
        if (!Array.isArray(channels[channelName])) {
          return false;
        }
        if (!includeRawData && RAW_CHANNELS.has(channelName)) {
          return false;
        }
        return true;
      });
      let maxLength = 0;

      for (const channelName of channelNames) {
        const channelData = channels[channelName];
        headers.push(channelName);
        maxLength = Math.max(maxLength, channelData.length);
      }

      // Create rows
      for (let i = 0; i < maxLength; i++) {
        const row: string[] = [];
        for (const channelName of headers) {
          const channelData = channels[channelName];
          const value = channelData[i];
          row.push(value !== undefined ? escapeCsvValue(value) : '');
        }
        rows.push(row);
      }

      // Generate CSV content
      const csvLines = [
        `# Workout: ${workout.name}`,
        `# Date: ${workout.date.toISOString()}`,
        `# Exported: ${new Date().toISOString()}`,
        `# IncludeRawData: ${includeRawData}`,
        '',
        headers.map(escapeCsvValue).join(','),
        ...rows.map((row) => row.join(',')),
      ];

      return csvLines.join('\n');
    },
    []
  );

  const generateJSON = useCallback(
    (workout: WorkoutClass, options: ExportOptions): string => {
      const exportData = {
        name: workout.name,
        date: workout.date.toISOString(),
        exportDate: new Date().toISOString(),
        format: 'DRIVE_WORKOUT_V1',
        data: {
          channels:
            workout.data.channels instanceof Map
              ? Object.fromEntries(workout.data.channels)
              : workout.data.channels,
        },
        metadata: {
          includeRawData: options.includeRawData ?? true,
          includePeakValues: options.includePeakValues ?? true,
        },
      };

      return JSON.stringify(exportData, null, 2);
    },
    []
  );

  const generateGPX = useCallback(
    (workout: WorkoutClass, _options: ExportOptions): string => {
      const channels =
        workout.data.channels instanceof Map
          ? Object.fromEntries(workout.data.channels)
          : workout.data.channels;

      const timestamps = channels[CHANNELS.TIMESTAMP] || [];
      const velocities = channels[CHANNELS.VELOCITY_MAGNITUDE] || [];
      const power = channels[CHANNELS.POWER_MAGNITUDE] || [];

      const gpxHeader = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="DRIVE App">
  <trk>
    <name>${workout.name}</name>
    <desc>Workout exported from DRIVE App</desc>
    <trkseg>`;

      const gpxFooter = `    </trkseg>
  </trk>
</gpx>`;

      const trackPoints: string[] = [];

      for (let i = 0; i < timestamps.length; i++) {
        const timestamp = new Date(timestamps[i]).toISOString();
        const velocity = velocities[i] || 0;
        const powerValue = power[i] || 0;

        trackPoints.push(`      <trkpt lat="0" lon="0">
        <time>${timestamp}</time>
        <extensions>
          <velocity>${velocity}</velocity>
          <power>${powerValue}</power>
        </extensions>
      </trkpt>`);
      }

      return gpxHeader + '\n' + trackPoints.join('\n') + '\n' + gpxFooter;
    },
    []
  );

  // Export operations
  const exportWorkout = useCallback(
    async (
      workout: WorkoutClass,
      options: ExportOptions
    ): Promise<ExportResult> => {
      try {
        setIsLoading(true);
        setError(null);

        // Ensure export directory exists
        await ensureExportDirectory();

        const fileName = generateFileName(workout, options.format);
        const outputFile = new File(EXPORT_DIR, fileName);

        let content: string;
        switch (options.format) {
          case 'csv':
            content = generateCSV(workout, options);
            break;
          case 'json':
            content = generateJSON(workout, options);
            break;
          case 'gpx':
            content = generateGPX(workout, options);
            break;
          default:
            throw new Error(`Unsupported format: ${options.format}`);
        }

        if (!outputFile.exists) {
          outputFile.create({ intermediates: true });
        }
        outputFile.write(content);

        return {
          success: true,
          filePath: outputFile.uri,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Unknown export error';
        setError(errorMessage);
        return {
          success: false,
          error: errorMessage,
        };
      } finally {
        setIsLoading(false);
      }
    },
    [
      ensureExportDirectory,
      generateFileName,
      generateCSV,
      generateJSON,
      generateGPX,
    ]
  );

  const exportAndShare = useCallback(
    async (
      workout: WorkoutClass,
      options: ExportOptions
    ): Promise<ExportResult> => {
      const exportResult = await exportWorkout(workout, options);

      if (!exportResult.success || !exportResult.filePath) {
        return exportResult;
      }

      try {
        if (await Sharing.isAvailableAsync()) {
          await Sharing.shareAsync(exportResult.filePath, {
            dialogTitle: `Share ${workout.name}`,
            mimeType: getMimeType(options.format),
          });
        } else {
          const errorMessage = 'Sharing is not available on this device';
          setError(errorMessage);
          return {
            success: false,
            error: errorMessage,
          };
        }

        return exportResult;
      } catch (error) {
        console.error('Sharing failed:', error);
        const errorMessage =
          error instanceof Error ? error.message : 'Sharing failed';
        setError(errorMessage);
        return {
          success: false,
          error: errorMessage,
        };
      }
    },
    [exportWorkout, getMimeType]
  );

  const cleanupExports = useCallback(async (): Promise<void> => {
    try {
      setIsLoading(true);
      setError(null);

      if (EXPORT_DIR.exists) {
        EXPORT_DIR.delete();
      }
    } catch (error) {
      console.warn('Failed to cleanup exports:', error);
      setError(
        error instanceof Error ? error.message : 'Failed to cleanup exports'
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  return {
    exportWorkout,
    exportAndShare,
    cleanupExports,
    isLoading,
    error,
    clearError,
  };
}
