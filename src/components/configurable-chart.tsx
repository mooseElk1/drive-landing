/* eslint-disable max-lines-per-function */
import { useActionSheet } from '@expo/react-native-action-sheet';
import * as d3 from 'd3';
import { useColorScheme } from 'nativewind';
import { useState } from 'react';
import {
  Dimensions,
  Modal,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
  runOnJS,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import Svg, { G, Line, Path, Text as SvgText } from 'react-native-svg';

import colors from '@/components/ui/colors';
import { useLoggedData } from '@/providers/logged-data-context';
import { CHANNELS } from '@/types/channel-names';

const { width: screenWidth } = Dimensions.get('window');
const TARGET_POINTS = 300;
const MIN_WINDOW_SECONDS = 1;
const MAX_WINDOW_SECONDS = 300;
const NO_DATA_LABEL = 'No data';
const LIVE_LABEL = 'LIVE';
const PICKER_TITLE = 'Select Channel';
const CLOSE_LABEL = 'Close';
const ALL_WINDOW_SECONDS = 86400; // sentinel for "show all data"

const PILLS: { label: string; value: number }[] = [
  { label: '5s', value: 5 },
  { label: '10s', value: 10 },
  { label: '30s', value: 30 },
  { label: '60s', value: 60 },
  { label: 'All', value: ALL_WINDOW_SECONDS },
];

interface ConfigurableChartProps {
  isLogging: boolean;
}

type ChannelEntry = { id: string; label: string };
type ChannelGroup = { title: string; channels: ChannelEntry[] };

const CHANNEL_GROUPS: ChannelGroup[] = [
  {
    title: 'Core',
    channels: [
      { id: CHANNELS.VELOCITY_MAGNITUDE, label: 'Velocity (m/s)' },
      { id: CHANNELS.POWER_MAGNITUDE, label: 'Power (W)' },
    ],
  },
  {
    title: 'Acceleration',
    channels: [
      { id: CHANNELS.ACCEL_X_ROTATED, label: 'Accel X (rotated)' },
      { id: CHANNELS.ACCEL_Y_ROTATED, label: 'Accel Y (rotated)' },
      { id: CHANNELS.ACCEL_Z_ROTATED, label: 'Accel Z (rotated)' },
      {
        id: CHANNELS.ACCEL_X_OUTPUT_FILTERED,
        label: 'Accel X (output filtered)',
      },
      {
        id: CHANNELS.ACCEL_Y_OUTPUT_FILTERED,
        label: 'Accel Y (output filtered)',
      },
      {
        id: CHANNELS.ACCEL_Z_OUTPUT_FILTERED,
        label: 'Accel Z (output filtered)',
      },

      { id: CHANNELS.ACCEL_MAGNITUDE, label: 'Accel Magnitude' },
      {
        id: CHANNELS.ACCEL_MAGNITUDE_FILTERED,
        label: 'Accel Magnitude (filtered)',
      },
    ],
  },
  {
    title: 'Gyro',
    channels: [
      { id: CHANNELS.GYRO_X, label: 'Gyro X' },
      { id: CHANNELS.GYRO_Y, label: 'Gyro Y' },
      { id: CHANNELS.GYRO_Z, label: 'Gyro Z' },
      { id: CHANNELS.GYRO_MAGNITUDE, label: 'Gyro Magnitude' },
    ],
  },
  {
    title: 'Debug',
    channels: [
      { id: CHANNELS.ZUPT_STATUS, label: 'ZUPT Status' },
      { id: CHANNELS.VELOCITY_STATE, label: 'Velocity State' },
      { id: CHANNELS.DT, label: 'dt' },
      { id: CHANNELS.TIME, label: 'Time (s)' },
    ],
  },
];

const CHANNEL_DISPLAY_NAMES: Record<string, string> = Object.fromEntries(
  CHANNEL_GROUPS.flatMap((g) => g.channels.map((c) => [c.id, c.label]))
);

function ChannelPickerModal({
  visible,
  selectedChannel,
  onSelect,
  onClose,
}: {
  visible: boolean;
  selectedChannel: string;
  onSelect: (id: string) => void;
  onClose: () => void;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const bg = isDark ? colors.charcoal[900] : colors.neutral[50];
  const titleColor = isDark ? colors.neutral[100] : colors.neutral[900];
  const groupColor = isDark ? colors.neutral[400] : colors.neutral[500];
  const itemColor = isDark ? colors.neutral[200] : colors.neutral[800];
  const activeColor = isDark ? colors.primary[400] : colors.primary[600];
  const borderColor = isDark ? colors.charcoal[800] : colors.neutral[200];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onClose}
    >
      <View style={pickerStyles.overlay}>
        <View style={[pickerStyles.sheet, { backgroundColor: bg }]}>
          <Text style={[pickerStyles.title, { color: titleColor }]}>
            {PICKER_TITLE}
          </Text>
          <ScrollView style={pickerStyles.scroll}>
            {CHANNEL_GROUPS.map((group) => (
              <View key={group.title}>
                <Text style={[pickerStyles.groupHeader, { color: groupColor }]}>
                  {group.title}
                </Text>
                {group.channels.map((ch) => {
                  const isActive = ch.id === selectedChannel;
                  return (
                    <TouchableOpacity
                      key={ch.id}
                      style={[
                        pickerStyles.item,
                        { borderBottomColor: borderColor },
                      ]}
                      onPress={() => {
                        onSelect(ch.id);
                        onClose();
                      }}
                    >
                      <Text
                        style={[
                          pickerStyles.itemLabel,
                          { color: isActive ? activeColor : itemColor },
                        ]}
                      >
                        {ch.label}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            ))}
          </ScrollView>
          <TouchableOpacity style={pickerStyles.closeButton} onPress={onClose}>
            <Text style={[pickerStyles.closeLabel, { color: activeColor }]}>
              {CLOSE_LABEL}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

/** Every-nth-point downsample keeping paired arrays in sync. */
function downsamplePair(
  a: number[],
  b: number[],
  target = TARGET_POINTS
): [number[], number[]] {
  if (a.length <= target) return [a, b];
  const step = Math.ceil(a.length / target);
  return [
    a.filter((_, i) => i % step === 0),
    b.filter((_, i) => i % step === 0),
  ];
}

export function ConfigurableChart({ isLogging }: ConfigurableChartProps) {
  const { loggedData, getFullData } = useLoggedData();
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { showActionSheetWithOptions } = useActionSheet();

  // --- Chart layout constants ---
  const chartWidth = screenWidth - 40;
  const chartHeight = 280;
  const margin = { top: 10, right: 20, bottom: 30, left: 46 };
  const innerWidth = chartWidth - margin.left - margin.right;
  const innerHeight = chartHeight - margin.top - margin.bottom;

  // --- JS state (drives React render) ---
  // Phase 5: timeWindowSeconds will be controlled by time-window pills
  const [selectedChannel, setSelectedChannel] = useState<string>(
    CHANNELS.VELOCITY_MAGNITUDE
  );
  const [pickerVisible, setPickerVisible] = useState(false);
  const [timeWindowSeconds, setTimeWindowSeconds] = useState(10);
  const [panOffsetSecondsJS, setPanOffsetSecondsJS] = useState(0);

  // --- Reanimated shared values (drive worklet-thread gesture calculations) ---
  const panOffsetSV = useSharedValue(0);
  const timeWindowSV = useSharedValue(10);
  const svgTranslateX = useSharedValue(0);

  // --- Gestures ---
  const panGesture = Gesture.Pan()
    .onUpdate((e) => {
      'worklet';
      svgTranslateX.value = e.translationX * 0.4;
    })
    .onEnd((e) => {
      'worklet';
      // Dragging right reveals older data → increase panOffset
      const deltaSec = (e.translationX / innerWidth) * timeWindowSV.value;
      const newOffset = Math.max(0, panOffsetSV.value + deltaSec);
      panOffsetSV.value = newOffset;
      svgTranslateX.value = 0;
      runOnJS(setPanOffsetSecondsJS)(newOffset);
    });

  const pinchGesture = Gesture.Pinch().onEnd((e) => {
    'worklet';
    const newWindow = Math.min(
      MAX_WINDOW_SECONDS,
      Math.max(MIN_WINDOW_SECONDS, timeWindowSV.value / e.scale)
    );
    timeWindowSV.value = newWindow;
    runOnJS(setTimeWindowSeconds)(newWindow);
    // Snap back to live edge on zoom change
    panOffsetSV.value = 0;
    runOnJS(setPanOffsetSecondsJS)(0);
  });

  const gesture = Gesture.Simultaneous(panGesture, pinchGesture);

  // --- Data selection ---
  const isAtLiveEdge = panOffsetSecondsJS === 0;
  let channelData: number[];
  let tsData: number[]; // elapsed seconds for x-axis

  if (isAtLiveEdge && isLogging) {
    // Live path: use the windowed context data (already bounded by WINDOW_SIZE)
    channelData = loggedData.getLastData(timeWindowSeconds, selectedChannel);
    const timeArr = loggedData.getLastData(timeWindowSeconds, CHANNELS.TIME);
    const rawTs = loggedData.getLastData(timeWindowSeconds, CHANNELS.TIMESTAMP);
    tsData =
      timeArr.length > 0
        ? timeArr
        : rawTs.map((t) => (t - (rawTs[0] ?? 0)) / 1000);
  } else {
    // Historical path: binary-search the full dataset
    const full = getFullData();
    const rawTimestamps = full.data.getChannelData(CHANNELS.TIMESTAMP);
    if (rawTimestamps.length === 0) {
      channelData = [];
      tsData = [];
    } else {
      const liveEdgeMs = rawTimestamps[rawTimestamps.length - 1]!;
      const endMs = liveEdgeMs - panOffsetSecondsJS * 1000;
      const startMs = endMs - timeWindowSeconds * 1000;

      const rawChannel = full.data.getDataInRange(
        startMs,
        endMs,
        selectedChannel
      );
      const timeArr = full.data.getDataInRange(startMs, endMs, CHANNELS.TIME);
      const rawTs = full.data.getDataInRange(
        startMs,
        endMs,
        CHANNELS.TIMESTAMP
      );
      const tsRaw =
        timeArr.length > 0
          ? timeArr
          : rawTs.map((t) => (t - (rawTs[0] ?? 0)) / 1000);

      [channelData, tsData] = downsamplePair(rawChannel, tsRaw);
    }
  }

  // --- Scales ---
  const hasData = channelData.length > 0 && tsData.length > 0;

  const xDomainStart = hasData ? (tsData[0] ?? 0) : 0;
  const xDomainEnd = hasData
    ? Math.max(tsData[tsData.length - 1] ?? 0, xDomainStart + timeWindowSeconds)
    : timeWindowSeconds;

  const xScale = d3
    .scaleLinear()
    .domain([xDomainStart, xDomainEnd])
    .range([0, innerWidth]);

  const rawYMin = hasData ? (d3.min(channelData) ?? 0) : 0;
  const rawYMax = hasData ? (d3.max(channelData) ?? 1) : 1;
  const yPad = Math.max((rawYMax - rawYMin) * 0.1, 0.05);
  const yScale = d3
    .scaleLinear()
    .domain([rawYMin - yPad, rawYMax + yPad])
    .range([innerHeight, 0]);

  const lineGen = d3
    .line<number>()
    .x((_, i) => xScale(tsData[i] ?? xDomainStart))
    .y((d) => yScale(d))
    .curve(d3.curveLinear);

  const pathD: string | undefined = hasData
    ? (lineGen(channelData) ?? undefined)
    : undefined;

  const xTickCount = Math.min(8, Math.floor(innerWidth / 70));
  const xTicks = d3.ticks(xDomainStart, xDomainEnd, xTickCount);
  const yTicks = yScale.ticks(5);

  // --- Colors ---
  const axisColor = isDark ? colors.neutral[400] : colors.neutral[700];
  const labelColor = isDark ? colors.neutral[200] : colors.neutral[800];
  const lineColor = isDark ? colors.primary[300] : colors.black;
  const noDataColor = isDark ? colors.neutral[400] : colors.neutral[500];

  // --- Animated style for live pan feedback ---
  const animatedStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: svgTranslateX.value }],
  }));

  const showLiveBadge = isAtLiveEdge && isLogging;

  const selectedTimeWindowLabel =
    PILLS.find((p) => p.value === timeWindowSeconds)?.label ??
    `${timeWindowSeconds}s`;

  const timeWindowButtonBg = isDark
    ? colors.charcoal[800]
    : colors.neutral[200];
  const timeWindowButtonText = isDark
    ? colors.neutral[300]
    : colors.neutral[600];

  const openTimeWindowActionSheet = () => {
    const options = [...PILLS.map((p) => p.label), 'Cancel'];
    const cancelButtonIndex = options.length - 1;

    showActionSheetWithOptions(
      {
        options,
        cancelButtonIndex,
        title: 'Time window',
      },
      (selectedIndex?: number) => {
        if (selectedIndex == null) return;
        if (selectedIndex === cancelButtonIndex) return;

        const selectedPill = PILLS[selectedIndex];
        if (!selectedPill) return;

        setTimeWindowSeconds(selectedPill.value);
        timeWindowSV.value = selectedPill.value;
        setPanOffsetSecondsJS(0);
        panOffsetSV.value = 0;
      }
    );
  };

  return (
    <View style={styles.container}>
      {/* Header row: channel label (tap → picker) + LIVE badge */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <TouchableOpacity onPress={() => setPickerVisible(true)}>
            <Text style={[styles.channelLabel, { color: labelColor }]}>
              {CHANNEL_DISPLAY_NAMES[selectedChannel] ?? selectedChannel}
            </Text>
          </TouchableOpacity>
          {showLiveBadge && (
            <View
              style={[
                styles.liveBadge,
                {
                  backgroundColor: isDark
                    ? colors.primary[600]
                    : colors.primary[500],
                },
              ]}
            >
              <Text style={styles.liveBadgeText}>{LIVE_LABEL}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={openTimeWindowActionSheet}
          style={[
            styles.pill,
            styles.timeWindowPill,
            { backgroundColor: timeWindowButtonBg },
          ]}
          accessibilityRole="button"
          accessibilityLabel={`Time window: ${selectedTimeWindowLabel}`}
        >
          <Text style={[styles.pillLabel, { color: timeWindowButtonText }]}>
            {selectedTimeWindowLabel}
          </Text>
        </TouchableOpacity>
      </View>

      <GestureDetector gesture={gesture}>
        <Animated.View style={animatedStyle}>
          <Svg width={chartWidth} height={chartHeight}>
            <G transform={`translate(${margin.left},${margin.top})`}>
              {/* X-axis line */}
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
                <G key={`x-${i}`} transform={`translate(${xScale(tick)},0)`}>
                  <Line
                    y1={innerHeight}
                    y2={innerHeight + 5}
                    stroke={axisColor}
                    strokeWidth={1}
                  />
                  <SvgText
                    x={0}
                    y={innerHeight + 15}
                    fontSize={10}
                    textAnchor="middle"
                    fill={labelColor}
                  >
                    {`${tick.toFixed(1)}s`}
                  </SvgText>
                </G>
              ))}

              {/* Y-axis line */}
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
                <G key={`y-${i}`} transform={`translate(0,${yScale(tick)})`}>
                  <Line x1={-5} x2={0} stroke={axisColor} strokeWidth={1} />
                  <SvgText
                    x={-8}
                    y={0}
                    fontSize={10}
                    textAnchor="end"
                    fill={labelColor}
                    alignmentBaseline="middle"
                  >
                    {tick.toFixed(2)}
                  </SvgText>
                </G>
              ))}

              {/* Data line */}
              {hasData && pathD && (
                <Path
                  d={pathD}
                  stroke={lineColor}
                  strokeWidth={2}
                  fill="none"
                />
              )}

              {/* No data placeholder */}
              {!hasData && (
                <SvgText
                  x={innerWidth / 2}
                  y={innerHeight / 2}
                  fontSize={14}
                  textAnchor="middle"
                  fill={noDataColor}
                  alignmentBaseline="middle"
                >
                  {NO_DATA_LABEL}
                </SvgText>
              )}
            </G>
          </Svg>
        </Animated.View>
      </GestureDetector>

      <ChannelPickerModal
        visible={pickerVisible}
        selectedChannel={selectedChannel}
        onSelect={setSelectedChannel}
        onClose={() => setPickerVisible(false)}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 6,
  },
  headerLeft: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 8,
  },
  channelLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  pill: {
    borderRadius: 12,
    paddingHorizontal: 10,
    paddingVertical: 4,
  },
  timeWindowPill: {
    borderRadius: 999,
  },
  pillLabel: {
    fontSize: 12,
    fontWeight: '600',
  },
  liveBadge: {
    borderRadius: 4,
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  liveBadgeText: {
    color: '#ffffff',
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
});

const pickerStyles = StyleSheet.create({
  closeButton: {
    alignItems: 'center',
    borderTopColor: '#E5E7EB',
    borderTopWidth: 1,
    paddingVertical: 16,
  },
  closeLabel: {
    fontSize: 16,
    fontWeight: '600',
  },
  groupHeader: {
    fontSize: 11,
    fontWeight: '600',
    letterSpacing: 0.8,
    paddingHorizontal: 20,
    paddingTop: 16,
    textTransform: 'uppercase',
  },
  item: {
    borderBottomWidth: StyleSheet.hairlineWidth,
    paddingHorizontal: 20,
    paddingVertical: 14,
  },
  itemLabel: {
    fontSize: 15,
  },
  overlay: {
    backgroundColor: 'rgba(0,0,0,0.5)',
    flex: 1,
    justifyContent: 'flex-end',
  },
  scroll: {
    maxHeight: '75%',
  },
  sheet: {
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingBottom: 32,
    paddingTop: 12,
  },
  title: {
    fontSize: 17,
    fontWeight: '700',
    paddingBottom: 8,
    paddingHorizontal: 20,
    paddingTop: 16,
    textAlign: 'center',
  },
});
