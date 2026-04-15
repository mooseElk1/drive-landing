import React, { useEffect, useRef, useState } from 'react';
import { Alert, StyleSheet, TouchableOpacity } from 'react-native';
import Swipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import Reanimated, {
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { Text, View } from '@/components/ui';
import {
  type ExportOptions,
  useWorkoutExport,
  useWorkoutFileOperations,
} from '@/lib';
import type { WorkoutEntry } from '@/types/workout-database';

interface WorkoutItemProps {
  item: WorkoutEntry;
  onDelete: (item: WorkoutEntry) => Promise<void> | void;
}

const DELETE_LABEL = 'Delete';

function useExportHandlers(item: WorkoutEntry) {
  const [isExporting, setIsExporting] = useState(false);
  const { loadWorkout } = useWorkoutFileOperations();
  const { exportAndShare } = useWorkoutExport();

  const handleExport = async (format: 'csv' | 'json' | 'gpx') => {
    if (isExporting) return;
    setIsExporting(true);
    try {
      const workout = await loadWorkout(item);
      if (!workout) {
        Alert.alert('Error', 'Failed to load workout data');
        return;
      }
      const exportOptions: ExportOptions = {
        format,
        includeRawData: true,
        includePeakValues: true,
      };
      const result = await exportAndShare(workout, exportOptions);
      if (!result.success) {
        Alert.alert('Export Failed', result.error || 'Unknown error occurred');
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert(
        'Export Failed',
        'An error occurred while exporting the workout'
      );
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportOptions = () => {
    Alert.alert('Export Workout', 'Choose export format:', [
      { text: 'CSV', onPress: () => handleExport('csv') },
      { text: 'JSON', onPress: () => handleExport('json') },
      { text: 'GPX', onPress: () => handleExport('gpx') },
      { text: 'Cancel', style: 'cancel' },
    ]);
  };

  return { isExporting, handleExportOptions };
}

function RightAction({
  _prog,
  drag,
  item,
  onDelete,
}: {
  _prog: SharedValue<number>;
  drag: SharedValue<number>;
  item: WorkoutEntry;
  onDelete: (item: WorkoutEntry) => Promise<void> | void;
}) {
  const { isExporting, handleExportOptions } = useExportHandlers(item);

  const styleAnimation = useAnimatedStyle(() => ({
    transform: [{ translateX: drag.value + 160 }],
  }));

  return (
    <Reanimated.View style={[styles.rightActions, styleAnimation]}>
      <TouchableOpacity
        style={[styles.shareButton, isExporting && styles.disabledButton]}
        onPress={handleExportOptions}
        disabled={isExporting}
      >
        <Text style={styles.shareButtonText}>
          {isExporting ? 'Exporting...' : 'Export'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        style={styles.deleteButton}
        onPress={() => {
          void onDelete(item);
        }}
      >
        <Text style={styles.deleteButtonText}>{DELETE_LABEL}</Text>
      </TouchableOpacity>
    </Reanimated.View>
  );
}

export function WorkoutItem({ item, onDelete }: WorkoutItemProps) {
  const reanimatedRef = useRef<SwipeableMethods>(null);

  // When FlashList recycles this cell for a different item, close the
  // swipeable so the recycled cell never shows stale gesture state.
  useEffect(() => {
    reanimatedRef.current?.close();
  }, [item.id]);

  return (
    <Swipeable
      ref={reanimatedRef}
      renderRightActions={(_prog, drag) => (
        <RightAction
          _prog={_prog}
          drag={drag}
          item={item}
          onDelete={onDelete}
        />
      )}
    >
      <View style={styles.workoutItem}>
        <Text style={styles.workoutName}>{item.name}</Text>
        <Text style={styles.workoutDate}>
          {`${item.date.toLocaleDateString()} - ${item.date.toLocaleTimeString(
            'en-GB',
            { hour: '2-digit', minute: '2-digit' }
          )}`}
        </Text>
      </View>
    </Swipeable>
  );
}

const styles = StyleSheet.create({
  workoutItem: {
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#ccc',
  },
  workoutName: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  workoutDate: {
    fontSize: 14,
    color: '#666',
  },
  rightActions: {
    flexDirection: 'row',
  },
  shareButton: {
    backgroundColor: '#007AFF',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
  shareButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  deleteButton: {
    backgroundColor: 'red',
    justifyContent: 'center',
    alignItems: 'center',
    width: 80,
    height: '100%',
  },
  deleteButtonText: {
    color: 'white',
    fontWeight: 'bold',
  },
  disabledButton: {
    backgroundColor: '#ccc',
    opacity: 0.6,
  },
});
