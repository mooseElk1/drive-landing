import React from 'react';
import { StyleSheet } from 'react-native';

import { Text, View } from '@/components/ui';

type StatTone = 'accent' | 'default';

function formatNumber(
  value: number | null | undefined,
  digits: number
): string | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return value.toFixed(digits);
}

function formatInt(value: number | null | undefined): string | null {
  if (value === null || value === undefined || Number.isNaN(value)) return null;
  return `${Math.round(value)}`;
}

function formatDateLine(date: Date): string {
  // Keep this deterministic and readable; History already uses device locale for date,
  // but we want a single consistent "Session date" line.
  return date.toLocaleDateString();
}

function Stat({
  label,
  value,
  unit,
  tone = 'default',
}: {
  label: string;
  value: string | null;
  unit?: string;
  tone?: StatTone;
}) {
  const valueColor =
    tone === 'accent' ? styles.valueAccent : styles.valueDefault;

  return (
    <View style={styles.statCell}>
      <Text style={styles.statLabel} className="font-primaryMedium">
        {label}
      </Text>
      <View style={styles.valueRow}>
        <Text
          style={[styles.statValue, valueColor]}
          className="font-primaryBold"
        >
          {value ?? '—'}
        </Text>
        {unit ? (
          <Text style={styles.statUnit} className="font-primaryMedium">
            {unit}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

export function SprintHistoryCard({
  sessionDate,
  sprintNumber,
  peakVelocity,
  peakPower,
  drivesToPeakVelocity,
  drivesToPeakPower,
  totalDrives,
  peakJerk,
  sledMassKg,
}: {
  sessionDate: Date;
  sprintNumber: number;
  peakVelocity?: number | null;
  peakPower?: number | null;
  drivesToPeakVelocity?: number | null;
  drivesToPeakPower?: number | null;
  totalDrives?: number | null;
  peakJerk?: number | null;
  sledMassKg?: number | null;
}) {
  return (
    <View style={styles.card}>
      <View style={styles.headerRow}>
        <View>
          <Text style={styles.headerTitle} className="font-primarySemiBold">
            Sprint {sprintNumber}
          </Text>
          <Text style={styles.headerSubtitle} className="font-primaryMedium">
            {formatDateLine(sessionDate)}
          </Text>
        </View>
        <View style={styles.headerDot} />
      </View>

      <View style={styles.grid}>
        <Stat
          label="Peak velocity"
          value={formatNumber(peakVelocity, 2)}
          unit="m/s"
          tone="accent"
        />
        <Stat
          label="Load"
          value={
            sledMassKg === null || sledMassKg === undefined
              ? null
              : formatInt(sledMassKg)
          }
          unit="kg"
        />

        <Stat
          label="Peak power"
          value={formatInt(peakPower)}
          unit="W"
          tone="accent"
        />
        <Stat label="Total drives" value={formatInt(totalDrives)} />

        <Stat
          label="Drives to peak vel"
          value={formatInt(drivesToPeakVelocity)}
        />
        <Stat
          label="Drives to peak power"
          value={formatInt(drivesToPeakPower)}
        />

        <Stat label="Peak jerk" value={formatNumber(peakJerk, 2)} unit="m/s³" />
        <View style={styles.statCell} />
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#0B101A',
    borderRadius: 14,
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.08)',
    padding: 14,
    marginBottom: 12,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  headerTitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.75)',
    letterSpacing: 0.4,
  },
  headerSubtitle: {
    marginTop: 2,
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
  },
  headerDot: {
    width: 6,
    height: 6,
    borderRadius: 999,
    backgroundColor: '#FFC947',
    opacity: 0.9,
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  statCell: {
    width: '50%',
    paddingTop: 8,
    paddingBottom: 6,
    paddingRight: 8,
  },
  statLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.45)',
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 6,
    marginTop: 2,
  },
  statValue: {
    fontSize: 18,
    letterSpacing: 0.2,
  },
  valueDefault: {
    color: 'rgba(255,255,255,0.9)',
  },
  valueAccent: {
    color: '#FFC947',
  },
  statUnit: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.55)',
  },
});
