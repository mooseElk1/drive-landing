/* eslint-disable max-lines-per-function */
import * as d3 from 'd3';
import { useColorScheme } from 'nativewind';
import { Dimensions, StyleSheet, TouchableOpacity, View } from 'react-native';
import Svg, { G, Line, Path, Text } from 'react-native-svg';

import colors from '@/components/ui/colors';
import { computeTimeWindow } from '@/lib/chart-time';

import { ChartZones } from './chart-zones';

const { width: screenWidth } = Dimensions.get('window');

interface DriveChartProps {
  data: number[];
  timestamp: number[];
  isRecording: boolean;
  peakVelocity?: number;
  peakPower?: number;
  showPeakLine?: boolean;
  title?: string;
  yAxisLabel?: string;
  mode?: 'velocity' | 'power';
  onModeChange?: (mode: 'velocity' | 'power') => void;
}

export const DriveChart: React.FC<DriveChartProps> = ({
  data = [],
  timestamp = [],
  isRecording: _isRecording = false,
  peakVelocity = 0,
  peakPower = 0,
  showPeakLine = false,
  title = 'Velocity',
  yAxisLabel: _yAxisLabel = 'm/s',
  mode = 'velocity',
  onModeChange,
}) => {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const axisColor = isDark ? colors.neutral[400] : colors.neutral[700];
  const labelColor = isDark ? colors.neutral[200] : colors.neutral[800];
  const lineColor = isDark ? colors.primary[300] : colors.black;
  const noDataColor = isDark ? colors.neutral[400] : colors.neutral[500];
  const peakColor = isDark ? colors.warning[400] : colors.warning[600];
  const zoneLineColor = isDark
    ? 'rgba(251, 191, 36, 0.55)'
    : 'rgba(217, 119, 6, 0.5)';
  const zoneTextColor = isDark
    ? 'rgba(251, 191, 36, 0.85)'
    : 'rgba(180, 83, 9, 0.85)';

  const chartWidth = screenWidth - 40; // 20px padding on each side
  const chartHeight = 280;
  const noDataLabel = 'No data available';
  const margin = { top: 10, right: 20, bottom: 30, left: 40 };
  const innerWidth = chartWidth - margin.left - margin.right;
  const innerHeight = chartHeight - margin.top - margin.bottom;

  // Define scales - always create scales even with no data
  const hasData = data.length > 0;
  const fallbackDtSec = 1 / 30;
  const effectiveTimestamps =
    timestamp.length === data.length && data.length > 0
      ? timestamp
      : data.map((_, i) => i * fallbackDtSec);
  // timestamps are expected to be in seconds
  const { xDomainStart, xDomainEnd } = computeTimeWindow(effectiveTimestamps);

  const xScale = d3
    .scaleLinear()
    .domain([xDomainStart, xDomainEnd]) // domain in seconds relative to button press
    .range([0, innerWidth]);

  const peakValue = mode === 'velocity' ? peakVelocity : peakPower;

  // Calculate appropriate Y-axis domain based on mode and data
  const getYAxisDomain = (): [number, number] => {
    if (hasData) {
      const maxDataValue = d3.max(data, (d: number) => d) || 0;
      const maxValue = Math.max(maxDataValue, peakValue);

      if (mode === 'velocity') {
        // Velocity typically ranges from 0 to ~10 m/s for sled pushes
        return [0, Math.max(maxValue + 0.5, 0.5)];
      } else {
        // Power typically ranges from 0 to ~2000+ W for sled pushes
        return [0, Math.max(maxValue + 50, 500)];
      }
    } else {
      // Default scales when no data
      if (mode === 'velocity') {
        return [0, Math.max(peakValue + 0.5, 3)];
      } else {
        return [0, Math.max(peakValue + 50, 500)];
      }
    }
  };

  const yScale = d3
    .scaleLinear()
    .domain(getYAxisDomain())
    .range([innerHeight, 0]);

  // Create line generators
  const lineX = d3
    .line<number>()
    .x((_, i: number) => xScale(effectiveTimestamps[i] ?? xDomainStart))
    .y((d: number) => yScale(d))
    .curve(d3.curveLinear);

  // Compute path string for the current data; ensure type is string | undefined
  const pathD: string | undefined = hasData
    ? (lineX(data) ?? undefined)
    : undefined;

  // Create axes ticks (absolute seconds since button press)
  const xTickCount = Math.min(10, Math.floor(innerWidth / 80));
  const xTicks = d3.ticks(xDomainStart, xDomainEnd, xTickCount);

  // Create custom Y-axis ticks with 0.5 increments for velocity
  const getYAxisTicks = () => {
    if (mode === 'velocity') {
      const [min, max] = getYAxisDomain();
      const ticks = [];
      for (let i = min; i <= max; i += 0.5) {
        ticks.push(i);
      }
      return ticks;
    } else {
      // Use d3's automatic ticks for power
      return yScale.ticks(5);
    }
  };

  const yTicks = getYAxisTicks();

  return (
    <View style={styles.container}>
      <TouchableOpacity
        activeOpacity={1}
        onPress={() => {
          // Double tap to switch modes
          if (onModeChange) {
            onModeChange(mode === 'velocity' ? 'power' : 'velocity');
          }
        }}
        style={{ flex: 1 }}
      >
        <Svg width={chartWidth} height={chartHeight}>
          <G transform={`translate(${margin.left},${margin.top})`}>
            {/* X-axis */}
            <Line
              x1={0}
              y1={innerHeight}
              x2={innerWidth}
              y2={innerHeight}
              stroke={axisColor}
              strokeWidth={1}
            />

            {/* X-axis ticks */}
            {xTicks.map((tick, i) => (
              <G key={`x-tick-${i}`} transform={`translate(${xScale(tick)},0)`}>
                <Line
                  y1={innerHeight}
                  y2={innerHeight + 5}
                  stroke={axisColor}
                  strokeWidth={1}
                />
                <Text
                  x={0}
                  y={innerHeight + 15}
                  fontSize={10}
                  textAnchor="middle"
                  fill={labelColor}
                >
                  {`${Math.round(tick)}s`}
                </Text>
              </G>
            ))}

            {/* Y-axis */}
            <Line
              x1={0}
              y1={0}
              x2={0}
              y2={innerHeight}
              stroke={axisColor}
              strokeWidth={1}
            />

            {/* Y-axis ticks */}
            {yTicks.map((tick, i) => (
              <G key={`y-tick-${i}`} transform={`translate(0,${yScale(tick)})`}>
                <Line x1={-5} x2={0} stroke={axisColor} strokeWidth={1} />
                <Text
                  x={-15}
                  y={0}
                  fontSize={10}
                  textAnchor="end"
                  fill={labelColor}
                  alignmentBaseline="middle"
                >
                  {mode === 'velocity' ? tick.toFixed(1) : Math.round(tick)}
                </Text>
              </G>
            ))}

            {/* Data lines - only show when there's data */}
            {hasData && pathD && (
              <Path d={pathD} stroke={lineColor} strokeWidth={2} fill="none" />
            )}

            {/* No data message - show when there's no data */}
            {!hasData && (
              <Text
                x={innerWidth / 2}
                y={innerHeight / 2}
                fontSize={14}
                textAnchor="middle"
                fill={noDataColor}
                alignmentBaseline="middle"
              >
                {noDataLabel}
              </Text>
            )}

            {/* Chart Zones - Peak line and percentage zones */}
            <ChartZones
              innerWidth={innerWidth}
              yScale={yScale}
              peakValue={peakValue}
              showPeakLine={showPeakLine}
              mode={mode}
              peakLineColor={peakColor}
              zoneLineColor={zoneLineColor}
              zoneTextColor={zoneTextColor}
            />

            {/* Chart grid - removed to reduce visual clutter */}

            {/* Legend */}
            <G transform={`translate(10, 10)`}>
              <Line
                x1={0}
                y1={0}
                x2={20}
                y2={0}
                stroke={lineColor}
                strokeWidth={2}
              />
              <Text
                x={25}
                y={0}
                fill={labelColor}
                fontSize={12}
                alignmentBaseline="middle"
              >
                {title}
              </Text>

              {showPeakLine && peakValue > 0 && (
                <>
                  <Line
                    x1={0}
                    y1={15}
                    x2={20}
                    y2={15}
                    stroke={peakColor}
                    strokeWidth={2}
                    strokeDasharray="5,2"
                  />
                  <Text
                    x={25}
                    y={15}
                    fill={peakColor}
                    fontSize={12}
                    alignmentBaseline="middle"
                  >
                    {mode === 'velocity' ? 'Peak' : 'Max'}
                  </Text>
                </>
              )}
            </G>
          </G>
        </Svg>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  placeholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    height: 300,
  },
});
