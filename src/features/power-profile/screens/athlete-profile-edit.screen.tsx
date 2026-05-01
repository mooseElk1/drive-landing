/* eslint-disable max-lines-per-function */
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import React, { useEffect } from 'react';
import { useForm } from 'react-hook-form';
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
import { translate } from '@/lib/i18n/utils';
import { formatMassForUnit, lbsToKg, type MassUnit } from '@/lib/mass-units';
import { useUnitPreferencesStore } from '@/store/unit-preferences';

import { useAthleteProfileStore } from '../store/athlete-profile-store';

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

export function AthleteProfileEditScreen(): React.ReactElement {
  const router = useRouter();
  const athlete = useAthleteProfileStore((s) => s.athletes[0] ?? null);
  const upsertAthlete = useAthleteProfileStore((s) => s.upsertAthlete);
  const massUnit = useUnitPreferencesStore((s) => s.massUnit);
  const setMassUnit = useUnitPreferencesStore((s) => s.setMassUnit);

  const { control, handleSubmit, reset, setValue } = useForm<FormType>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', bodyWeightKg: '', sex: undefined },
  });

  useEffect(() => {
    if (!athlete) return;
    reset({
      name: athlete.name,
      bodyWeightKg:
        typeof athlete.bodyWeightKg === 'number'
          ? formatMassForUnit(athlete.bodyWeightKg, massUnit)
          : '',
      sex: athlete.sex ?? undefined,
    });
  }, [athlete, massUnit, reset]);

  if (!athlete) {
    return (
      <View className="flex-1 p-4">
        <Tile className="bg-white dark:bg-neutral-900">
          <Text className="text-neutral-600 dark:text-neutral-300">
            {translate('powerProfile.profileSetup.noAthlete')}
          </Text>
          <Button
            className="mt-3"
            label={translate('powerProfile.profileSetup.actions.goToProfile')}
            onPress={() => router.replace('/profile-setup')}
          />
        </Tile>
      </View>
    );
  }

  const onSave = ({ name, bodyWeightKg, sex }: FormType) => {
    const now = Date.now();
    upsertAthlete({
      ...athlete,
      name,
      bodyWeightKg: parseOptionalMassToKg({
        input: bodyWeightKg,
        unit: massUnit,
      }),
      sex: sex ?? null,
      updatedAt: now,
    });
    router.replace('/profile-setup');
  };

  return (
    <View className="flex-1 p-4">
      <Tile className="bg-white dark:bg-neutral-900">
        <Text className="text-2xl font-bold">
          {translate('powerProfile.profileSetup.editTitle')}
        </Text>

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
                if (typeof athlete.bodyWeightKg === 'number') {
                  setValue(
                    'bodyWeightKg',
                    formatMassForUnit(athlete.bodyWeightKg, next),
                    { shouldDirty: false }
                  );
                }
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

          <View className="mt-2 flex-row gap-3">
            <View className="flex-1">
              <Button
                variant="secondary"
                testID="cancel-edit"
                label={translate('powerProfile.common.cancel')}
                onPress={() => router.replace('/profile-setup')}
              />
            </View>
            <View className="flex-1">
              <Button
                testID="save-edit"
                label={translate('powerProfile.profileSetup.actions.save')}
                onPress={handleSubmit(onSave)}
              />
            </View>
          </View>
        </View>
      </Tile>
    </View>
  );
}
