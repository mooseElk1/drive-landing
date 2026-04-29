import { useFocusEffect } from '@react-navigation/native';
import { FlashList } from '@shopify/flash-list';
import { useLocalSearchParams, useRouter } from 'expo-router';
import React, { useCallback, useMemo } from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Swipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, {
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

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
import {
  getSessions,
  readSessionsDb,
  saveSession,
} from '@/features/power-profile/services/power-profile-persistence';
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
  const params = useLocalSearchParams<{
    historyMode?: 'sessions' | 'sprints' | string;
  }>();
  const { workoutList, isLoading, isError } = useWorkoutState();
  const { fetchWorkouts, deleteWorkout, softDeleteWorkout } =
    useWorkoutActions();
  const activeAthleteId = useAthleteProfileStore((s) => s.activeAthleteId);
  const sessionId = usePowerSessionStore((s) => s.sessionId);
  const sessionStartedAt = usePowerSessionStore((s) => s.startedAt);
  const sessionSprintIds = usePowerSessionStore((s) => s.sprintIds);
  const activeSessionPeakPower = usePowerSessionStore(
    (s) => s.sessionPeakPower
  );
  const activeSessionPeakVelocity = usePowerSessionStore(
    (s) => s.sessionPeakVelocity
  );
  const activeSessionPeakPowerLoad = usePowerSessionStore(
    (s) => s.sessionPeakPowerLoad
  );

  const [historyMode, setHistoryMode] = React.useState<'sessions' | 'sprints'>(
    params.historyMode === 'sprints' ? 'sprints' : 'sessions'
  );
  const [sessions, setSessions] = React.useState<PowerProfileSession[]>([]);
  const [sessionsLoading, setSessionsLoading] = React.useState(false);

  React.useEffect(() => {
    if (params.historyMode === 'sprints' && historyMode !== 'sprints') {
      setHistoryMode('sprints');
      return;
    }
    if (params.historyMode === 'sessions' && historyMode !== 'sessions') {
      setHistoryMode('sessions');
    }
  }, [params.historyMode, historyMode]);

  const handleChangeHistoryMode = React.useCallback(
    (next: 'sessions' | 'sprints') => {
      setHistoryMode(next);
      router.setParams({ historyMode: next });
    },
    [router]
  );

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
        onChange={handleChangeHistoryMode}
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
            ListHeaderComponent={
              sessionId && sessionStartedAt ? (
                <Tile
                  pressable
                  className="mb-3 border border-primary-200 bg-white dark:bg-neutral-900"
                  onPress={() => router.push(`/session/${sessionId}`)}
                >
                  <Text className="text-base font-semibold">
                    {new Date(sessionStartedAt).toLocaleString()}
                  </Text>
                  <Text className="text-neutral-600 dark:text-neutral-300">
                    {`${sessionSprintIds.length} ${sessionSprintIds.length === 1 ? 'sprint' : 'sprints'}`}
                  </Text>
                  {activeSessionPeakPower != null ||
                  activeSessionPeakVelocity != null ? (
                    <Text className="mt-1 text-neutral-500 dark:text-neutral-400">
                      {[
                        activeSessionPeakPower != null
                          ? `${Math.round(activeSessionPeakPower)} W`
                          : null,
                        activeSessionPeakVelocity != null
                          ? `${activeSessionPeakVelocity.toFixed(2)} m/s`
                          : null,
                        activeSessionPeakPowerLoad != null
                          ? `${activeSessionPeakPowerLoad} kg`
                          : null,
                      ]
                        .filter(Boolean)
                        .join(' · ')}
                    </Text>
                  ) : null}
                  <Text className="text-primary-400">
                    {translate('powerProfile.history.sessions.active')}
                  </Text>
                </Tile>
              ) : null
            }
            renderItem={({ item }) => (
              <SessionSwipeRow
                item={item}
                onPress={() => router.push(`/session/${item.sessionId}`)}
                onDelete={async () => {
                  const sessionsDb = await readSessionsDb();
                  const session = sessionsDb.sessions[item.sessionId];
                  if (!session) return;
                  await saveSession({ ...session, deletedAt: Date.now() });
                  for (const sprintId of session.sprintIds) {
                    await softDeleteWorkout(sprintId);
                  }
                  if (activeAthleteId) {
                    const next = await getSessions(activeAthleteId);
                    const sorted = [...next].sort(
                      (a, b) => b.startedAt - a.startedAt
                    );
                    setSessions(sorted);
                  }
                  await fetchWorkouts();
                }}
              />
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
            <WorkoutItem
              item={item}
              onDelete={handleDeleteWorkout}
              onPress={() =>
                router.push({
                  pathname: '/sprint/[id]',
                  params: {
                    id: item.id,
                    from: 'history',
                    historyMode: 'sprints',
                  },
                })
              }
            />
          )}
          ListEmptyComponent={<EmptyState />}
          getItemType={() => 'workout-item'}
        />
      )}
      <FocusAwareStatusBar />
    </View>
  );
}

function SessionSwipeRow({
  item,
  onPress,
  onDelete,
}: {
  item: PowerProfileSession;
  onPress: () => void;
  onDelete: () => Promise<void> | void;
}) {
  const ref = React.useRef<SwipeableMethods>(null);

  React.useEffect(() => {
    ref.current?.close();
  }, [item.sessionId]);

  return (
    <Swipeable
      ref={ref}
      renderRightActions={(_prog, drag) => (
        <SessionRightAction
          drag={drag}
          onDelete={async () => {
            await onDelete();
            ref.current?.close();
          }}
        />
      )}
    >
      <TouchableOpacity style={sessionStyles.row} onPress={onPress}>
        <Text className="text-base font-semibold">
          {new Date(item.startedAt).toLocaleString()}
        </Text>
        <Text className="text-neutral-600 dark:text-neutral-300">
          {`${item.sprintIds.length} ${item.sprintIds.length === 1 ? 'sprint' : 'sprints'}`}
        </Text>
        {item.sessionPeakPower != null || item.sessionPeakVelocity != null ? (
          <Text className="text-neutral-500 dark:text-neutral-400">
            {[
              item.sessionPeakPower != null
                ? `${Math.round(item.sessionPeakPower)} W`
                : null,
              item.sessionPeakVelocity != null
                ? `${item.sessionPeakVelocity.toFixed(2)} m/s`
                : null,
              item.sessionPeakPowerLoad != null
                ? `${item.sessionPeakPowerLoad} kg`
                : null,
            ]
              .filter(Boolean)
              .join(' · ')}
          </Text>
        ) : null}
        <Text className="text-neutral-600 dark:text-neutral-300">
          {translate('powerProfile.history.sessions.completed')}
        </Text>
      </TouchableOpacity>
    </Swipeable>
  );
}

function SessionRightAction({
  drag,
  onDelete,
}: {
  drag: SharedValue<number>;
  onDelete: () => void;
}) {
  const styleAnimation = useAnimatedStyle(() => ({
    transform: [{ translateX: drag.value + 80 }],
  }));

  return (
    <Reanimated.View style={[sessionStyles.rightActions, styleAnimation]}>
      <TouchableOpacity style={sessionStyles.deleteButton} onPress={onDelete}>
        <Text style={sessionStyles.deleteButtonText}>
          {translate('powerProfile.common.delete')}
        </Text>
      </TouchableOpacity>
    </Reanimated.View>
  );
}

const sessionStyles = StyleSheet.create({
  row: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  rightActions: {
    flexDirection: 'row',
  },
  deleteButton: {
    backgroundColor: 'red',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
});
