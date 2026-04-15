import React from 'react';
import { Text } from 'react-native';

import { View } from '@/components/ui';

interface PowerDisplayProps {
  power: number | undefined;
  isRecording: boolean;
}

export function PowerDisplay({ power, isRecording }: PowerDisplayProps) {
  const currentPower = power || 0;

  return (
    <View className="mb-1 rounded-lg px-2 py-1">
      <Text className="mb-1 text-sm font-medium text-gray-600">
        {isRecording ? 'Current Power' : 'Power'}
      </Text>
      <View className="items-start">
        <View className="flex-row items-baseline">
          <Text className="text-7xl font-bold text-black">
            {Math.round(currentPower).toLocaleString()}
          </Text>
          <Text className="ml-2 text-2xl text-gray-500">W</Text>
        </View>
      </View>
    </View>
  );
}
