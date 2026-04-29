/* eslint-disable max-lines-per-function */
import { useLocalSearchParams, useRouter } from 'expo-router';
import React from 'react';
import { Dimensions } from 'react-native';
import Svg, { Line, Path, Rect, Text as SvgText } from 'react-native-svg';

import { Button, Text, Tile, View } from '@/components/ui';
import colors from '@/components/ui/colors';
import {
  loadWorkout,
  readWorkoutDatabase,
} from '@/features/workout/services/workout-persistence';
import { translate } from '@/lib/i18n/utils';
import { CHANNELS } from '@/types/channel-names';
import type { WorkoutEntry } from '@/types/workout-database';

type SprintDetailState =
  | { status: 'loading' }
  | { status: 'not_found' }
  | {
      status: 'ready';
      entry: WorkoutEntry;
      timestamps: number[];
      power: number[];
      velocity: number[];
    };

function sparkPath(values: number[], width: number, height: number): string {
  const padding = 8;
  const innerW = Math.max(1, width - padding * 2);
  const innerH = Math.max(1, height - padding * 2);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const scaleY = (v: number) => {
    const t = max === min ? 0.5 : (v - min) / (max - min);
    return padding + (1 - t) * innerH;
  };
  const step = innerW / Math.max(1, values.length - 1);
  return values
    .map((v, i) => {
      const x = padding + i * step;
      const y = scaleY(v);
      return `${i === 0 ? 'M' : 'L'}${x.toFixed(2)},${y.toFixed(2)}`;
    })
    .join(' ');
}

export function SprintDetailScreen(): React.ReactElement {
  const router = useRouter();
  const params = useLocalSearchParams<{
    id: string;
    sessionId?: string;
    from?: string;
    historyMode?: string;
  }>();
  const sprintId = params.id;
  const sessionId = params.sessionId;
  const fromHistory = params.from === 'history';

  const [state, setState] = React.useState<SprintDetailState>({
    status: 'loading',
  });

  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!sprintId) return;
      const db = await readWorkoutDatabase();
      const entry = db.workouts[sprintId];
      if (!entry) {
        if (!cancelled) setState({ status: 'not_found' });
        return;
      }
      const workout = await loadWorkout(entry);
      if (!workout) {
        if (!cancelled) setState({ status: 'not_found' });
        return;
      }

      const timestamps = workout.data.getChannelData(CHANNELS.TIMESTAMP) ?? [];
      const power = workout.data.getChannelData(CHANNELS.POWER_MAGNITUDE) ?? [];
      const velocity =
        workout.data.getChannelData(CHANNELS.VELOCITY_MAGNITUDE) ?? [];

      if (cancelled) return;
      setState({ status: 'ready', entry, timestamps, power, velocity });
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [sprintId]);

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
          <Text>{translate('powerProfile.sprintDetail.notFound')}</Text>
        </Tile>
      </View>
    );
  }

  const { width } = Dimensions.get('window');
  const chartW = Math.min(width - 32, 420);
  const chartH = 160;

  const powerPath =
    state.power.length >= 2 ? sparkPath(state.power, chartW, chartH) : '';
  const velPath =
    state.velocity.length >= 2 ? sparkPath(state.velocity, chartW, chartH) : '';

  return (
    <View className="flex-1 p-4">
      <Tile className="bg-white dark:bg-neutral-900">
        <Text className="text-xl font-bold">{state.entry.name}</Text>
        <Text className="text-neutral-600 dark:text-neutral-300">
          {state.entry.date.toLocaleString()}
        </Text>
      </Tile>

      <Tile className="mt-3 bg-white dark:bg-neutral-900">
        <Text className="mb-2 text-base font-semibold">
          {translate('powerProfile.sprintDetail.chartTitle')}
        </Text>
        <Svg width={chartW} height={chartH}>
          <Rect x={0} y={0} width={chartW} height={chartH} fill="transparent" />
          <Line
            x1={0}
            y1={chartH - 1}
            x2={chartW}
            y2={chartH - 1}
            stroke={colors.neutral[300]}
          />
          {powerPath ? (
            <Path
              d={powerPath}
              stroke={colors.primary[400]}
              strokeWidth={2}
              fill="none"
            />
          ) : null}
          {velPath ? (
            <Path
              d={velPath}
              stroke={colors.neutral[600]}
              strokeWidth={2}
              fill="none"
            />
          ) : null}
          <SvgText x={8} y={14} fill={colors.neutral[500]} fontSize={10}>
            {translate('powerProfile.sprintDetail.chartLegend')}
          </SvgText>
        </Svg>
      </Tile>

      <Tile className="mt-3 bg-white dark:bg-neutral-900">
        <Text className="mb-2 text-base font-semibold">
          {translate('powerProfile.sprintDetail.metricsTitle')}
        </Text>

        <Text className="text-neutral-600 dark:text-neutral-300">
          {`${translate('powerProfile.sprintDetail.metrics.load')}: ${(state.entry.metrics?.loadKg ?? 0).toFixed(1)} kg`}
        </Text>
        <Text className="text-neutral-600 dark:text-neutral-300">
          {`${translate('powerProfile.sprintDetail.metrics.peakPower')}: ${Math.round(state.entry.metrics?.peakPower ?? 0)} W`}
        </Text>
        <Text className="text-neutral-600 dark:text-neutral-300">
          {`${translate('powerProfile.sprintDetail.metrics.peakVelocity')}: ${(state.entry.metrics?.peakVelocity ?? 0).toFixed(2)} m/s`}
        </Text>
        {state.entry.metrics?.zoneAtRecording ? (
          <Text className="text-neutral-600 dark:text-neutral-300">
            {`${translate('powerProfile.sprintDetail.metrics.zone')}: ${state.entry.metrics.zoneAtRecording}`}
          </Text>
        ) : null}
      </Tile>

      <Button
        variant="secondary"
        label={translate('powerProfile.sessionDetail.back')}
        onPress={() => {
          if (sessionId) {
            router.replace({
              pathname: '/session/[id]',
              params: { id: sessionId },
            });
            return;
          }
          if (fromHistory) {
            router.replace({
              pathname: '/workout-list',
              params: {
                historyMode:
                  params.historyMode === 'sessions' ? 'sessions' : 'sprints',
              },
            });
            return;
          }
          router.back();
        }}
      />
    </View>
  );
}
