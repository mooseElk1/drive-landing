import React from 'react';
import { G, Line, Text } from 'react-native-svg';

interface ChartZonesProps {
  innerWidth: number;
  yScale: (value: number) => number;
  peakValue: number;
  showPeakLine: boolean;
  mode: 'velocity' | 'power';
  zonePercentages?: number[];
  peakLineColor?: string;
  zoneLineColor?: string;
  zoneTextColor?: string;
}

export function ChartZones({
  innerWidth,
  yScale,
  peakValue,
  showPeakLine,
  mode,
  zonePercentages = [90, 80, 70, 60, 50],
  peakLineColor = 'orange',
  zoneLineColor = 'rgba(255, 165, 0, 0.7)',
  zoneTextColor = 'rgba(255, 165, 0, 0.8)',
}: ChartZonesProps) {
  if (!showPeakLine || peakValue <= 0) {
    return null;
  }

  const getUnit = () => {
    return mode === 'velocity' ? 'm/s' : 'W';
  };

  const getPeakLabel = () => {
    return mode === 'velocity' ? 'Peak' : 'Max';
  };

  return (
    <G>
      {/* Peak/High Watermark Line */}
      <Line
        x1={0}
        y1={yScale(peakValue)}
        x2={innerWidth}
        y2={yScale(peakValue)}
        stroke={peakLineColor}
        strokeWidth={2}
        strokeDasharray="10,5"
      />
      <Text
        x={innerWidth - 20}
        y={yScale(peakValue) - 15}
        fontSize={10}
        textAnchor="end"
        fill={peakLineColor}
        fontWeight="bold"
      >
        {getPeakLabel() + ' ' + peakValue.toFixed(mode === 'velocity' ? 2 : 1)}
      </Text>

      {/* Target Zones - Percentage ranges of peak value */}
      {zonePercentages.map((percentage) => {
        const threshold = (peakValue * percentage) / 100;
        const yPosition = yScale(threshold);

        return (
          <G key={`zone-${percentage}`}>
            {/* Horizontal line for this threshold */}
            <Line
              x1={0}
              y1={yPosition}
              x2={innerWidth}
              y2={yPosition}
              stroke={zoneLineColor}
              strokeWidth={1}
              strokeDasharray="3,3"
            />

            {/* Zone label */}
            <Text
              x={innerWidth - 5}
              y={yPosition - 3}
              fontSize={8}
              textAnchor="end"
              fill={zoneTextColor}
              fontWeight="500"
            >
              {percentage}%
            </Text>
          </G>
        );
      })}
    </G>
  );
}
