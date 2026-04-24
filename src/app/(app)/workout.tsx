import React, { useRef, useState } from 'react';
import { StyleSheet, View as RNView } from 'react-native';
import { showMessage } from 'react-native-flash-message';

import { ConfigurableChart } from '@/components/configurable-chart';
import { LiveStatTiles } from '@/components/live-stat-tiles';
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
import { workoutHelper } from '@/features/workout/helpers/workout-helper';
import {
  useWorkoutServices,
  WorkoutServicesProvider,
} from '@/features/workout/providers/workout-services-context';
import { useBufferSubscription, useWorkoutFileOperations } from '@/lib';
import { useLoggedData } from '@/providers';
import { logWorkoutData } from '@/services/logger';
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
    try {
      const workout = workoutHelper(
        data.name,
        data.data,
        services.sprintAnalysisService.getResult()
      );
      [result] = await Promise.all([
        saveWorkout(workout),
        new Promise<void>((resolve) => setTimeout(resolve, 900)),
      ]);
    } finally {
      saveInFlightRef.current = false;
      setIsSaving(false);
    }

    if (result) {
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
        </SafeAreaView>
      </ScrollView>

      <Modal ref={saveModal.ref} snapPoints={['38%']} title={'Save Sprint?'}>
        <RNView style={sheetStyles.body}>
          <Text style={sheetStyles.subtitle}>
            {'Would you like to save or discard this sprint?'}
          </Text>

          <Pressable
            disabled={isSaving}
            onPress={() => void onSave(loggedData)}
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
              isSaving && sheetStyles.btnDisabled,
            ]}
          >
            <Text style={sheetStyles.btnLabelDiscard}>{'Discard'}</Text>
          </Pressable>
        </RNView>
      </Modal>
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
    color: '#9CA3AF',
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
    backgroundColor: '#3B82F6',
  },
  btnDiscard: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: '#374151',
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
    color: '#9CA3AF',
    fontSize: 16,
    fontWeight: '600',
  },
});
