import React from 'react';
import { Text } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';

import { View } from '@/components/ui';

interface PowerGaugeProps {
  power: number | undefined;
  peakPower: number;
  isRecording: boolean;
}

export function PowerGauge({ power, peakPower, isRecording }: PowerGaugeProps) {
  const currentPower = power || 0;

  // Gauge dimensions
  const size = 250;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  // Gauge range: 0 to max(3000, peakPower)
  const maxPower = Math.max(3000, peakPower);
  const minPower = 0;

  // Calculate the fill percentage (0 to 1)
  const fillPercentage = Math.min(currentPower / maxPower, 1);

  // Calculate peak percentage for deceleration indicator
  const peakPercentage = Math.min(peakPower / maxPower, 1);

  // Calculate the stroke dasharray for the progress
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference * (1 - fillPercentage);

  // Calculate deceleration area (between current and peak)
  const decelerationDashoffset = circumference * (1 - peakPercentage);

  return (
    <View className="items-center justify-center p-6">
      {/* Peak value display */}
      {peakPower > 0 && (
        <View className="mb-6 w-full items-start">
          <Text className="mb-1 text-sm font-medium text-gray-600">
            Peak Power
          </Text>
          <View className="flex-row items-baseline">
            <Text className="text-7xl font-bold text-black">
              {Math.round(peakPower).toLocaleString()}
            </Text>
            <Text className="ml-2 text-2xl text-gray-500">W</Text>
          </View>
        </View>
      )}

      <Svg width={size} height={size} className="items-center justify-center">
        {/* Background circle */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#374151"
          strokeWidth={strokeWidth}
          fill="transparent"
        />

        {/* Deceleration indicator (lighter grey) - shows area between current and peak */}
        {peakPower > 0 && currentPower < peakPower && (
          <Circle
            cx={center}
            cy={center}
            r={radius}
            stroke="#D1D5DB"
            strokeWidth={strokeWidth}
            fill="transparent"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={decelerationDashoffset}
            transform={`rotate(90 ${center} ${center})`}
          />
        )}

        {/* Progress circle - start from bottom (270°) and go clockwise */}
        <Circle
          cx={center}
          cy={center}
          r={radius}
          stroke="#FFA500"
          strokeWidth={strokeWidth}
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          transform={`rotate(90 ${center} ${center})`}
        />

        {/* Current value in center */}
        <SvgText
          x={center}
          y={center - 20}
          fontSize={48}
          fontWeight="bold"
          fill="#000000"
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          {Math.round(currentPower).toLocaleString()}
        </SvgText>

        {/* Unit in center */}
        <SvgText
          x={center}
          y={center + 5}
          fontSize={16}
          fill="#6B7280"
          textAnchor="middle"
          alignmentBaseline="middle"
        >
          W
        </SvgText>

        {/* Percentage of peak in center */}
        {peakPower > 0 && (
          <SvgText
            x={center}
            y={center + 30}
            fontSize={18}
            fontWeight="bold"
            fill="#FFA500"
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {Math.round((currentPower / peakPower) * 100)}%
          </SvgText>
        )}
      </Svg>
    </View>
  );
}
