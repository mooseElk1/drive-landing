import React from 'react';
import { Text } from 'react-native';
import Svg, { Circle, Text as SvgText } from 'react-native-svg';

import { View } from '@/components/ui';

interface VelocityGaugeProps {
  velocity: number | undefined;
  peakVelocity: number;
  isRecording: boolean;
}

export function VelocityGauge({
  velocity,
  peakVelocity,
  isRecording,
}: VelocityGaugeProps) {
  const currentVelocity = velocity || 0;

  // Gauge dimensions
  const size = 250;
  const strokeWidth = 20;
  const radius = (size - strokeWidth) / 2;
  const center = size / 2;

  // Gauge range: 0 to max(5, peakVelocity)
  const maxVelocity = Math.max(5, peakVelocity);
  const minVelocity = 0;

  // Calculate the fill percentage (0 to 1)
  const fillPercentage = Math.min(currentVelocity / maxVelocity, 1);

  // Calculate peak percentage for deceleration indicator
  const peakPercentage = Math.min(peakVelocity / maxVelocity, 1);

  // Calculate the stroke dasharray for the progress
  const circumference = 2 * Math.PI * radius;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference * (1 - fillPercentage);

  // Calculate deceleration area (between current and peak)
  const decelerationDashoffset = circumference * (1 - peakPercentage);

  return (
    <View className="items-center justify-center p-6">
      {/* Peak value display */}
      {peakVelocity > 0 && (
        <View className="mb-6 w-full items-start">
          <Text className="mb-1 text-sm font-medium text-gray-600">
            Peak Velocity
          </Text>
          <View className="flex-row items-baseline">
            <Text className="text-7xl font-bold text-black">
              {peakVelocity.toFixed(2)}
            </Text>
            <Text className="ml-2 text-2xl text-gray-500">m/s</Text>
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
        {peakVelocity > 0 && currentVelocity < peakVelocity && (
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
          {currentVelocity.toFixed(2)}
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
          m/s
        </SvgText>

        {/* Percentage of peak in center */}
        {peakVelocity > 0 && (
          <SvgText
            x={center}
            y={center + 30}
            fontSize={18}
            fontWeight="bold"
            fill="#FFA500"
            textAnchor="middle"
            alignmentBaseline="middle"
          >
            {Math.round((currentVelocity / peakVelocity) * 100)}%
          </SvgText>
        )}
      </Svg>
    </View>
  );
}
