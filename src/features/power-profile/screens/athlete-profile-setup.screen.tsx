/* eslint-disable max-lines-per-function */
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { useWindowDimensions } from 'react-native';
import { z } from 'zod';

import {
  Button,
  ControlledInput,
  ControlledSelect,
  Text,
  Tile,
  View,
} from '@/components/ui';
import { PowerProfileChartCard } from '@/features/power-profile/components/power-profile-chart-card';
import { STRENGTH_STANDARDS } from '@/features/power-profile/constants';
import { translate } from '@/lib/i18n/utils';

import { useAthleteProfileStore } from '../store/athlete-profile-store';
import type { AthleteProfile } from '../types/athlete-profile';
import { resolveChartAnchor } from '../utils/resolve-chart-anchor';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  bodyWeightKg: z.string().optional(),
  sex: z.enum(['male', 'female']).optional(),
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
  sex: 'male' | 'female' | null;
}): AthleteProfile {
  const now = Date.now();
  const id = `athlete_${now}_${Math.random().toString(36).slice(2, 9)}`;
  return {
    id,
    name: params.name,
    bodyWeightKg: params.bodyWeightKg,
    sex: params.sex,
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
  useWindowDimensions();
  const { control, handleSubmit, reset } = useForm<FormType>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', bodyWeightKg: '', sex: undefined },
  });

  const athletes = useAthleteProfileStore((s) => s.athletes);
  const activeAthleteId = useAthleteProfileStore((s) => s.activeAthleteId);
  const upsertAthlete = useAthleteProfileStore((s) => s.upsertAthlete);
  const setActiveAthleteId = useAthleteProfileStore(
    (s) => s.setActiveAthleteId
  );

  const athlete = athletes[0] ?? null;
  const isCreateMode = !athlete;
  const chartAnchor = resolveChartAnchor(athlete);

  useEffect(() => {
    if (!athlete) {
      reset({ name: '', bodyWeightKg: '', sex: undefined });
      return;
    }
    reset({
      name: athlete.name,
      bodyWeightKg:
        typeof athlete.bodyWeightKg === 'number'
          ? `${athlete.bodyWeightKg}`
          : '',
      sex: athlete.sex ?? undefined,
    });
    if (!activeAthleteId) setActiveAthleteId(athlete.id);
  }, [activeAthleteId, athlete, reset, setActiveAthleteId]);

  function getStrengthTierLabel(params: {
    sex: 'male' | 'female';
    pplToBw: number;
  }): string | null {
    const tiers = STRENGTH_STANDARDS[params.sex];
    if (params.pplToBw >= tiers.elite) return 'Elite';
    if (params.pplToBw >= tiers.advanced) return 'Advanced';
    if (params.pplToBw >= tiers.trained) return 'Trained';
    return 'Developing';
  }

  const onSubmit = ({ name, bodyWeightKg, sex }: FormType) => {
    if (!athlete) {
      const created = createAthleteProfile({
        name,
        bodyWeightKg: parseOptionalKg(bodyWeightKg),
        sex: sex ?? null,
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

            <ControlledSelect
              name="sex"
              label={'Sex'}
              control={control}
              testID="athlete-sex"
              placeholder="Select…"
              options={[
                { label: 'Male', value: 'male' },
                { label: 'Female', value: 'female' },
              ]}
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

            <View className="mt-2 flex-row items-center justify-between">
              <Text className="text-neutral-600 dark:text-neutral-300">
                {'Sex'}
              </Text>
              <Text className="font-semibold">
                {athlete?.sex === 'male'
                  ? 'Male'
                  : athlete?.sex === 'female'
                    ? 'Female'
                    : '—'}
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

          <View className="mt-3">
            <PowerProfileChartCard
              title={'Power Profile'}
              mode="athlete"
              athleteId={athlete.id}
              bodyWeightKg={athlete.bodyWeightKg}
              pplLoadKg={chartAnchor.anchorLoadKg}
              peakPowerW={chartAnchor.anchorPeakPowerW}
            />
          </View>

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

              {athlete.currentPPL.pplAsPctBW !== null ? (
                <View className="mt-2 flex-row items-center justify-between">
                  <Text className="text-neutral-600 dark:text-neutral-300">
                    {'PPL as %BW'}
                  </Text>
                  <View className="flex-row items-center gap-2">
                    <Text className="font-semibold">
                      {`${athlete.currentPPL.pplAsPctBW.toFixed(1)}%`}
                    </Text>
                    {athlete.sex &&
                    athlete.bodyWeightKg &&
                    athlete.bodyWeightKg > 0 ? (
                      <Tile className="bg-neutral-100 px-2 py-1 dark:bg-charcoal-900">
                        <Text className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">
                          {getStrengthTierLabel({
                            sex: athlete.sex,
                            pplToBw:
                              athlete.currentPPL.pplLoadKg /
                              athlete.bodyWeightKg,
                          })}
                        </Text>
                      </Tile>
                    ) : null}
                  </View>
                </View>
              ) : null}

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
