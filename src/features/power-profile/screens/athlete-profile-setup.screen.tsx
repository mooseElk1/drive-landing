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
  SegmentedControl,
  Text,
  Tile,
  View,
} from '@/components/ui';
import { STRENGTH_STANDARDS } from '@/features/power-profile/constants';
import { translate } from '@/lib/i18n/utils';
import { formatMassForUnit, lbsToKg, type MassUnit } from '@/lib/mass-units';
import { useUnitPreferencesStore } from '@/store/unit-preferences';

import { useAthleteProfileStore } from '../store/athlete-profile-store';
import type { AthleteProfile } from '../types/athlete-profile';

const schema = z.object({
  name: z.string().min(1, 'Name is required'),
  bodyWeightKg: z.string().optional(),
  sex: z.enum(['male', 'female']).optional(),
});

type FormType = z.infer<typeof schema>;

function parseOptionalMassToKg(params: {
  input: string | undefined;
  unit: MassUnit;
}): number | null {
  const { input, unit } = params;
  const trimmed = (input ?? '').trim();
  if (trimmed.length === 0) return null;
  const n = Number(trimmed);
  if (!Number.isFinite(n)) return null;
  if (n <= 0) return null;

  if (unit === 'kg') {
    if (n >= 500) return null;
    return n;
  }

  // lbs
  if (n >= 1102) return null;
  return lbsToKg(n);
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
  const massUnit = useUnitPreferencesStore((s) => s.massUnit);
  const setMassUnit = useUnitPreferencesStore((s) => s.setMassUnit);

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

  useEffect(() => {
    if (!athlete) {
      reset({ name: '', bodyWeightKg: '', sex: undefined });
      return;
    }
    reset({
      name: athlete.name,
      bodyWeightKg:
        typeof athlete.bodyWeightKg === 'number'
          ? formatMassForUnit(athlete.bodyWeightKg, massUnit)
          : '',
      sex: athlete.sex ?? undefined,
    });
    if (!activeAthleteId) setActiveAthleteId(athlete.id);
  }, [activeAthleteId, athlete, massUnit, reset, setActiveAthleteId]);

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
        bodyWeightKg: parseOptionalMassToKg({
          input: bodyWeightKg,
          unit: massUnit,
        }),
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

            <View className="my-2">
              <SegmentedControl<MassUnit>
                size="sm"
                value={massUnit}
                options={[
                  { value: 'kg', label: 'kg' },
                  { value: 'lbs', label: 'lbs' },
                ]}
                onChange={(next) => {
                  setMassUnit(next);
                  // In create mode there is no stored athlete BW; preserve user typing.
                }}
                testID="athlete-bodyweight-unit-toggle"
              />
            </View>

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
                {typeof athlete?.bodyWeightKg === 'number'
                  ? `${formatMassForUnit(athlete.bodyWeightKg, massUnit)} ${massUnit}`
                  : '—'}
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
        <>
          <Tile
            pressable
            className="mt-3 bg-primary-400 dark:bg-primary-400"
            onPress={() => router.push('/power-profile')}
            testID="view-analytics-cta"
          >
            <Text className="text-lg font-bold text-white">
              {'View analytics'}
            </Text>
            <Text className="mt-1 text-white/90">
              {'Power Profile dashboard'}
            </Text>
          </Tile>

          <Tile className="mt-3 bg-white dark:bg-neutral-900">
            {athlete.currentPPL ? (
              <View className="mt-3">
                {athlete.currentPPL.estimateSource === 'organic_pb' &&
                (athlete.currentPPL.loadBracketed ?? false) === false ? (
                  <Text className="mb-3 text-sm text-neutral-600 dark:text-neutral-300">
                    {
                      'Low confidence PPL — try one lighter and one heavier load to confirm your peak.'
                    }
                  </Text>
                ) : null}
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
                    {translate(
                      'powerProfile.profileSetup.powerProfile.updated'
                    )}
                  </Text>
                  <Text className="font-semibold">
                    {new Date(
                      athlete.currentPPL.timestamp
                    ).toLocaleDateString()}
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
                  label={translate(
                    'powerProfile.profileSetup.powerProfile.cta'
                  )}
                  onPress={() => router.push('/workout')}
                />
              </View>
            )}
          </Tile>
        </>
      ) : null}
    </View>
  );
}
