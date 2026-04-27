import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'expo-router';
import React from 'react';
import { useForm } from 'react-hook-form';
import { z } from 'zod';

import { Button, ControlledInput, Text, Tile, View } from '@/components/ui';
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
  const { control, handleSubmit } = useForm<FormType>({
    resolver: zodResolver(schema),
    defaultValues: { name: '', bodyWeightKg: '' },
  });

  const athletes = useAthleteProfileStore((s) => s.athletes);
  const upsertAthlete = useAthleteProfileStore((s) => s.upsertAthlete);
  const setActiveAthleteId = useAthleteProfileStore(
    (s) => s.setActiveAthleteId
  );

  const onSubmit = ({ name, bodyWeightKg }: FormType) => {
    if (athletes.length > 0) return;
    const athlete = createAthleteProfile({
      name,
      bodyWeightKg: parseOptionalKg(bodyWeightKg),
    });
    upsertAthlete(athlete);
    setActiveAthleteId(athlete.id);
    router.back();
  };

  return (
    <View className="flex-1 p-4">
      <Tile className="bg-white dark:bg-neutral-900">
        <Text className="text-2xl font-bold">
          {translate('powerProfile.profileSetup.title')}
        </Text>
        <Text className="mt-2 text-neutral-600 dark:text-neutral-300">
          {athletes.length > 0
            ? translate('powerProfile.profileSetup.singleProfileNotice')
            : translate('powerProfile.profileSetup.subtitle')}
        </Text>

        <View className="mt-4">
          <ControlledInput
            name="name"
            label={translate('powerProfile.profileSetup.fields.name')}
            control={control}
            testID="athlete-name"
            autoCapitalize="words"
            editable={athletes.length === 0}
          />

          <ControlledInput
            name="bodyWeightKg"
            label={translate('powerProfile.profileSetup.fields.bodyWeightKg')}
            control={control}
            testID="athlete-bodyweight"
            keyboardType="numeric"
            editable={athletes.length === 0}
          />

          <Button
            label={translate('powerProfile.profileSetup.actions.create')}
            testID="create-athlete"
            onPress={handleSubmit(onSubmit)}
            disabled={athletes.length > 0}
          />
        </View>
      </Tile>
    </View>
  );
}
