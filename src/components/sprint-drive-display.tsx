import React, { useEffect, useMemo, useState } from 'react';
import { StyleSheet, useWindowDimensions } from 'react-native';
import { BarChart } from 'react-native-gifted-charts';

import { Text, View } from '@/components/ui';
import type {
  SprintAnalysisService,
  SprintAnalysisState,
} from '@/features/workout/services/sprint-analysis-service';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0F18',
    paddingHorizontal: 16,
    paddingTop: 12,
  },
  titleRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
    color: '#D1D5DB',
    letterSpacing: 1,
  },
  status: {
    fontSize: 12,
    color: '#6B7280',
  },
  chartWrap: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    overflow: 'visible',
  },
  statsCard: {
    borderWidth: 1,
    borderColor: '#1F2937',
    borderRadius: 12,
    padding: 12,
    backgroundColor: '#0B1220',
    marginTop: 12,
    marginBottom: 6,
  },
  statsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  statLabel: {
    color: '#6B7280',
    fontSize: 12,
    letterSpacing: 1,
  },
  statValue: {
    color: '#D1D5DB',
    fontSize: 12,
    fontWeight: '700',
  },
  statSubValue: {
    color: '#9CA3AF',
    fontSize: 11,
    fontWeight: '600',
  },
  hint: {
    color: '#6B7280',
    fontSize: 12,
    textAlign: 'center',
    marginTop: 6,
    marginBottom: 6,
  },
  barValueLabel: {
    color: '#D1D5DB',
    fontSize: 9,
    fontWeight: '700',
    textAlign: 'center',
  },
  barValueLabelSmall: {
    fontSize: 8,
  },
  barValueLabelWrap: {
    transform: [{ translateY: -8 }],
    alignItems: 'center',
    overflow: 'visible',
  },
  barValuePill: {
    paddingHorizontal: 2,
    alignItems: 'center',
    alignSelf: 'center',
    overflow: 'visible',
  },
});

function formatSeconds(ms: number) {
  return (ms / 1000).toFixed(2);
}

function formatMeters(m: number) {
  return m.toFixed(2);
}

function useSprintAnalysisState(service: SprintAnalysisService) {
  const [state, setState] = useState<SprintAnalysisState>(() => ({
    status: 'idle',
    summary: {
      startedAt: null,
      endedAt: null,
      durationMs: 0,
      distanceM: 0,
      driveCount: 0,
      peakVelocity: null,
      peakPower: null,
    },
    driveEvents: [],
  }));

  useEffect(() => {
    const sub = service.subscribe(setState);
    return () => sub.unsubscribe();
  }, [service]);

  return state;
}

export function SprintDriveDisplay({
  sprintAnalysisService,
}: {
  sprintAnalysisService: SprintAnalysisService;
}) {
  const state = useSprintAnalysisState(sprintAnalysisService);

  const BAR_WIDTH = 18;
  const BAR_SPACING = 8;
  const { width: windowWidth } = useWindowDimensions();
  const chartWidth = Math.max(0, windowWidth - 32); // container has 16px horizontal padding
  const CHART_END_SPACING = 16; // keep latest bar comfortably inside the right edge

  const peakRofdDriveIndex = useMemo(() => {
    if (state.driveEvents.length === 0) return null;
    let best = state.driveEvents[0]!;
    for (const d of state.driveEvents) {
      if (d.peakJerk > best.peakJerk) best = d;
    }
    return best.index;
  }, [state.driveEvents]);

  const bars = useMemo(() => {
    return state.driveEvents.map((d) => {
      const v = Math.max(0, d.peakJerk);
      const label = v >= 100 ? v.toFixed(0) : v.toFixed(1);
      const isWide = label.length >= 3;
      const isPeak =
        peakRofdDriveIndex !== null && d.index === peakRofdDriveIndex;
      return {
        value: v,
        label: `${d.index}`,
        frontColor: isPeak ? '#FFC947' : '#4BC3FF',
        topLabelComponent: () => (
          <View style={styles.barValueLabelWrap}>
            <View style={styles.barValuePill}>
              <Text
                style={[
                  styles.barValueLabel,
                  isWide ? styles.barValueLabelSmall : null,
                ]}
              >
                {label}
              </Text>
            </View>
          </View>
        ),
      };
    });
  }, [peakRofdDriveIndex, state.driveEvents]);

  const maxBar = useMemo(() => {
    if (bars.length === 0) return 1;
    return Math.max(...bars.map((b) => b.value), 1);
  }, [bars]);

  // Add headroom so top labels never clip on the tallest bar.
  const chartMaxValue = useMemo(() => maxBar * 1.15, [maxBar]);

  const { summary } = state;

  return (
    <View style={styles.container}>
      <View style={styles.titleRow}>
        <Text style={styles.title} className="font-primaryBold">
          DRIVES
        </Text>
        <Text style={styles.status}>
          {state.status === 'recording'
            ? 'RECORDING'
            : state.status === 'stopped'
              ? 'STOPPED'
              : 'IDLE'}
        </Text>
      </View>

      <View style={styles.chartWrap}>
        <BarChart
          data={bars}
          width={chartWidth}
          height={220}
          barWidth={BAR_WIDTH}
          spacing={BAR_SPACING}
          initialSpacing={0}
          endSpacing={CHART_END_SPACING}
          maxValue={chartMaxValue}
          noOfSections={4}
          hideRules
          yAxisThickness={0}
          xAxisThickness={0}
          hideYAxisText
          xAxisLabelTextStyle={{ color: '#6B7280', fontSize: 10 }}
          showScrollIndicator={false}
          scrollToEnd
          isAnimated
          animationDuration={250}
        />
        <Text style={styles.hint}>
          Peak jerk per drive (d(acc_mag_filt)/dt). Peak ROFD is highlighted.
        </Text>
      </View>

      <View style={styles.statsCard}>
        <View style={styles.statsRow}>
          <Text style={styles.statLabel}>TIME</Text>
          <Text style={styles.statValue}>
            {formatSeconds(summary.durationMs)}s
          </Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statLabel}>DRIVES</Text>
          <Text style={styles.statValue}>{summary.driveCount}</Text>
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statLabel}>PEAK V</Text>
          {summary.peakVelocity ? (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.statValue}>
                {summary.peakVelocity.value.toFixed(2)} m/s
              </Text>
              <Text style={styles.statSubValue}>
                {formatSeconds(summary.peakVelocity.timeFromStartMs)}s •{' '}
                {summary.peakVelocity.drivesSoFar} drives
              </Text>
            </View>
          ) : (
            <Text style={styles.statValue}>--</Text>
          )}
        </View>
        <View style={styles.statsRow}>
          <Text style={styles.statLabel}>PEAK P</Text>
          {summary.peakPower ? (
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={styles.statValue}>
                {summary.peakPower.value.toFixed(0)} W
              </Text>
              <Text style={styles.statSubValue}>
                {formatSeconds(summary.peakPower.timeFromStartMs)}s •{' '}
                {summary.peakPower.drivesSoFar} drives
              </Text>
            </View>
          ) : (
            <Text style={styles.statValue}>--</Text>
          )}
        </View>
      </View>
    </View>
  );
}
