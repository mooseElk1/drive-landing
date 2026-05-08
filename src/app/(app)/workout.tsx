import { useColorScheme } from 'nativewind';
import React, { useRef, useState } from 'react';
import { StyleSheet, View as RNView } from 'react-native';
import { showMessage } from 'react-native-flash-message';

import { ConfigurableChart } from '@/components/configurable-chart';
import { LiveStatTiles } from '@/components/live-stat-tiles';
import { SledMassTile } from '@/components/sled-mass-tile';
import {
  Button,
  FocusAwareStatusBar,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
import { Modal, useModal } from '@/components/ui/modal';
import { Constants } from '@/constants';
import { SessionPeakTiles } from '@/features/power-profile/components/session-peak-tiles';
import {
  ZonePrescriptionCompactTile,
  ZonePrescriptionExpandedPanel,
} from '@/features/power-profile/components/zone-prescription-selector';
import { finalizeDiscoveryPPL } from '@/features/power-profile/services/discovery-ppl-finalization-service';
import {
  buildProvisionalPPLRevisionFromPB,
  maybeUpgradeProvisionalPPLFromHistory,
} from '@/features/power-profile/services/organic-ppl-revision-service';
import { saveSession } from '@/features/power-profile/services/power-profile-persistence';
import { classifyLoad } from '@/features/power-profile/services/zone-calculator-service';
import { useAthleteProfileStore } from '@/features/power-profile/store/athlete-profile-store';
import { usePowerSessionStore } from '@/features/power-profile/store/power-session-store';
import type {
  PowerProfileSession,
  PowerProfileSessionMode,
} from '@/features/power-profile/types/power-session';
import { workoutHelper } from '@/features/workout/helpers/workout-helper';
import {
  useWorkoutServices,
  WorkoutServicesProvider,
} from '@/features/workout/providers/workout-services-context';
import { useBufferSubscription, useWorkoutFileOperations } from '@/lib';
import { useLoggedData } from '@/providers';
import { logWorkoutData } from '@/services/logger';
import { useCalculationConfigStore } from '@/store/calculation-config';
import { type WorkoutClass } from '@/types/workout';

function createSessionId(): string {
  return `session_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}

function StartStopButton({
  isLogging,
  onPress,
}: {
  isLogging: boolean;
  onPress: () => void;
}) {
  return (
    <View className="mb-4 flex-row items-center justify-center">
      <Button
        onPress={onPress}
        label={isLogging ? 'Stop' : 'Start'}
        variant={isLogging ? 'warning' : 'default'}
        className="h-[51px] w-[85%]"
        textClassName="font-bold"
      />
    </View>
  );
}

export default function Workout() {
  return (
    <WorkoutServicesProvider>
      <WorkoutScreen />
    </WorkoutServicesProvider>
  );
}

// eslint-disable-next-line max-lines-per-function
function WorkoutScreen() {
  const [isLogging, setIsLogging] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const saveInFlightRef = useRef(false);
  const { dispatch } = useLoggedData();
  const saveModal = useModal();

  const services = useWorkoutServices();
  const { saveWorkout, clearError } = useWorkoutFileOperations();

  const massKg = useCalculationConfigStore((s) => s.config.mass);
  const activeAthleteId = useAthleteProfileStore((s) => s.activeAthleteId);
  const athletes = useAthleteProfileStore((s) => s.athletes);
  const setActiveAthleteId = useAthleteProfileStore(
    (s) => s.setActiveAthleteId
  );
  const getAthleteById = useAthleteProfileStore((s) => s.getAthleteById);
  const sessionId = usePowerSessionStore((s) => s.sessionId);
  const sessionAthleteId = usePowerSessionStore((s) => s.athleteId);
  const startedAt = usePowerSessionStore((s) => s.startedAt);
  const sessionMode = usePowerSessionStore((s) => s.sessionMode);
  const sprintIds = usePowerSessionStore((s) => s.sprintIds);
  const targetZone = usePowerSessionStore((s) => s.targetZone);
  const loadSuggestionsEnabled = usePowerSessionStore(
    (s) => s.loadSuggestionsEnabled
  );
  const addSprintId = usePowerSessionStore((s) => s.addSprintId);
  const updateSessionPeaks = usePowerSessionStore((s) => s.updateSessionPeaks);
  const sessionPeakPower = usePowerSessionStore((s) => s.sessionPeakPower);
  const sessionPeakVelocity = usePowerSessionStore(
    (s) => s.sessionPeakVelocity
  );
  const sessionPeakPowerLoad = usePowerSessionStore(
    (s) => s.sessionPeakPowerLoad
  );
  const discardSession = usePowerSessionStore((s) => s.discardSession);
  const startSession = usePowerSessionStore((s) => s.startSession);
  const markHistoricalPeakBeaten = usePowerSessionStore(
    (s) => s.markHistoricalPeakBeaten
  );
  const updateHistoricalPeak = useAthleteProfileStore(
    (s) => s.updateHistoricalPeak
  );
  const commitPPLRevision = useAthleteProfileStore((s) => s.commitPPLRevision);

  useBufferSubscription(services.bufferService);

  const ensureDefaultSession = () => {
    if (sessionId) return true;
    const athleteId = activeAthleteId ?? athletes[0]?.id ?? null;
    if (!athleteId) {
      showMessage({
        message: 'Create an athlete profile to start',
        type: 'warning',
        duration: 2500,
      });
      return false;
    }
    if (!activeAthleteId) setActiveAthleteId(athleteId);

    const sessionMode: PowerProfileSessionMode = 'training';
    startSession({
      sessionId: createSessionId(),
      athleteId,
      sessionMode,
      targetZone: null,
      loadSuggestionsEnabled: false,
    });
    return true;
  };

  const handleStart = () => {
    if (!ensureDefaultSession()) return;
    clearWorkoutData();
    const nextServices = services.resetServices();
    nextServices.sprintAnalysisService.startSprint();
    services.sensorService.start();
    setIsLogging(true);
  };

  const handleStop = () => {
    services.sprintAnalysisService.stopSprint();
    services.sensorService.stop();
    setIsLogging(false);
    saveModal.present();
  };

  const toggleLogging = () => {
    if (!isLogging) {
      handleStart();
    } else {
      handleStop();
    }
  };

  const clearWorkoutData = () => {
    logWorkoutData('Clearing workout data');
    dispatch({ type: Constants.Reducers.ClearData });
  };

  const handleEndSession = async () => {
    if (isLogging) {
      showMessage({
        message: 'Stop the sprint before ending the session',
        type: 'warning',
        duration: 2500,
      });
      return;
    }
    if (isSaving || saveInFlightRef.current) {
      showMessage({
        message: 'Please wait for the sprint to finish saving',
        type: 'warning',
        duration: 2500,
      });
      return;
    }
    if (!sessionId || !startedAt) return;

    let testStatus: PowerProfileSession['testStatus'] = 'not_a_test';
    let testMode: PowerProfileSession['testMode'] = null;
    let sessionPPLEstimate: number | null = null;

    if (sessionMode === 'discovery') {
      testMode = 'discovery';
      const discoveryAthlete = sessionAthleteId
        ? getAthleteById(sessionAthleteId)
        : null;
      const revision =
        sessionAthleteId && discoveryAthlete
          ? await finalizeDiscoveryPPL({
              sprintIds,
              bodyWeightKg: discoveryAthlete.bodyWeightKg,
            })
          : null;

      if (revision && sessionAthleteId) {
        commitPPLRevision(sessionAthleteId, revision);
        testStatus = 'complete';
        sessionPPLEstimate = revision.pplLoadKg;
      } else {
        testStatus = 'incomplete';
        showMessage({
          message:
            'Discovery session saved — need at least two valid sprints to set PPL.',
          type: 'info',
          duration: 3500,
        });
      }
    }

    await saveSession({
      sessionId,
      athleteId: sessionAthleteId,
      sprintIds,
      startedAt,
      completedAt: Date.now(),
      deletedAt: null,
      testStatus,
      testMode,
      targetZone: targetZone ?? null,
      loadSuggestionsEnabled,
      sessionPeakPower,
      sessionPeakVelocity,
      sessionPeakPowerLoad,
      sessionPPLEstimate,
    });

    discardSession();
  };

  const recordSprintPeaks = async (
    peakPower: number,
    peakVelocity: number,
    loadKg: number
  ) => {
    const prevLastLoadKg = usePowerSessionStore.getState().lastSprintLoadKg;
    const prevLastPowerW = usePowerSessionStore.getState().lastSprintPowerW;

    updateSessionPeaks(peakPower, peakVelocity, loadKg);
    if (activeAthleteId) {
      const athlete = getAthleteById(activeAthleteId);
      const prevHistoricalPeak = athlete?.historicalPeakPower ?? null;
      const beaten =
        prevHistoricalPeak === null || peakPower > prevHistoricalPeak;
      if (beaten) {
        markHistoricalPeakBeaten({ powerW: peakPower, loadKg });
      }
      updateHistoricalPeak(activeAthleteId, peakPower, loadKg);

      if (!athlete) return;

      // Scenario B guard: when load is trending upward and power keeps rising,
      // don't pin PPL to an early point (ascending limb discovery behavior).
      const isAscendingLimbPB =
        beaten &&
        prevLastLoadKg !== null &&
        prevLastPowerW !== null &&
        loadKg > prevLastLoadKg &&
        peakPower > prevLastPowerW;

      if (beaten && !isAscendingLimbPB) {
        const current = athlete.currentPPL;
        const source = current?.estimateSource ?? 'discovery_curve';
        const isProvisionalOrMissing =
          current === null || source === 'organic_pb';

        if (isProvisionalOrMissing) {
          const revision = buildProvisionalPPLRevisionFromPB({
            peakPowerW: peakPower,
            loadKg,
            bodyWeightKg: athlete.bodyWeightKg,
            surfaceType: 'turf',
          });
          commitPPLRevision(activeAthleteId, revision);
        }
      }

      const latest = useAthleteProfileStore
        .getState()
        .getAthleteById(activeAthleteId);
      const maybeProvisional = latest?.currentPPL ?? null;
      if (maybeProvisional) {
        const upgraded = await maybeUpgradeProvisionalPPLFromHistory({
          athleteId: activeAthleteId,
          current: maybeProvisional,
          bodyWeightKg: athlete.bodyWeightKg,
        });
        if (upgraded) {
          commitPPLRevision(activeAthleteId, upgraded);
        }
      }
    }
  };

  // eslint-disable-next-line max-lines-per-function
  const handleSaveWorkout = async (data: WorkoutClass) => {
    if (saveInFlightRef.current) {
      return null;
    }

    saveInFlightRef.current = true;
    setIsSaving(true);
    clearError();

    let result: Awaited<ReturnType<typeof saveWorkout>> = null;
    let savedWorkoutId: string | null = null;
    let sprintPeakPower: number | null = null;
    let sprintPeakVelocity: number | null = null;
    try {
      const workout = workoutHelper(
        data.name,
        data.data,
        services.sprintAnalysisService.getResult()
      );
      savedWorkoutId = workout.id;
      sprintPeakPower =
        workout.sprintAnalysis?.summary.peakPower?.value ?? null;
      sprintPeakVelocity =
        workout.sprintAnalysis?.summary.peakVelocity?.value ?? null;

      const athlete = activeAthleteId ? getAthleteById(activeAthleteId) : null;
      const pplAtTimeOfSprint = athlete?.currentPPL?.pplLoadKg ?? null;

      // We always stamp load and surface; other power-profile fields are derived.
      const baseMetricsPatch = {
        athleteId: activeAthleteId ?? null,
        loadKg: massKg,
        sessionId: sessionId ?? null,
        surfaceType: 'turf' as const,
        pplAtTimeOfSprint,
      };

      // Resolve power measurement mode from peakPower (computed inside persistence),
      // so we best-effort stamp what we can here and let persistence layer merge.
      // We also compute zoneAtRecording if PPL is known.
      const metricsPatch =
        pplAtTimeOfSprint && pplAtTimeOfSprint > 0
          ? {
              ...baseMetricsPatch,
              zoneAtRecording: classifyLoad(massKg, pplAtTimeOfSprint),
            }
          : baseMetricsPatch;

      [result] = await Promise.all([
        saveWorkout(workout, { metricsPatch }),
        new Promise<void>((resolve) => setTimeout(resolve, 900)),
      ]);
    } finally {
      saveInFlightRef.current = false;
      setIsSaving(false);
    }

    if (result) {
      if (sessionId && savedWorkoutId) {
        addSprintId(savedWorkoutId);
      }
      if (
        typeof sprintPeakPower === 'number' &&
        typeof sprintPeakVelocity === 'number'
      ) {
        await recordSprintPeaks(sprintPeakPower, sprintPeakVelocity, massKg);
      }
      showMessage({
        message: 'Workout saved',
        type: 'success',
        duration: 3500,
      });
      return result;
    }

    showMessage({
      message: 'Failed to save workout',
      type: 'danger',
      duration: 4000,
    });
    return null;
  };

  return (
    <WorkoutContent
      isLogging={isLogging}
      isSaving={isSaving}
      showEndSession={Boolean(sessionId) && sprintIds.length > 0}
      sessionId={sessionId}
      toggleLogging={toggleLogging}
      onEndSession={() => void handleEndSession()}
      onSave={async (data) => {
        const result = await handleSaveWorkout(data);
        if (result) saveModal.dismiss();
      }}
      onDiscard={() => {
        clearWorkoutData();
        saveModal.dismiss();
      }}
      saveModal={saveModal}
    />
  );
}

function SaveSprintModal({
  saveModal,
  isSaving,
  onSave,
  onDiscard,
}: {
  saveModal: ReturnType<typeof useModal>;
  isSaving: boolean;
  onSave: () => void;
  onDiscard: () => void;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const sheetBg = isDark ? '#1E1E1E' : '#F5F5F5';
  const handleBg = isDark ? '#474747' : '#D4D4D4';
  const subtitleColor = isDark ? '#737373' : '#525252';
  const discardBorderColor = isDark ? '#474747' : '#D4D4D4';
  const discardLabelColor = isDark ? '#A3A3A3' : '#525252';

  return (
    <Modal
      ref={saveModal.ref}
      snapPoints={['38%']}
      title={'Save Sprint?'}
      backgroundStyle={{ backgroundColor: sheetBg }}
      handleIndicatorStyle={{ backgroundColor: handleBg }}
    >
      <RNView style={sheetStyles.body}>
        <Text style={[sheetStyles.subtitle, { color: subtitleColor }]}>
          {'Would you like to save or discard this sprint?'}
        </Text>
        <Pressable
          disabled={isSaving}
          onPress={onSave}
          style={[
            sheetStyles.btn,
            sheetStyles.btnSave,
            isSaving && sheetStyles.btnDisabled,
          ]}
        >
          <Text style={sheetStyles.btnLabelSave}>
            {isSaving ? 'Saving…' : 'Save'}
          </Text>
        </Pressable>
        <Pressable
          disabled={isSaving}
          onPress={onDiscard}
          style={[
            sheetStyles.btn,
            sheetStyles.btnDiscard,
            { borderColor: discardBorderColor },
            isSaving && sheetStyles.btnDisabled,
          ]}
        >
          <Text
            style={[sheetStyles.btnLabelDiscard, { color: discardLabelColor }]}
          >
            {'Discard'}
          </Text>
        </Pressable>
      </RNView>
    </Modal>
  );
}

function LoadRow({ sessionId }: { sessionId: string | null }) {
  const [zonePanelExpanded, setZonePanelExpanded] = useState(false);

  if (!sessionId) {
    return <SledMassTile />;
  }

  return (
    <View className="mx-5 mb-2">
      <View className="flex-col gap-2">
        <SledMassTile className="w-full bg-neutral-100 px-4 py-3 dark:bg-charcoal-900" />
        <ZonePrescriptionCompactTile
          expanded={zonePanelExpanded}
          onToggle={() => setZonePanelExpanded((e) => !e)}
        />
      </View>
      <ZonePrescriptionExpandedPanel
        visible={zonePanelExpanded}
        onCollapse={() => setZonePanelExpanded(false)}
      />
    </View>
  );
}

function WorkoutContent({
  isLogging,
  isSaving,
  showEndSession,
  sessionId,
  toggleLogging,
  onEndSession,
  onSave,
  onDiscard,
  saveModal,
}: {
  isLogging: boolean;
  isSaving: boolean;
  showEndSession: boolean;
  sessionId: string | null;
  toggleLogging: () => void;
  onEndSession: () => void;
  onSave: (data: WorkoutClass) => Promise<void>;
  onDiscard: () => void;
  saveModal: ReturnType<typeof useModal>;
}) {
  const { loggedData } = useLoggedData();

  return (
    <>
      <FocusAwareStatusBar />
      <View className="flex-1 bg-neutral-50 dark:bg-charcoal-950">
        <ScrollView
          className="px-4"
          contentInsetAdjustmentBehavior="never"
          automaticallyAdjustContentInsets={false}
          contentContainerStyle={{ paddingBottom: 24 }}
        >
          <SafeAreaView className="flex-1" edges={['left', 'right', 'bottom']}>
            <View className="-mx-4">
              <LiveStatTiles />
              {showEndSession ? <SessionPeakTiles /> : null}
            </View>
            <ConfigurableChart isLogging={isLogging} />
            <StartStopButton isLogging={isLogging} onPress={toggleLogging} />
            <LoadRow sessionId={sessionId} />
            {showEndSession ? (
              <View className="mt-3 pb-2">
                <Button
                  label="End session"
                  testID="end-session"
                  onPress={onEndSession}
                  disabled={isSaving}
                />
              </View>
            ) : null}
          </SafeAreaView>
        </ScrollView>
      </View>
      <SaveSprintModal
        saveModal={saveModal}
        isSaving={isSaving}
        onSave={() => void onSave(loggedData)}
        onDiscard={onDiscard}
      />
    </>
  );
}

const sheetStyles = StyleSheet.create({
  body: {
    paddingHorizontal: 24,
    paddingTop: 4,
    gap: 12,
  },
  subtitle: {
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 4,
  },
  btn: {
    height: 52,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnSave: {
    backgroundColor: '#FF8C00', // primary-400
  },
  btnDiscard: {
    backgroundColor: 'transparent',
    borderWidth: 1,
  },
  btnDisabled: {
    opacity: 0.5,
  },
  btnLabelSave: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '700',
  },
  btnLabelDiscard: {
    fontSize: 16,
    fontWeight: '600',
  },
});
