import { useFocusEffect } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';

import { EmptyState, ErrorState, LoadingState } from '@/components/helper';
import {
  Button,
  FocusAwareStatusBar,
  SegmentedControl,
  Text,
  Tile,
  View,
} from '@/components/ui';
import { WorkoutItem } from '@/components/workout-item';
import { getSessions } from '@/features/power-profile/services/power-profile-persistence';
import { useAthleteProfileStore } from '@/features/power-profile/store/athlete-profile-store';
import { usePowerSessionStore } from '@/features/power-profile/store/power-session-store';
import type { PowerProfileSession } from '@/features/power-profile/types/power-session';
import {
  useWorkoutActions,
  useWorkoutState,
} from '@/lib/hooks/use-workout-actions';
import { translate } from '@/lib/i18n/utils';
import type { WorkoutEntry } from '@/types/workout-database';

/* eslint-disable max-lines-per-function */
export default function Workouts() {
  const router = useRouter();
  const { workoutList, isLoading, isError } = useWorkoutState();
  const { fetchWorkouts, deleteWorkout } = useWorkoutActions();
  const activeAthleteId = useAthleteProfileStore((s) => s.activeAthleteId);
  const sessionId = usePowerSessionStore((s) => s.sessionId);

  const [historyMode, setHistoryMode] = React.useState<'sessions' | 'sprints'>(
    'sessions'
  );
  const [sessions, setSessions] = React.useState<PowerProfileSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = React.useState(false);

  useFocusEffect(
    useCallback(() => {
      void fetchWorkouts();
    }, [fetchWorkouts])
  );

  useFocusEffect(
    useCallback(() => {
      if (historyMode !== 'sessions') return;
      if (!activeAthleteId) return;

      let cancelled = false;
      setSessionsLoading(true);
      void getSessions(activeAthleteId)
        .then((s) => {
          if (cancelled) return;
          const sorted = [...s].sort((a, b) => b.startedAt - a.startedAt);
          setSessions(sorted);
        })
        .finally(() => {
          if (!cancelled) setSessionsLoading(false);
        });

      return () => {
        cancelled = true;
      };
    }, [activeAthleteId, historyMode])
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
      <SegmentedControl
        value={historyMode}
        onChange={setHistoryMode}
        options={[
          {
            value: 'sessions',
            label: translate('powerProfile.history.tabs.sessions'),
          },
          {
            value: 'sprints',
            label: translate('powerProfile.history.tabs.sprints'),
          },
        ]}
        testID="history-mode"
      />

      {historyMode === 'sessions' ? (
        !activeAthleteId ? (
          <Tile className="bg-white dark:bg-neutral-900">
            <Text className="text-neutral-600 dark:text-neutral-300">
              {translate('powerProfile.history.sessions.noAthlete')}
            </Text>
            <View className="mt-3">
              <Button
                label={translate('powerProfile.history.sessions.createAthlete')}
                onPress={() => router.push('/profile-setup')}
                testID="history-create-athlete"
              />
            </View>
          </Tile>
        ) : sessionsLoading ? (
          <LoadingState />
        ) : (
          <FlashList
            data={sessions}
            keyExtractor={(item) => item.sessionId}
            renderItem={({ item }) => (
              <Tile
                pressable
                className="mb-3 bg-white dark:bg-neutral-900"
                onPress={() => router.push(`/session/${item.sessionId}`)}
              >
                <Text className="text-base font-semibold">
                  {new Date(item.startedAt).toLocaleString()}
                </Text>
                <Text className="text-neutral-600 dark:text-neutral-300">
                  {`${item.sprintIds.length} sprints`}
                </Text>
                {item.sessionId === sessionId ? (
                  <Text className="text-primary-400">
                    {translate('powerProfile.history.sessions.active')}
                  </Text>
                ) : null}
              </Tile>
            )}
            ListEmptyComponent={
              <Tile className="bg-white dark:bg-neutral-900">
                <Text className="text-neutral-600 dark:text-neutral-300">
                  {translate('powerProfile.history.sessions.empty')}
                </Text>
              </Tile>
            }
            getItemType={() => 'session-item'}
          />
        )
      ) : (
        <FlashList
          data={workoutData}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <WorkoutItem item={item} onDelete={handleDeleteWorkout} />
          )}
          ListEmptyComponent={<EmptyState />}
          getItemType={() => 'workout-item'}
        />
      )}
      <FocusAwareStatusBar />
    </View>
  );
}
