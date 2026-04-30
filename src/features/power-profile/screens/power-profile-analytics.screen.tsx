/* eslint-disable max-lines-per-function */
import { useRouter } from 'expo-router';
import React from 'react';

import { Button, Text, Tile, View } from '@/components/ui';
import { PowerProfileChartCard } from '@/features/power-profile/components/power-profile-chart-card';
import {
  type ChartPointSelection,
  computePeakPowerAndLoad,
  selectAthleteEntries,
} from '@/features/power-profile/services/chart-point-selection-service';
import { readSessionsDb } from '@/features/power-profile/services/power-profile-persistence';
import { useAthleteProfileStore } from '@/features/power-profile/store/athlete-profile-store';
import { readWorkoutDatabase } from '@/features/workout/services/workout-persistence';

import { resolveChartAnchor } from '../utils/resolve-chart-anchor';

function peakLabel(sel: ChartPointSelection): string {
  switch (sel) {
    case 'all_time':
      return 'All-Time Peak';
    case 'ppl_test':
      return 'Peak (PPL Test)';
    case 'last_7d':
      return 'Peak (Last 7d)';
    case 'last_30d':
      return 'Peak (Last 30d)';
  }
}

export function PowerProfileAnalyticsScreen(): React.ReactElement {
  const router = useRouter();
  const activeAthleteId = useAthleteProfileStore((s) => s.activeAthleteId);
  const getAthleteById = useAthleteProfileStore((s) => s.getAthleteById);
  const athlete = activeAthleteId ? getAthleteById(activeAthleteId) : null;

  const chartAnchor = resolveChartAnchor(athlete);
  const [selection, setSelection] =
    React.useState<ChartPointSelection>('ppl_test');
  const [selectedPoints, setSelectedPoints] = React.useState<
    React.ComponentProps<typeof PowerProfileChartCard>['points']
  >([]);
  const [selectedPeak, setSelectedPeak] = React.useState<{
    peakPowerW: number;
    loadKg: number;
  } | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!athlete?.id) {
        if (!cancelled) {
          setSelectedPoints([]);
          setSelectedPeak(null);
        }
        return;
      }

      const nowMs = Date.now();
      const [workoutDb, sessionsDb] = await Promise.all([
        readWorkoutDatabase(),
        readSessionsDb(),
      ]);

      const allEntries = Object.values(workoutDb.workouts).filter(Boolean);
      const chosen = selectAthleteEntries({
        athleteId: athlete.id,
        selection,
        sessions: Object.values(sessionsDb.sessions),
        entries: allEntries,
        nowMs,
      });

      const nextPoints = chosen
        .map((e) => ({
          id: e.id,
          loadKg: e.metrics?.loadKg ?? 0,
          peakVelocity: e.metrics?.peakVelocity ?? null,
          peakPowerW: e.metrics?.peakPower ?? null,
        }))
        .filter((p) => Number.isFinite(p.loadKg) && p.loadKg > 0);

      const peak = computePeakPowerAndLoad(chosen);
      if (!cancelled) {
        setSelectedPoints(nextPoints);
        setSelectedPeak(peak);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [athlete?.id, selection]);

  if (!athlete) {
    return (
      <View className="flex-1 p-4">
        <Tile className="bg-white dark:bg-neutral-900">
          <Text className="text-xl font-bold">{'Power Profile'}</Text>
          <Text className="mt-2 text-neutral-600 dark:text-neutral-300">
            {'Create an athlete profile to view analytics.'}
          </Text>
          <Button
            className="mt-3"
            label={'Create profile'}
            onPress={() => router.push('/profile-setup')}
          />
        </Tile>
      </View>
    );
  }

  return (
    <View className="flex-1 p-4">
      <PowerProfileChartCard
        title={'Power Profile'}
        mode="athlete"
        athleteId={athlete.id}
        bodyWeightKg={athlete.bodyWeightKg}
        pplLoadKg={chartAnchor.anchorLoadKg}
        peakPowerW={chartAnchor.anchorPeakPowerW}
        selection={selection}
        onSelectionChange={setSelection}
        points={selectedPoints}
      />

      {selectedPeak ? (
        <View className="mt-3 flex-row gap-3">
          <Tile variant="stat" className="bg-white dark:bg-neutral-900">
            <Text className="text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
              {peakLabel(selection)}
            </Text>
            <Text className="text-2xl font-bold text-primary-400">
              {Math.round(selectedPeak.peakPowerW).toString()}
            </Text>
            <Text className="text-xs text-neutral-400 dark:text-neutral-500">
              {'W'}
            </Text>
          </Tile>

          <Tile variant="stat" className="bg-white dark:bg-neutral-900">
            <Text className="text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
              {'At Load'}
            </Text>
            <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
              {selectedPeak.loadKg.toFixed(1)}
            </Text>
            <Text className="text-xs text-neutral-400 dark:text-neutral-500">
              {'kg'}
            </Text>
          </Tile>
        </View>
      ) : null}
    </View>
  );
}
