import React, { useRef, useState } from 'react';
import { showMessage } from 'react-native-flash-message';

import { ConfigurableChart } from '@/components/configurable-chart';
import {
  FocusAwareStatusBar,
  Pressable,
  SafeAreaView,
  ScrollView,
  Text,
  View,
} from '@/components/ui';
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
import { type WorkoutTrackingDatabase } from '@/types/workout-database';

function ActionButton({
  label,
  onPress,
  buttonClassName,
  labelClassName,
  disabled = false,
}: {
  label: string;
  onPress: () => void;
  buttonClassName: string;
  labelClassName?: string;
  disabled?: boolean;
}) {
  return (
    <View className="mb-4 flex-row items-center justify-center">
      <Pressable
        disabled={disabled}
        onPress={onPress}
        className={`h-[51px] w-[85%] items-center justify-center rounded-full border px-8 ${buttonClassName}`}
      >
        <Text className={`text-base font-bold ${labelClassName ?? ''}`}>
          {label}
        </Text>
      </Pressable>
    </View>
  );
}

function WorkoutActions({
  isLogging,
  toggleLogging,
  onSave,
  isSaving,
}: {
  isLogging: boolean;
  toggleLogging: () => void;
  onSave: () => void;
  isSaving: boolean;
}) {
  return (
    <>
      <ActionButton
        label={isLogging ? 'Stop' : 'Start'}
        onPress={toggleLogging}
        buttonClassName={
          isLogging
            ? 'border-warning-500 bg-warning-500'
            : 'border-primary-400 bg-primary-400'
        }
        labelClassName={isLogging ? 'text-neutral-950' : 'text-white'}
      />
      <ActionButton
        label={isSaving ? 'Saving...' : 'Save'}
        onPress={onSave}
        disabled={isSaving}
        buttonClassName={
          isSaving
            ? 'border-neutral-400 bg-neutral-400 dark:border-neutral-600 dark:bg-neutral-600'
            : 'border-neutral-300 bg-neutral-300 dark:border-neutral-700 dark:bg-neutral-700'
        }
        labelClassName={
          isSaving
            ? 'text-neutral-700 dark:text-neutral-300'
            : 'text-neutral-900 dark:text-neutral-100'
        }
      />
    </>
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

  const services = useWorkoutServices();
  const { saveWorkout, clearError } = useWorkoutFileOperations();

  useBufferSubscription(services.bufferService);

  const toggleLogging = () => {
    if (!isLogging) {
      clearWorkoutData();
      // Recreate calculation + buffer (fresh velocity FSM)
      const nextServices = services.resetServices();
      nextServices.sprintAnalysisService.startSprint();
      services.sensorService.start();
    } else {
      services.sprintAnalysisService.stopSprint();
      services.sensorService.stop();
    }
    setIsLogging((prev) => !prev);
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
      // Run the save and a minimum display timer in parallel so the
      // "Saving..." state is always visible for at least 900 ms.
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
    <WorkoutView
      isLogging={isLogging}
      isSaving={isSaving}
      toggleLogging={toggleLogging}
      createWorkout={handleSaveWorkout}
    />
  );
}

function WorkoutView({
  isLogging,
  isSaving,
  toggleLogging,
  createWorkout,
}: {
  isLogging: boolean;
  isSaving: boolean;
  toggleLogging: () => void;
  createWorkout: (
    data: WorkoutClass
  ) => Promise<WorkoutTrackingDatabase | null>;
}) {
  return (
    <WorkoutContent
      isLogging={isLogging}
      isSaving={isSaving}
      toggleLogging={toggleLogging}
      createWorkout={createWorkout}
    />
  );
}

function WorkoutContent({
  isLogging,
  isSaving,
  toggleLogging,
  createWorkout,
}: {
  isLogging: boolean;
  isSaving: boolean;
  toggleLogging: () => void;
  createWorkout: (
    data: WorkoutClass
  ) => Promise<WorkoutTrackingDatabase | null>;
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
          <ConfigurableChart isLogging={isLogging} />
          <WorkoutActions
            isLogging={isLogging}
            isSaving={isSaving}
            toggleLogging={toggleLogging}
            onSave={() => {
              void createWorkout(loggedData);
            }}
          />
        </SafeAreaView>
      </ScrollView>
    </>
  );
}
