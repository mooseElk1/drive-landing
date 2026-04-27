/* eslint-disable max-lines-per-function */
import React from 'react';

import { Button, Checkbox, Select, Text, Tile, View } from '@/components/ui';
import { translate } from '@/lib/i18n/utils';

import { saveSession } from '../services/power-profile-persistence';
import { useAthleteProfileStore } from '../store/athlete-profile-store';
import { usePowerSessionStore } from '../store/power-session-store';
import type { PowerProfileSessionMode } from '../types/power-session';
import { TrainingZone } from '../types/training-zones';

function createSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

export function SessionStartScreen(): React.ReactElement {
  const athletes = useAthleteProfileStore((s) => s.athletes);
  const activeAthleteId = useAthleteProfileStore((s) => s.activeAthleteId);
  const setActiveAthleteId = useAthleteProfileStore(
    (s) => s.setActiveAthleteId
  );

  const startSession = usePowerSessionStore((s) => s.startSession);
  const discardSession = usePowerSessionStore((s) => s.discardSession);
  const sessionId = usePowerSessionStore((s) => s.sessionId);
  const athleteId = usePowerSessionStore((s) => s.athleteId);
  const startedAt = usePowerSessionStore((s) => s.startedAt);
  const sprintIds = usePowerSessionStore((s) => s.sprintIds);
  const targetZone = usePowerSessionStore((s) => s.targetZone);
  const loadSuggestionsEnabled = usePowerSessionStore(
    (s) => s.loadSuggestionsEnabled
  );

  const [mode] = React.useState<PowerProfileSessionMode>('training');

  const zoneOptions = React.useMemo(
    () => [
      {
        label: translate('powerProfile.sessionStart.zones.none'),
        value: 'none',
      },
      {
        label: translate('powerProfile.sessionStart.zones.speedStrength'),
        value: TrainingZone.SPEED_STRENGTH,
      },
      {
        label: translate('powerProfile.sessionStart.zones.peakPower'),
        value: TrainingZone.PEAK_POWER,
      },
      {
        label: translate('powerProfile.sessionStart.zones.strengthSpeed'),
        value: TrainingZone.STRENGTH_SPEED,
      },
      {
        label: translate('powerProfile.sessionStart.zones.overload'),
        value: TrainingZone.OVERLOAD,
      },
    ],
    []
  );

  const athleteOptions = React.useMemo(
    () => [
      {
        label: translate('powerProfile.sessionStart.athlete.guest'),
        value: 'guest',
      },
      ...athletes.map((a) => ({ label: a.name, value: a.id })),
    ],
    [athletes]
  );

  const [selectedAthlete, setSelectedAthlete] = React.useState<string>(
    activeAthleteId ?? 'guest'
  );
  const [selectedZone, setSelectedZone] = React.useState<string | number>(
    targetZone ?? 'none'
  );
  const [suggestionsOn, setSuggestionsOn] = React.useState<boolean>(
    loadSuggestionsEnabled
  );

  const handleStart = () => {
    const finalAthleteId = selectedAthlete === 'guest' ? null : selectedAthlete;
    setActiveAthleteId(finalAthleteId);

    startSession({
      sessionId: createSessionId(),
      athleteId: finalAthleteId,
      sessionMode: mode,
      targetZone:
        selectedZone === 'none' ? null : (selectedZone as TrainingZone),
      loadSuggestionsEnabled: suggestionsOn,
    });
  };

  const handleEndSession = async () => {
    if (!sessionId || !startedAt) return;

    await saveSession({
      sessionId,
      athleteId,
      sprintIds,
      startedAt,
      completedAt: Date.now(),
      testStatus: 'not_a_test',
      testMode: null,
      targetZone: targetZone ?? null,
      loadSuggestionsEnabled,
      sessionPeakPower: null,
      sessionPPLEstimate: null,
    });

    discardSession();
  };

  return (
    <View className="flex-1 p-4">
      <Tile className="bg-white dark:bg-neutral-900">
        <Text className="text-2xl font-bold">
          {translate('powerProfile.sessionStart.title')}
        </Text>
        <Text className="mt-2 text-neutral-600 dark:text-neutral-300">
          {translate('powerProfile.sessionStart.subtitle')}
        </Text>

        <View className="mt-4">
          <Select
            label={translate('powerProfile.sessionStart.athlete.label')}
            value={selectedAthlete}
            options={athleteOptions}
            onSelect={(v) => setSelectedAthlete(String(v))}
            testID="session-athlete"
          />

          <Select
            label={translate('powerProfile.sessionStart.zone.label')}
            value={selectedZone}
            options={zoneOptions}
            onSelect={(v) => setSelectedZone(v)}
            testID="session-zone"
          />

          <Checkbox.Root
            checked={suggestionsOn}
            onChange={setSuggestionsOn}
            accessibilityLabel={translate(
              'powerProfile.sessionStart.suggestions.aria'
            )}
            className="mb-4"
            testID="session-suggestions"
          >
            <Checkbox.Icon checked={suggestionsOn} />
            <Checkbox.Label
              text={translate('powerProfile.sessionStart.suggestions.label')}
              className="dark:text-neutral-100"
            />
          </Checkbox.Root>

          <Button
            label={translate('powerProfile.sessionStart.actions.start')}
            testID="start-session"
            onPress={handleStart}
          />

          {sessionId ? (
            <View className="mt-3">
              <Button
                label={translate('powerProfile.sessionStart.actions.end')}
                testID="end-session"
                onPress={() => void handleEndSession()}
              />
            </View>
          ) : null}
        </View>
      </Tile>
    </View>
  );
}
