/* eslint-disable max-lines-per-function */
import { useCallback, useState } from 'react';

import {
  deleteWorkout as deleteWorkoutFromService,
  loadWorkout as loadWorkoutFromService,
  persistWorkout,
  readWorkoutDatabase,
} from '@/features/workout/services/workout-persistence';
import { type WorkoutClass } from '@/types/workout';
import {
  type WorkoutEntry,
  type WorkoutTrackingDatabase,
} from '@/types/workout-database';

export interface WorkoutSummary {
  name: string;
  date: Date;
  dataSize: number;
  channels: string[];
}

interface WorkoutFileOperations {
  // Loading operations
  loadWorkout: (entry: WorkoutEntry) => Promise<WorkoutClass | null>;
  getWorkoutSummary: (entry: WorkoutEntry) => Promise<WorkoutSummary | null>;

  // Persistence operations (delegated to service)
  saveWorkout: (
    workout: WorkoutClass,
    options?: Parameters<typeof persistWorkout>[1]
  ) => Promise<WorkoutTrackingDatabase | null>;
  deleteWorkout: (
    entry: WorkoutEntry
  ) => Promise<WorkoutTrackingDatabase | null>;
  readFileDB: () => Promise<WorkoutTrackingDatabase | null>;

  // State
  isLoading: boolean;
  error: string | null;
  clearError: () => void;
}

export function useWorkoutFileOperations(): WorkoutFileOperations {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Loading operations
  const loadWorkout = useCallback(
    async (entry: WorkoutEntry): Promise<WorkoutClass | null> => {
      try {
        setIsLoading(true);
        setError(null);
        return await loadWorkoutFromService(entry);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to load workout';
        setError(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const getWorkoutSummary = useCallback(
    async (entry: WorkoutEntry): Promise<WorkoutSummary | null> => {
      try {
        setIsLoading(true);
        setError(null);

        const workout = await loadWorkout(entry);
        if (!workout) return null;

        const channels =
          workout.data.channels instanceof Map
            ? Array.from(workout.data.channels.keys())
            : Object.keys(workout.data.channels);

        const dataSize = channels.reduce((total, channelName) => {
          const channelData =
            workout.data.channels instanceof Map
              ? workout.data.channels.get(channelName)
              : (workout.data.channels as Record<string, unknown>)[channelName];
          return total + (Array.isArray(channelData) ? channelData.length : 0);
        }, 0);

        return {
          name: workout.name,
          date: workout.date,
          dataSize,
          channels,
        };
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to get workout summary';
        setError(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    [loadWorkout]
  );

  // Persistence operations (delegated to service)
  const readFileDB =
    useCallback(async (): Promise<WorkoutTrackingDatabase | null> => {
      try {
        setIsLoading(true);
        setError(null);
        return await readWorkoutDatabase();
      } catch (error) {
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'Failed to read file database';
        setError(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    }, []);

  const saveWorkout = useCallback(
    async (
      workout: WorkoutClass,
      options?: Parameters<typeof persistWorkout>[1]
    ): Promise<WorkoutTrackingDatabase | null> => {
      try {
        setIsLoading(true);
        setError(null);
        return await persistWorkout(workout, options);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to save workout';
        setError(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  const deleteWorkout = useCallback(
    async (entry: WorkoutEntry): Promise<WorkoutTrackingDatabase | null> => {
      try {
        setIsLoading(true);
        setError(null);
        return await deleteWorkoutFromService(entry);
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : 'Failed to delete workout';
        setError(errorMessage);
        return null;
      } finally {
        setIsLoading(false);
      }
    },
    []
  );

  return {
    // Loading operations
    loadWorkout,
    getWorkoutSummary,

    // Persistence operations
    saveWorkout,
    deleteWorkout,
    readFileDB,

    // State
    isLoading,
    error,
    clearError,
  };
}
