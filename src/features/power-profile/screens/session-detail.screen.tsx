/* eslint-disable max-lines-per-function */
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';

import { Button, Text, Tile, View } from '@/components/ui';
import { readWorkoutDatabase } from '@/features/workout/services/workout-persistence';
import { translate } from '@/lib/i18n/utils';
import type { WorkoutEntry } from '@/types/workout-database';

import { PvScatterPlot } from '../components/pv-scatter-plot';
import { readSessionsDb } from '../services/power-profile-persistence';

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

  const [state, setState] = React.useState<SessionDetailState>({
    status: 'loading',
  });

  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!sessionId) return;
      const sessionsDb = await readSessionsDb();
      const session = sessionsDb.sessions[sessionId];
      if (!session) {
        if (!cancelled) setState({ status: 'not_found' });
        return;
      }

      const workoutDb = await readWorkoutDatabase();
      const entries = session.sprintIds
        .map((id) => workoutDb.workouts[id])
        .filter((e): e is WorkoutEntry => Boolean(e))
        .sort((a, b) => b.date.getTime() - a.date.getTime());

      if (cancelled) return;
      setState({
        status: 'ready',
        sessionId: session.sessionId,
        startedAt: session.startedAt,
        sprintEntries: entries,
      });
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [sessionId]);

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
    <View className="flex-1 p-4">
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
          <Tile
            key={e.id}
            pressable
            className="mb-3 bg-white dark:bg-neutral-900"
            onPress={() => router.push(`/sprint/${e.id}`)}
          >
            <Text className="text-base font-semibold">{e.name}</Text>
            <Text className="text-neutral-600 dark:text-neutral-300">
              {e.date.toLocaleString()}
            </Text>
            <Text className="text-neutral-600 dark:text-neutral-300">
              {`${Math.round(e.metrics?.peakPower ?? 0)} W • ${(e.metrics?.peakVelocity ?? 0).toFixed(2)} m/s • ${(e.metrics?.loadKg ?? 0).toFixed(1)} kg`}
            </Text>
          </Tile>
        ))}
      </View>

      <Button
        variant="secondary"
        label={translate('powerProfile.sessionDetail.back')}
        onPress={() => router.back()}
      />
    </View>
  );
}
