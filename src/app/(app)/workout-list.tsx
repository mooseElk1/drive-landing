import { useFocusEffect } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import React, { useCallback, useMemo } from 'react';

import { EmptyState, ErrorState, LoadingState } from '@/components/helper';
import { FocusAwareStatusBar, View } from '@/components/ui';
import { WorkoutItem } from '@/components/workout-item';
import {
  useWorkoutActions,
  useWorkoutState,
} from '@/lib/hooks/use-workout-actions';
import type { WorkoutEntry } from '@/types/workout-database';

export default function Workouts() {
  const { workoutList, isLoading, isError } = useWorkoutState();
  const { fetchWorkouts, deleteWorkout } = useWorkoutActions();

  useFocusEffect(
    useCallback(() => {
      void fetchWorkouts();
    }, [fetchWorkouts])
  );

  const workoutData = useMemo(() => {
    const values = Object.values(workoutList.workouts || {}) as WorkoutEntry[];
    return values.sort((a, b) => b.date.getTime() - a.date.getTime());
  }, [workoutList.workouts]);

  const handleDeleteWorkout = useCallback(
    async (item: WorkoutEntry) => {
      await deleteWorkout(item);
    },
    [deleteWorkout]
  );

  if (isLoading) {
    return (
      <View className="flex-1 px-4 pt-4">
        <LoadingState />
        <FocusAwareStatusBar />
      </View>
    );
  }

  if (isError) {
    return (
      <View className="flex-1 px-4 pt-4">
        <ErrorState />
        <FocusAwareStatusBar />
      </View>
    );
  }

  return (
    <View className="flex-1 px-4 pt-4">
      <FlashList
        data={workoutData}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <WorkoutItem item={item} onDelete={handleDeleteWorkout} />
        )}
        ListEmptyComponent={<EmptyState />}
        getItemType={() => 'workout-item'}
      />
      <FocusAwareStatusBar />
    </View>
  );
}
