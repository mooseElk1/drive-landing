import React from 'react';
import { Text } from 'react-native';

import { View } from '@/components/ui';

interface VelocityDisplayProps {
  velocity: number | undefined;
  isRecording: boolean;
}

export function VelocityDisplay({
  velocity,
  isRecording,
}: VelocityDisplayProps) {
  const currentVelocity = velocity || 0;

  return (
    <View className="mb-1 rounded-lg px-2 py-1">
      <Text className="mb-1 text-sm font-medium text-gray-600">
        {isRecording ? 'Current Velocity' : 'Velocity'}
      </Text>
      <View className="items-start">
        <View className="flex-row items-baseline">
          <Text className="text-7xl font-bold text-black dark:text-white">
            {currentVelocity.toFixed(2)}
          </Text>
          <Text className="ml-2 text-2xl text-gray-500">m/s</Text>
        </View>
      </View>
    </View>
  );
}
