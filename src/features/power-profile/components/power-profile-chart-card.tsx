/* eslint-disable max-lines-per-function */
import React from 'react';
import { useWindowDimensions } from 'react-native';

import { Pressable, Select, Text, Tile, View } from '@/components/ui';
import {
  type ChartPointSelection,
  getMostRecentPplTestSprintIds,
} from '@/features/power-profile/services/chart-point-selection-service';
import { readSessionsDb } from '@/features/power-profile/services/power-profile-persistence';
import { readWorkoutDatabase } from '@/features/workout/services/workout-persistence';
import type { WorkoutEntry } from '@/types/workout-database';

import { type ChartPoint, LoadVelocityChart } from './load-velocity-chart';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function selectionLabel(sel: ChartPointSelection): string {
  switch (sel) {
    case 'ppl_test':
      return 'PPL Test';
    case 'last_7d':
      return 'Last 7d';
    case 'last_30d':
      return 'Last 30d';
    case 'all_time':
      return 'All time';
  }
}

function selectionOptions() {
  const values: ChartPointSelection[] = [
    'ppl_test',
    'last_7d',
    'last_30d',
    'all_time',
  ];
  return values.map((v) => ({ label: selectionLabel(v), value: v }));
}

function entryToPoint(e: WorkoutEntry): ChartPoint | null {
  const loadKg = e.metrics?.loadKg ?? null;
  if (typeof loadKg !== 'number' || !Number.isFinite(loadKg) || loadKg <= 0) {
    return null;
  }
  return {
    id: e.id,
    loadKg,
    peakVelocity: e.metrics?.peakVelocity ?? null,
    peakPowerW: e.metrics?.peakPower ?? null,
  };
}

function filterByWindow(entries: WorkoutEntry[], nowMs: number, days: number) {
  const windowMs = days * 24 * 60 * 60 * 1000;
  const cutoff = nowMs - windowMs;
  return entries.filter((e) => e.date.getTime() >= cutoff);
}

export function PowerProfileChartCard(props: {
  title: string;
  mode: 'session' | 'athlete';
  athleteId?: string | null;
  bodyWeightKg?: number | null;
  pplLoadKg: number;
  peakPowerW: number;
  sessionEntries?: WorkoutEntry[];
  selection?: ChartPointSelection;
  onSelectionChange?: (sel: ChartPointSelection) => void;
  points?: ChartPoint[];
}): React.ReactElement {
  const { width: windowWidth } = useWindowDimensions();

  const [internalSelection, setInternalSelection] =
    React.useState<ChartPointSelection>('ppl_test');
  const [showBw, setShowBw] = React.useState(false);
  const [showPpl, setShowPpl] = React.useState(false);
  const [points, setPoints] = React.useState<ChartPoint[]>([]);

  const screenHorizontalPaddingPx = 16 * 2; // screens using `p-4`
  const maxChartWidth = Math.max(1, windowWidth - screenHorizontalPaddingPx);
  const chartWidth = clamp(maxChartWidth, 1, 1000);

  const bwAvailable =
    typeof props.bodyWeightKg === 'number' &&
    Number.isFinite(props.bodyWeightKg) &&
    props.bodyWeightKg > 0;
  const pplAvailable = Number.isFinite(props.pplLoadKg) && props.pplLoadKg > 0;

  const selection = props.selection ?? internalSelection;
  const resolvedPoints = props.points ?? points;

  React.useEffect(() => {
    let cancelled = false;

    async function run() {
      if (props.points) return;
      if (props.mode === 'session') {
        const sessionEntries = props.sessionEntries ?? [];
        const next = sessionEntries
          .filter((e) => Boolean(e) && !e.deletedAt)
          .map(entryToPoint)
          .filter((p): p is ChartPoint => Boolean(p));
        if (!cancelled) setPoints(next);
        return;
      }

      if (!props.athleteId) {
        if (!cancelled) setPoints([]);
        return;
      }

      const nowMs = Date.now();
      const db = await readWorkoutDatabase();
      const allEntries = Object.values(db.workouts)
        .filter((e): e is WorkoutEntry => Boolean(e))
        .filter((e) => !e.deletedAt)
        .filter((e) => e.metrics?.athleteId === props.athleteId);

      let chosen: WorkoutEntry[] = allEntries;
      if (selection === 'last_7d') {
        chosen = filterByWindow(allEntries, nowMs, 7);
      } else if (selection === 'last_30d') {
        chosen = filterByWindow(allEntries, nowMs, 30);
      } else if (selection === 'ppl_test') {
        const sessionsDb = await readSessionsDb();
        const sprintIds =
          getMostRecentPplTestSprintIds({
            athleteId: props.athleteId,
            sessions: Object.values(sessionsDb.sessions),
          }) ?? [];

        chosen = sprintIds
          .map((id) => db.workouts[id])
          .filter((e): e is WorkoutEntry => Boolean(e))
          .filter((e) => !e.deletedAt)
          .filter((e) => e.metrics?.athleteId === props.athleteId);

        if (chosen.length === 0) {
          chosen = allEntries;
        }
      }

      const next = chosen
        .map(entryToPoint)
        .filter((p): p is ChartPoint => Boolean(p));
      if (!cancelled) setPoints(next);
    }

    void run();
    return () => {
      cancelled = true;
    };
  }, [props.mode, props.sessionEntries, props.athleteId, selection]);

  return (
    <Tile className="bg-white px-0 py-3 dark:bg-neutral-900">
      <View className="px-4">
        <View className="flex-row items-center justify-between">
          <Text className="text-base font-semibold">{props.title}</Text>

          <View className="flex-row items-center gap-2">
            {props.mode === 'athlete' ? (
              <View style={{ width: 132 }}>
                <Select
                  presentation="dropdown"
                  value={selection}
                  options={selectionOptions()}
                  onSelect={(v) => {
                    const next = v as ChartPointSelection;
                    props.onSelectionChange?.(next);
                    if (!props.selection) setInternalSelection(next);
                  }}
                  testID="chart-selection"
                />
              </View>
            ) : null}

            {bwAvailable ? (
              <Chip
                label="BW"
                active={showBw}
                onPress={() => setShowBw((v) => !v)}
                testID="bw-reference-toggle"
              />
            ) : null}
            {pplAvailable ? (
              <Chip
                label="PPL"
                active={showPpl}
                onPress={() => setShowPpl((v) => !v)}
                testID="ppl-marker-toggle"
              />
            ) : null}
          </View>
        </View>
      </View>

      <View className="mt-2">
        <LoadVelocityChart
          chrome="none"
          width={chartWidth}
          height={240}
          pplLoadKg={props.pplLoadKg}
          peakPowerW={props.peakPowerW}
          points={resolvedPoints}
          bodyWeightKg={props.bodyWeightKg ?? null}
          showBodyWeightReferenceLines={showBw}
          showPplMarker={showPpl}
        />
      </View>
    </Tile>
  );
}

function Chip({
  label,
  active,
  onPress,
  testID,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  testID?: string;
}) {
  return (
    <Pressable
      className="rounded-full border px-3 py-1"
      style={{
        backgroundColor: active ? 'rgba(0,0,0,0.08)' : 'rgba(0,0,0,0.04)',
        borderColor: active ? 'rgba(0,0,0,0.18)' : 'rgba(0,0,0,0.10)',
      }}
      onPress={onPress}
      testID={testID}
      accessibilityRole="button"
    >
      <Text className="text-xs font-extrabold tracking-wide text-neutral-900 dark:text-neutral-100">
        {label}
      </Text>
    </Pressable>
  );
}
