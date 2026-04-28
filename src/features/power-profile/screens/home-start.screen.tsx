import { useRouter } from 'expo-router';
import React from 'react';

import { Button, Checkbox, Select, Text, Tile, View } from '@/components/ui';
import { translate } from '@/lib/i18n/utils';

import { useAthleteProfileStore } from '../store/athlete-profile-store';
import { usePowerSessionStore } from '../store/power-session-store';
import type { PowerProfileSessionMode } from '../types/power-session';
import { TrainingZone } from '../types/training-zones';

function createSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

type StartMode = 'training' | 'test';

function HomeShell({
  children,
}: {
  children: React.ReactNode;
}): React.ReactElement {
  return <View className="flex-1 p-4">{children}</View>;
}

function NoAthleteCard({ onCreate }: { onCreate: () => void }) {
  return (
    <HomeShell>
      <Tile className="bg-white dark:bg-neutral-900">
        <Text className="text-2xl font-bold">
          {translate('powerProfile.home.title')}
        </Text>
        <Text className="mt-2 text-neutral-600 dark:text-neutral-300">
          {translate('powerProfile.home.noAthlete')}
        </Text>
        <Button
          className="mt-4"
          testID="home-create-profile"
          label={translate('powerProfile.home.createProfile')}
          onPress={onCreate}
        />
      </Tile>
    </HomeShell>
  );
}

function ActiveSessionCard({ onResume }: { onResume: () => void }) {
  return (
    <HomeShell>
      <Tile className="bg-white dark:bg-neutral-900">
        <Text className="text-2xl font-bold">
          {translate('powerProfile.home.title')}
        </Text>
        <Text className="mt-2 text-neutral-600 dark:text-neutral-300">
          {translate('powerProfile.home.activeSession')}
        </Text>
        <Button
          className="mt-4"
          testID="home-resume-session"
          label={translate('powerProfile.home.resume')}
          onPress={onResume}
        />
      </Tile>
    </HomeShell>
  );
}

function ModeCards({
  mode,
  setMode,
}: {
  mode: StartMode;
  setMode: (m: StartMode) => void;
}) {
  return (
    <View className="mt-4 flex-row gap-3">
      <Tile
        pressable
        testID="mode-training"
        onPress={() => setMode('training')}
        className={`flex-1 border ${
          mode === 'training'
            ? 'border-primary-400 bg-primary-50 dark:bg-neutral-800'
            : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900'
        }`}
      >
        <Text className="text-lg font-semibold">
          {translate('powerProfile.home.modes.training')}
        </Text>
      </Tile>

      <Tile
        pressable
        testID="mode-test"
        onPress={() => setMode('test')}
        className={`flex-1 border ${
          mode === 'test'
            ? 'border-primary-400 bg-primary-50 dark:bg-neutral-800'
            : 'border-neutral-200 bg-white dark:border-neutral-700 dark:bg-neutral-900'
        }`}
      >
        <Text className="text-lg font-semibold">
          {translate('powerProfile.home.modes.test')}
        </Text>
      </Tile>
    </View>
  );
}

function TrainingForm({
  peakPowerHint,
  selectedZone,
  setSelectedZone,
  zoneOptions,
  suggestionsOn,
  setSuggestionsOn,
  onStart,
}: {
  peakPowerHint: string;
  selectedZone: string | number;
  setSelectedZone: (v: string | number) => void;
  zoneOptions: { label: string; value: string | number }[];
  suggestionsOn: boolean;
  setSuggestionsOn: (v: boolean) => void;
  onStart: () => void;
}) {
  return (
    <View className="mt-4">
      <Text className="mb-2 text-neutral-600 dark:text-neutral-300">
        {peakPowerHint}
      </Text>

      <Select
        label={translate('powerProfile.home.training.targetZone')}
        value={selectedZone}
        options={zoneOptions}
        onSelect={(v) => setSelectedZone(v)}
        testID="home-zone"
      />

      <Checkbox.Root
        checked={suggestionsOn}
        onChange={setSuggestionsOn}
        accessibilityLabel={translate(
          'powerProfile.sessionStart.suggestions.aria'
        )}
        className="mb-4"
        testID="home-suggestions"
      >
        <Checkbox.Icon checked={suggestionsOn} />
        <Checkbox.Label
          text={translate('powerProfile.sessionStart.suggestions.label')}
          className="dark:text-neutral-100"
        />
      </Checkbox.Root>

      <Button
        testID="home-start-training"
        label={translate('powerProfile.home.startTraining')}
        onPress={onStart}
      />
    </View>
  );
}

function TestForm({ onStart }: { onStart: () => void }) {
  return (
    <View className="mt-4">
      <Text className="mb-4 text-neutral-600 dark:text-neutral-300">
        {translate('powerProfile.home.test.description')}
      </Text>
      <Button
        testID="home-start-test"
        label={translate('powerProfile.home.test.start')}
        onPress={onStart}
      />
    </View>
  );
}

function useDefaultZone(
  athlete: { historicalPeakPower: number | null } | null
) {
  return athlete?.historicalPeakPower != null ? TrainingZone.PEAK_POWER : null;
}

function buildPeakPowerHint(params: {
  historicalPeakPower: number | null | undefined;
  historicalPeakPowerLoad: number | null | undefined;
}) {
  if (params.historicalPeakPower == null) {
    return translate('powerProfile.home.training.defaultFree');
  }
  const loadSuffix =
    params.historicalPeakPowerLoad != null
      ? ` @ ${params.historicalPeakPowerLoad} kg`
      : '';
  return translate('powerProfile.home.training.defaultPeakPower', {
    power: params.historicalPeakPower,
    loadKg: loadSuffix,
  });
}

function useHomeStores() {
  const router = useRouter();
  const athletes = useAthleteProfileStore((s) => s.athletes);
  const activeAthleteId = useAthleteProfileStore((s) => s.activeAthleteId);
  const setActiveAthleteId = useAthleteProfileStore(
    (s) => s.setActiveAthleteId
  );
  const sessionId = usePowerSessionStore((s) => s.sessionId);
  const startSession = usePowerSessionStore((s) => s.startSession);
  const loadSuggestionsEnabled = usePowerSessionStore(
    (s) => s.loadSuggestionsEnabled
  );

  const athlete = athletes[0] ?? null;
  const hasAthlete = Boolean(activeAthleteId ?? athlete?.id);

  return {
    router,
    athlete,
    hasAthlete,
    sessionId,
    startSession,
    activeAthleteId,
    setActiveAthleteId,
    loadSuggestionsEnabled,
  };
}

function useTrainingZoneOptions() {
  return React.useMemo(
    () => [
      {
        label: translate('powerProfile.home.training.zones.free'),
        value: 'none',
      },
      {
        label: translate('powerProfile.home.training.zones.peakPower'),
        value: TrainingZone.PEAK_POWER,
      },
      {
        label: translate('powerProfile.home.training.zones.strengthSpeed'),
        value: TrainingZone.STRENGTH_SPEED,
      },
      {
        label: translate('powerProfile.home.training.zones.overload'),
        value: TrainingZone.OVERLOAD,
      },
    ],
    []
  );
}

function useStartHandler(params: {
  router: ReturnType<typeof useRouter>;
  athleteId: string | null;
  hasActiveAthleteId: boolean;
  setActiveAthleteId: (id: string) => void;
  startSession: (p: {
    sessionId: string;
    athleteId: string | null;
    sessionMode: PowerProfileSessionMode;
    targetZone: TrainingZone | null;
    loadSuggestionsEnabled: boolean;
  }) => void;
  selectedZone: string | number;
  suggestionsOn: boolean;
}) {
  return React.useCallback(
    (sessionMode: PowerProfileSessionMode) => {
      if (!params.athleteId) return;
      if (!params.hasActiveAthleteId)
        params.setActiveAthleteId(params.athleteId);

      params.startSession({
        sessionId: createSessionId(),
        athleteId: params.athleteId,
        sessionMode,
        targetZone:
          sessionMode === 'test'
            ? null
            : params.selectedZone === 'none'
              ? null
              : (params.selectedZone as TrainingZone),
        loadSuggestionsEnabled:
          sessionMode === 'test' ? false : params.suggestionsOn,
      });

      params.router.push('/workout');
    },
    [params]
  );
}

function useHomeStartModel() {
  const stores = useHomeStores();

  const defaultZone: TrainingZone | null = useDefaultZone(
    stores.athlete
      ? { historicalPeakPower: stores.athlete.historicalPeakPower ?? null }
      : null
  );

  const [mode, setMode] = React.useState<StartMode>('training');
  const [selectedZone, setSelectedZone] = React.useState<string | number>(
    defaultZone ?? 'none'
  );
  const [suggestionsOn, setSuggestionsOn] = React.useState<boolean>(
    stores.loadSuggestionsEnabled
  );

  React.useEffect(() => {
    if (defaultZone && selectedZone === 'none') setSelectedZone(defaultZone);
  }, [defaultZone, selectedZone]);

  const zoneOptions = useTrainingZoneOptions();

  const peakPowerHint = buildPeakPowerHint({
    historicalPeakPower: stores.athlete?.historicalPeakPower,
    historicalPeakPowerLoad: stores.athlete?.historicalPeakPowerLoad,
  });

  const athleteId = stores.activeAthleteId ?? stores.athlete?.id ?? null;
  const start = useStartHandler({
    router: stores.router,
    athleteId,
    hasActiveAthleteId: Boolean(stores.activeAthleteId),
    setActiveAthleteId: stores.setActiveAthleteId,
    startSession: stores.startSession,
    selectedZone,
    suggestionsOn,
  });

  return {
    router: stores.router,
    hasAthlete: stores.hasAthlete,
    sessionId: stores.sessionId,
    mode,
    setMode,
    selectedZone,
    setSelectedZone,
    zoneOptions,
    suggestionsOn,
    setSuggestionsOn,
    peakPowerHint,
    start,
  };
}

function HomeStartView(model: ReturnType<typeof useHomeStartModel>) {
  if (!model.hasAthlete) {
    return (
      <NoAthleteCard onCreate={() => model.router.push('/profile-setup')} />
    );
  }

  if (model.sessionId) {
    return <ActiveSessionCard onResume={() => model.router.push('/workout')} />;
  }

  return (
    <HomeShell>
      <Tile className="bg-white dark:bg-neutral-900">
        <Text className="text-2xl font-bold">
          {translate('powerProfile.home.title')}
        </Text>
        <Text className="mt-2 text-neutral-600 dark:text-neutral-300">
          {translate('powerProfile.home.subtitle')}
        </Text>

        <ModeCards mode={model.mode} setMode={model.setMode} />

        {model.mode === 'training' ? (
          <TrainingForm
            peakPowerHint={model.peakPowerHint}
            selectedZone={model.selectedZone}
            setSelectedZone={model.setSelectedZone}
            zoneOptions={model.zoneOptions}
            suggestionsOn={model.suggestionsOn}
            setSuggestionsOn={model.setSuggestionsOn}
            onStart={() => model.start('training')}
          />
        ) : (
          <TestForm onStart={() => model.start('test')} />
        )}
      </Tile>
    </HomeShell>
  );
}

export function HomeStartScreen(): React.ReactElement {
  const model = useHomeStartModel();
  return HomeStartView(model);
}
