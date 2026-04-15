import React from 'react';
import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/ui';

export function LoadingState() {
  return (
    <View style={styles.container}>
      <Text>Loading...</Text>
    </View>
  );
}

export function ErrorState() {
  return (
    <View style={styles.container}>
      <Text>Error Loading data</Text>
    </View>
  );
}

export function EmptyState() {
  return (
    <View style={styles.container}>
      <Text>No workouts found</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
