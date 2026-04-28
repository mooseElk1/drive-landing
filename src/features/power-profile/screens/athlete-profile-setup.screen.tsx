/* eslint-disable max-lines-per-function */
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useWindowDimensions } from 'react-native';
import { z } from 'zod';

import { Button, ControlledInput, Text, Tile, View } from '@/components/ui';
import { LoadVelocityChart } from '@/features/power-profile/components/load-velocity-chart';
import { readWorkoutDatabase } from '@/features/workout/services/workout-persistence';
import { translate } from '@/lib/i18n/utils';

import { useAthleteProfileStore } from '../store/athlete-profile-store';
import type { AthleteProfile } from '../types/athlete-profile';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  bodyWeightKg: z.string().optional(),
});

type FormType = z.infer<typeof schema>;

function parseOptionalKg(input: string | undefined): number | null {
  const trimmed = (input ?? '').trim();
  if (trimmed.length === 0) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  if (n <= 0 || n >= 500) return null;
  return n;
}

function createAthleteProfile(params: {
  name: string;
  bodyWeightKg: number | null;
}): AthleteProfile {
  const now = Date.now();
  const id = `athlete_${now}_${Math.random().toString(36).slice(2, 9)}`;
  return {
    id,
    name: params.name,
    bodyWeightKg: params.bodyWeightKg,
    createdAt: now,
    updatedAt: now,
    currentPPL: null,
    pplHistory: [],
    fvClassification: null,
    historyDepth: 'NEW',
    frictionActivationAcknowledged: false,
    incompleteDiscoverySessionId: null,
    historicalPeakPower: null,
    historicalPeakPowerLoad: null,
  };
}

export function AthleteProfileSetupScreen(): React.ReactElement {
  const router = useRouter();
  const { width } = useWindowDimensions();
  const { control, handleSubmit, reset } = useForm<FormType>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', bodyWeightKg: '' },
  });

  const athletes = useAthleteProfileStore((s) => s.athletes);
  const activeAthleteId = useAthleteProfileStore((s) => s.activeAthleteId);
  const upsertAthlete = useAthleteProfileStore((s) => s.upsertAthlete);
  const setActiveAthleteId = useAthleteProfileStore(
    (s) => s.setActiveAthleteId
  );

  const athlete = athletes[0] ?? null;
  const isCreateMode = !athlete;
  const [chartPoints, setChartPoints] = React.useState<
    React.ComponentProps<typeof LoadVelocityChart>['points']
  >([]);

  useEffect(() => {
    if (!athlete) {
      reset({ name: '', bodyWeightKg: '' });
      return;
    }
    reset({
      name: athlete.name,
      bodyWeightKg:
        typeof athlete.bodyWeightKg === 'number'
          ? `${athlete.bodyWeightKg}`
          : '',
    });
    if (!activeAthleteId) setActiveAthleteId(athlete.id);
  }, [activeAthleteId, athlete, reset, setActiveAthleteId]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      if (!athlete?.id) {
        if (!cancelled) setChartPoints([]);
        return;
      }
      const db = await readWorkoutDatabase();
      const entries = Object.values(db.workouts);
      const points = entries
        .filter((e) => Boolean(e) && !e.deletedAt)
        .filter((e) => e.metrics?.athleteId === athlete.id)
        .map((e) => ({
          id: e.id,
          loadKg: e.metrics?.loadKg ?? 0,
          peakVelocity: e.metrics?.peakVelocity ?? null,
          peakPowerW: e.metrics?.peakPower ?? null,
        }))
        .filter((p) => Number.isFinite(p.loadKg) && p.loadKg > 0);

      if (!cancelled) setChartPoints(points);
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [athlete?.id]);

  const onSubmit = ({ name, bodyWeightKg }: FormType) => {
    if (!athlete) {
      const created = createAthleteProfile({
        name,
        bodyWeightKg: parseOptionalKg(bodyWeightKg),
      });
      upsertAthlete(created);
      setActiveAthleteId(created.id);
      router.back();
      return;
    }
  };

  return (
    <View className="flex-1 p-4">
      <Tile className="bg-white dark:bg-neutral-900">
        <Text className="text-2xl font-bold">
          {translate(
            athlete
              ? 'powerProfile.profileSetup.titleEdit'
              : 'powerProfile.profileSetup.title'
          )}
        </Text>
        <Text className="mt-2 text-neutral-600 dark:text-neutral-300">
          {translate(
            athlete
              ? 'powerProfile.profileSetup.subtitleEdit'
              : 'powerProfile.profileSetup.subtitle'
          )}
        </Text>

        {isCreateMode ? (
          <View className="mt-4">
            <ControlledInput
              name="name"
              label={translate('powerProfile.profileSetup.fields.name')}
              control={control}
              testID="athlete-name"
              autoCapitalize="words"
            />

            <ControlledInput
              name="bodyWeightKg"
              label={translate('powerProfile.profileSetup.fields.bodyWeightKg')}
              control={control}
              testID="athlete-bodyweight"
              keyboardType="numeric"
            />

            <Button
              label={translate('powerProfile.profileSetup.actions.create')}
              testID="create-athlete"
              onPress={handleSubmit(onSubmit)}
            />
          </View>
        ) : (
          <View className="mt-4">
            <View className="flex-row items-center justify-between">
              <Text className="text-neutral-600 dark:text-neutral-300">
                {translate('powerProfile.profileSetup.fields.name')}
              </Text>
              <Text className="font-semibold">{athlete?.name}</Text>
            </View>

            <View className="mt-2 flex-row items-center justify-between">
              <Text className="text-neutral-600 dark:text-neutral-300">
                {translate('powerProfile.profileSetup.fields.bodyWeightKg')}
              </Text>
              <Text className="font-semibold">
                {athlete?.bodyWeightKg ? `${athlete.bodyWeightKg}` : '—'}
              </Text>
            </View>
          </View>
        )}
      </Tile>

      {athlete ? (
        <Tile className="mt-4 bg-white dark:bg-neutral-900">
          <Text className="text-xl font-semibold">
            {translate('powerProfile.profileSetup.powerProfile.title')}
          </Text>

          {chartPoints.length > 0 ? (
            <View className="mt-3 items-center">
              <LoadVelocityChart
                width={Math.min(340, width - 32)}
                height={260}
                points={chartPoints}
                pplLoadKg={athlete.currentPPL?.pplLoadKg ?? 0}
                peakPowerW={athlete.currentPPL?.peakPowerW ?? 0}
              />
            </View>
          ) : (
            <View className="mt-3">
              <Text className="text-neutral-600 dark:text-neutral-300">
                {'No sprint data yet'}
              </Text>
            </View>
          )}

          {athlete.historicalPeakPower !== null ? (
            <View className="mt-3 flex-row gap-3">
              <Tile
                variant="stat"
                className="bg-neutral-100 dark:bg-charcoal-900"
              >
                <Text className="text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                  {'All-Time Peak'}
                </Text>
                <Text className="text-2xl font-bold text-primary-400">
                  {Math.round(athlete.historicalPeakPower).toString()}
                </Text>
                <Text className="text-xs text-neutral-400 dark:text-neutral-500">
                  {'W'}
                </Text>
              </Tile>

              {athlete.historicalPeakPowerLoad !== null ? (
                <Tile
                  variant="stat"
                  className="bg-neutral-100 dark:bg-charcoal-900"
                >
                  <Text className="text-xs font-bold uppercase tracking-widest text-neutral-500 dark:text-neutral-400">
                    {'At Load'}
                  </Text>
                  <Text className="text-2xl font-bold text-neutral-900 dark:text-neutral-100">
                    {athlete.historicalPeakPowerLoad.toFixed(1)}
                  </Text>
                  <Text className="text-xs text-neutral-400 dark:text-neutral-500">
                    {'kg'}
                  </Text>
                </Tile>
              ) : null}
            </View>
          ) : null}

          {athlete.currentPPL ? (
            <View className="mt-3">
              <View className="flex-row items-center justify-between">
                <Text className="text-neutral-600 dark:text-neutral-300">
                  {translate(
                    'powerProfile.profileSetup.powerProfile.pplLoadKg'
                  )}
                </Text>
                <Text className="font-semibold">
                  {`${athlete.currentPPL.pplLoadKg}`}
                </Text>
              </View>

              <View className="mt-2 flex-row items-center justify-between">
                <Text className="text-neutral-600 dark:text-neutral-300">
                  {translate(
                    'powerProfile.profileSetup.powerProfile.peakPowerW'
                  )}
                </Text>
                <Text className="font-semibold">
                  {`${athlete.currentPPL.peakPowerW}`}
                </Text>
              </View>

              <View className="mt-2 flex-row items-center justify-between">
                <Text className="text-neutral-600 dark:text-neutral-300">
                  {translate('powerProfile.profileSetup.powerProfile.mode')}
                </Text>
                <Text className="font-semibold">
                  {athlete.currentPPL.powerMeasurementMode}
                </Text>
              </View>

              <View className="mt-2 flex-row items-center justify-between">
                <Text className="text-neutral-600 dark:text-neutral-300">
                  {translate('powerProfile.profileSetup.powerProfile.updated')}
                </Text>
                <Text className="font-semibold">
                  {new Date(athlete.currentPPL.timestamp).toLocaleDateString()}
                </Text>
              </View>
            </View>
          ) : (
            <View className="mt-3">
              <Text className="text-neutral-600 dark:text-neutral-300">
                {translate('powerProfile.profileSetup.powerProfile.empty')}
              </Text>
              <Button
                className="mt-3"
                testID="power-profile-cta"
                label={translate('powerProfile.profileSetup.powerProfile.cta')}
                onPress={() => router.push('/workout')}
              />
            </View>
          )}
        </Tile>
      ) : null}
    </View>
  );
}
