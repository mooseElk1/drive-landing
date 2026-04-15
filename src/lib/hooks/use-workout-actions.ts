import { showMessage } from 'react-native-flash-message';
import { create } from 'zustand';

import {
  deleteWorkout,
  persistWorkout,
  readWorkoutDatabase,
} from '@/features/workout/services/workout-persistence';
import { type ProcessedSensorData } from '@/types/processed-sensor-data';
import { WorkoutClass } from '@/types/workout';
import {
  type WorkoutEntry,
  type WorkoutTrackingDatabase,
} from '@/types/workout-database';

interface WorkoutStore {
  workoutList: WorkoutTrackingDatabase;
  isLoading: boolean;
  isError: boolean;
  fetchWorkouts: () => Promise<void>;
  addWorkout: (workout: WorkoutClass) => Promise<void>;
  deleteWorkout: (item: WorkoutEntry) => Promise<void>;
  saveWorkout: (data: ProcessedSensorData) => Promise<void>;
  resetError: () => void;
}

export const useWorkouts = create<WorkoutStore>((set, _) => ({
  workoutList: {
    workouts: {},
    metadata: {
      version: '1.0.0',
      createdAt: new Date(),
      lastUpdated: new Date(),
      totalWorkouts: 0,
    },
  },
  isLoading: false,
  isError: false,

  fetchWorkouts: async () => {
    try {
      set({ isLoading: true, isError: false });
      const storedFiles = await readWorkoutDatabase();
      set({ workoutList: storedFiles, isLoading: false });
    } catch {
      set({ isError: true, isLoading: false });
    }
  },

  addWorkout: async (workout: WorkoutClass) => {
    try {
      set({ isError: false });
      const updatedWorkouts = await persistWorkout(workout);
      set({ workoutList: updatedWorkouts });
    } catch {
      set({ isError: true });
    }
  },

  deleteWorkout: async (item: WorkoutEntry) => {
    try {
      set({ isError: false });
      const updatedWorkouts = await deleteWorkout(item);
      set({ workoutList: updatedWorkouts });
    } catch {
      set({ isError: true });
    }
  },

  saveWorkout: async (data: ProcessedSensorData) => {
    try {
      set({ isError: false });
      const workout = new WorkoutClass({
        name: `Workout ${new Date().toLocaleString()}`,
        date: new Date(),
        data,
      });
      const updatedWorkouts = await persistWorkout(workout);
      set({ workoutList: updatedWorkouts });
      showMessage({
        message: 'Workout Saved!',
        type: 'success',
        duration: 2000,
      });
    } catch {
      set({ isError: true });
      showMessage({
        message: 'Failed to save workout',
        type: 'danger',
        duration: 2000,
      });
    }
  },

  resetError: () => set({ isError: false }),
}));

export const useWorkoutActions = () => {
  const fetchWorkouts = useWorkouts((state) => state.fetchWorkouts);
  const addWorkout = useWorkouts((state) => state.addWorkout);
  const deleteWorkout = useWorkouts((state) => state.deleteWorkout);
  const saveWorkout = useWorkouts((state) => state.saveWorkout);
  const resetError = useWorkouts((state) => state.resetError);

  return {
    fetchWorkouts,
    addWorkout,
    deleteWorkout,
    saveWorkout,
    resetError,
  };
};

export const useWorkoutState = () => {
  const workoutList = useWorkouts((state) => state.workoutList);
  const isLoading = useWorkouts((state) => state.isLoading);
  const isError = useWorkouts((state) => state.isError);

  return { workoutList, isLoading, isError };
};
