/* eslint-disable max-lines-per-function */
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { StyleSheet, TouchableOpacity } from 'react-native';
import Swipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, {
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { Button, ScrollView, Text, Tile, View } from '@/components/ui';
import { readWorkoutDatabase } from '@/features/workout/services/workout-persistence';
import { useWorkoutActions } from '@/lib/hooks/use-workout-actions';
import { translate } from '@/lib/i18n/utils';
import type { WorkoutEntry } from '@/types/workout-database';

import { PvScatterPlot } from '../components/pv-scatter-plot';
import {
  readSessionsDb,
  saveSession,
} from '../services/power-profile-persistence';
import { usePowerSessionStore } from '../store/power-session-store';

type SessionDetailState =
  | { status: 'loading' }
  | { status: 'not_found' }
  | {
      status: 'ready';
      sessionId: string;
      startedAt: number;
      sprintEntries: WorkoutEntry[];
    };

export function SessionDetailScreen(): React.ReactElement {
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string }>();
  const sessionId = params.id;

  const { softDeleteWorkout } = useWorkoutActions();
  const activeSessionId = usePowerSessionStore((s) => s.sessionId);
  const activeStartedAt = usePowerSessionStore((s) => s.startedAt);
  const activeSprintIds = usePowerSessionStore((s) => s.sprintIds);
  const removeSprintId = usePowerSessionStore((s) => s.removeSprintId);

  const [state, setState] = React.useState<SessionDetailState>({
    status: 'loading',
  });

  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!sessionId) return;
      const sessionsDb = await readSessionsDb();
      const session = sessionsDb.sessions[sessionId];
      const isActiveFromStore = sessionId === activeSessionId;

      const workoutDb = await readWorkoutDatabase();
      const sprintIds = session
        ? session.sprintIds
        : isActiveFromStore
          ? activeSprintIds
          : null;
      const startedAt = session
        ? session.startedAt
        : isActiveFromStore
          ? activeStartedAt
          : null;

      if (!sprintIds || !startedAt) {
        if (!cancelled) setState({ status: 'not_found' });
        return;
      }

      const entries = sprintIds
        .map((id) => workoutDb.workouts[id])
        .filter((e): e is WorkoutEntry => Boolean(e))
        .filter((e) => !e.deletedAt)
        .sort((a, b) => b.date.getTime() - a.date.getTime());

      if (cancelled) return;
      setState({
        status: 'ready',
        sessionId: sessionId,
        startedAt: startedAt,
        sprintEntries: entries,
      });
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [sessionId, activeSessionId, activeStartedAt, activeSprintIds]);

  if (state.status === 'loading') {
    return (
      <View className="flex-1 p-4">
        <Tile className="bg-white dark:bg-neutral-900">
          <Text>{translate('powerProfile.common.loading')}</Text>
        </Tile>
      </View>
    );
  }

  if (state.status === 'not_found') {
    return (
      <View className="flex-1 p-4">
        <Tile className="bg-white dark:bg-neutral-900">
          <Text>{translate('powerProfile.history.sessions.empty')}</Text>
        </Tile>
      </View>
    );
  }

  const points = state.sprintEntries.map((e) => ({
    loadKg: e.metrics?.loadKg ?? 0,
    peakPowerW: e.metrics?.peakPower ?? null,
    peakVelocity: e.metrics?.peakVelocity ?? null,
  }));

  return (
    <ScrollView
      className="flex-1"
      contentContainerClassName="p-4"
      contentInsetAdjustmentBehavior="always"
    >
      <Tile className="bg-white dark:bg-neutral-900">
        <Text className="text-xl font-bold">
          {new Date(state.startedAt).toLocaleString()}
        </Text>
        <Text className="mt-1 text-neutral-600 dark:text-neutral-300">
          {`${state.sprintEntries.length} sprints`}
        </Text>
      </Tile>

      <Tile className="mt-3 bg-white dark:bg-neutral-900">
        <Text className="mb-2 text-base font-semibold">
          {translate('powerProfile.sessionDetail.curveTitle')}
        </Text>
        <PvScatterPlot
          points={points}
          width={340}
          height={220}
          yLabelPower={translate('powerProfile.sessionDetail.axis.power')}
          yLabelVelocity={translate('powerProfile.sessionDetail.axis.velocity')}
          xLabelLoad={translate('powerProfile.sessionDetail.axis.load')}
        />
      </Tile>

      <View className="mt-3">
        {state.sprintEntries.map((e) => (
          <SprintSwipeRow
            key={e.id}
            entry={e}
            onPress={() =>
              router.push(`/sprint/${e.id}?sessionId=${state.sessionId}`)
            }
            onDelete={async () => {
              await softDeleteWorkout(e.id);
              removeSprintId(e.id);

              // If viewing a saved session, persist removal from sprintIds.
              const sessionsDb = await readSessionsDb();
              const s = sessionsDb.sessions[state.sessionId];
              if (s && !s.deletedAt) {
                await saveSession({
                  ...s,
                  sprintIds: s.sprintIds.filter((id) => id !== e.id),
                });
              }
            }}
          />
        ))}
      </View>

      <Button
        variant="secondary"
        label={translate('powerProfile.sessionDetail.back')}
        onPress={() => router.replace('/workout-list')}
      />
    </ScrollView>
  );
}

function SprintSwipeRow({
  entry,
  onPress,
  onDelete,
}: {
  entry: WorkoutEntry;
  onPress: () => void;
  onDelete: () => Promise<void> | void;
}) {
  const swipeableRef = React.useRef<SwipeableMethods>(null);

  React.useEffect(() => {
    swipeableRef.current?.close();
  }, [entry.id]);

  return (
    <Swipeable
      ref={swipeableRef}
      renderRightActions={(_prog, drag) => (
        <RightAction
          drag={drag}
          onDelete={async () => {
            await onDelete();
            swipeableRef.current?.close();
          }}
        />
      )}
    >
      <TouchableOpacity style={styles.row} onPress={onPress}>
        <Text className="text-base font-semibold">{entry.name}</Text>
        <Text className="text-neutral-600 dark:text-neutral-300">
          {entry.date.toLocaleString()}
        </Text>
        <Text className="text-neutral-600 dark:text-neutral-300">
          {`${Math.round(entry.metrics?.peakPower ?? 0)} W • ${(entry.metrics?.peakVelocity ?? 0).toFixed(2)} m/s • ${(entry.metrics?.loadKg ?? 0).toFixed(1)} kg`}
        </Text>
      </TouchableOpacity>
    </Swipeable>
  );
}

function RightAction({
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
    <Reanimated.View style={[styles.rightActions, styleAnimation]}>
      <TouchableOpacity style={styles.deleteButton} onPress={onDelete}>
        <Text style={styles.deleteButtonText}>
          {translate('powerProfile.common.delete')}
        </Text>
      </TouchableOpacity>
    </Reanimated.View>
  );
}

const styles = StyleSheet.create({
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
