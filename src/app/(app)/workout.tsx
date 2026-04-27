import { useColorScheme } from 'nativewind';
import React, { useRef, useState } from 'react';
import { StyleSheet, View as RNView } from 'react-native';
import { showMessage } from 'react-native-flash-message';

import { ConfigurableChart } from '@/components/configurable-chart';
import { LiveStatTiles } from '@/components/live-stat-tiles';
import { SledMassTile } from '@/components/sled-mass-tile';
import {
  FocusAwareStatusBar,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
import { Modal, useModal } from '@/components/ui/modal';
import { Constants } from '@/constants';
import { classifyLoad } from '@/features/power-profile/services/zone-calculator-service';
import { useAthleteProfileStore } from '@/features/power-profile/store/athlete-profile-store';
import { usePowerSessionStore } from '@/features/power-profile/store/power-session-store';
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

function StartStopButton({
  isLogging,
  onPress,
}: {
  isLogging: boolean;
  onPress: () => void;
}) {
  return (
    <View className="mb-4 flex-row items-center justify-center">
      <Pressable
        onPress={onPress}
        className={`h-[51px] w-[85%] items-center justify-center rounded-full border px-8 ${
          isLogging
            ? 'border-warning-500 bg-warning-500'
            : 'border-primary-400 bg-primary-400'
        }`}
      >
        <Text
          className={`text-base font-bold ${isLogging ? 'text-neutral-950' : 'text-white'}`}
        >
          {isLogging ? 'Stop' : 'Start'}
        </Text>
      </Pressable>
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
  const getAthleteById = useAthleteProfileStore((s) => s.getAthleteById);
  const sessionId = usePowerSessionStore((s) => s.sessionId);
  const addSprintId = usePowerSessionStore((s) => s.addSprintId);

  useBufferSubscription(services.bufferService);

  const handleStart = () => {
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

  const handleSaveWorkout = async (data: WorkoutClass) => {
    if (saveInFlightRef.current) {
      return null;
    }

    saveInFlightRef.current = true;
    setIsSaving(true);
    clearError();

    let result: Awaited<ReturnType<typeof saveWorkout>> = null;
    let savedWorkoutId: string | null = null;
    try {
      const workout = workoutHelper(
        data.name,
        data.data,
        services.sprintAnalysisService.getResult()
      );
      savedWorkoutId = workout.id;

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
      toggleLogging={toggleLogging}
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

function WorkoutContent({
  isLogging,
  isSaving,
  toggleLogging,
  onSave,
  onDiscard,
  saveModal,
}: {
  isLogging: boolean;
  isSaving: boolean;
  toggleLogging: () => void;
  onSave: (data: WorkoutClass) => Promise<void>;
  onDiscard: () => void;
  saveModal: ReturnType<typeof useModal>;
}) {
  const { loggedData } = useLoggedData();

  return (
    <>
      <FocusAwareStatusBar />
      <ScrollView
        className="bg-neutral-50 px-4 dark:bg-charcoal-950"
        contentInsetAdjustmentBehavior="never"
        automaticallyAdjustContentInsets={false}
      >
        <SafeAreaView className="flex-1" edges={['left', 'right', 'bottom']}>
          <LiveStatTiles />
          <ConfigurableChart isLogging={isLogging} />
          <StartStopButton isLogging={isLogging} onPress={toggleLogging} />
          <SledMassTile />
        </SafeAreaView>
      </ScrollView>
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
    borderRadius: 30,
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
