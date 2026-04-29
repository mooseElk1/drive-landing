import { useColorScheme } from 'nativewind';
import React from 'react';
import { StyleSheet, View as RNView } from 'react-native';
import { showMessage } from 'react-native-flash-message';

import { Text, Tile } from '@/components/ui';
import colors from '@/components/ui/colors';

import { useLoadRecommendation } from '../hooks/use-load-recommendation';
import type { LoadRecommendation } from '../services/load-suggestion-service';
import { TrainingZone } from '../types/training-zones';

// ---------------------------------------------------------------------------
// Zone label helpers
// ---------------------------------------------------------------------------

const ZONE_LABELS: Record<TrainingZone, string> = {
  [TrainingZone.SPEED_STRENGTH]: 'SPEED-STRENGTH',
  [TrainingZone.PEAK_POWER]: 'PEAK POWER',
  [TrainingZone.STRENGTH_SPEED]: 'STRENGTH-SPEED',
  [TrainingZone.OVERLOAD]: 'OVERLOAD',
};

const ZONE_COLORS: Record<TrainingZone, string> = {
  [TrainingZone.SPEED_STRENGTH]: colors.secondary[500],
  [TrainingZone.PEAK_POWER]: colors.primary[400],
  [TrainingZone.STRENGTH_SPEED]: colors.tertiary[500],
  [TrainingZone.OVERLOAD]: colors.danger[500],
};

// ---------------------------------------------------------------------------
// Sub-views for each recommendation kind
// ---------------------------------------------------------------------------

function ZoneTargetView({
  rec,
  labelColor,
  valueColor,
  unitColor,
  mutedColor,
}: {
  rec: Extract<LoadRecommendation, { kind: 'zone_target' }>;
  labelColor: string;
  valueColor: string;
  unitColor: string;
  mutedColor: string;
}) {
  const zoneColor = ZONE_COLORS[rec.zone];
  const zoneLabel = ZONE_LABELS[rec.zone];
  const rangeText =
    Number.isFinite(rec.maxKg) && rec.maxKg !== rec.minKg
      ? `${rec.minKg}–${rec.maxKg} kg`
      : `≥ ${rec.minKg} kg`;

  return (
    <>
      <Text style={[styles.label, { color: labelColor }]}>{'SUGGESTED'}</Text>
      <RNView style={styles.valueRow}>
        <Text style={[styles.value, { color: valueColor }]}>
          {rec.suggestedKg.toFixed(1)}
        </Text>
        <Text style={[styles.unit, { color: unitColor }]}>{'KG'}</Text>
      </RNView>
      <Text style={[styles.zoneBadge, { color: zoneColor }]}>{zoneLabel}</Text>
      <Text style={[styles.rangeText, { color: mutedColor }]}>{rangeText}</Text>
    </>
  );
}

function TrainingPeakNudgeView({
  rec,
  labelColor,
  valueColor,
  unitColor,
  mutedColor,
}: {
  rec: Extract<LoadRecommendation, { kind: 'training_peak_nudge' }>;
  labelColor: string;
  valueColor: string;
  unitColor: string;
  mutedColor: string;
}) {
  const headerColor = colors.primary[400];
  return (
    <>
      <Text style={[styles.zoneBadge, { color: headerColor }]}>
        {'NEW PEAK'}
      </Text>
      <Text style={[styles.label, { color: labelColor }]}>{'SUGGESTED'}</Text>
      <RNView style={styles.valueRow}>
        <Text style={[styles.value, { color: valueColor }]}>
          {rec.suggestedKg.toFixed(1)}
        </Text>
        <Text style={[styles.unit, { color: unitColor }]}>{'KG'}</Text>
      </RNView>
      <Text style={[styles.rangeText, { color: mutedColor }]}>
        {rec.rationale}
      </Text>
    </>
  );
}

function NextSprintView({
  rec,
  labelColor,
  valueColor,
  unitColor,
  mutedColor,
}: {
  rec: Extract<LoadRecommendation, { kind: 'next_sprint' }>;
  labelColor: string;
  valueColor: string;
  unitColor: string;
  mutedColor: string;
}) {
  const testHeaderColor = colors.primary[400];
  const phaseCue =
    rec.phase === 'ascending'
      ? 'Power rising — go heavier'
      : rec.phase === 'near_peak'
        ? 'Near peak — smaller increase'
        : 'Power dropped — step back';

  return (
    <>
      <Text style={[styles.zoneBadge, { color: testHeaderColor }]}>
        {'TEST'}
      </Text>
      <Text style={[styles.label, { color: labelColor }]}>{'NEXT SPRINT'}</Text>
      <RNView style={styles.valueRow}>
        <Text style={[styles.value, { color: valueColor }]}>
          {rec.suggestedKg.toFixed(1)}
        </Text>
        <Text style={[styles.unit, { color: unitColor }]}>{'KG'}</Text>
      </RNView>
      <Text style={[styles.rangeText, { color: mutedColor }]}>{phaseCue}</Text>
      <Text style={[styles.rangeText, { color: mutedColor }]}>
        {rec.rationale}
      </Text>
    </>
  );
}

function DiscoveryStartView({
  rec,
  labelColor,
  valueColor,
  unitColor,
  mutedColor,
}: {
  rec: Extract<LoadRecommendation, { kind: 'discovery_start' }>;
  labelColor: string;
  valueColor: string;
  unitColor: string;
  mutedColor: string;
}) {
  const headerColor = colors.primary[400];
  return (
    <>
      <Text style={[styles.zoneBadge, { color: headerColor }]}>
        {'DISCOVERY TEST'}
      </Text>
      <Text style={[styles.label, { color: labelColor }]}>{'START HERE'}</Text>
      {rec.loadKg !== null ? (
        <RNView style={styles.valueRow}>
          <Text style={[styles.value, { color: valueColor }]}>
            {rec.loadKg.toFixed(1)}
          </Text>
          <Text style={[styles.unit, { color: unitColor }]}>{'KG'}</Text>
        </RNView>
      ) : (
        <Text style={[styles.value, { color: valueColor }]}>{'30% BW'}</Text>
      )}
      <Text style={[styles.rangeText, { color: mutedColor }]}>
        {rec.rationale}
      </Text>
      {rec.loadKg === null ? (
        <Text style={[styles.rangeText, { color: mutedColor }]}>
          {'Add bodyweight in your profile for an exact load.'}
        </Text>
      ) : null}
    </>
  );
}

function FirstSprintStartView({
  rec,
  labelColor,
  valueColor,
  unitColor,
  mutedColor,
}: {
  rec: Extract<LoadRecommendation, { kind: 'first_sprint_start' }>;
  labelColor: string;
  valueColor: string;
  unitColor: string;
  mutedColor: string;
}) {
  const testHeaderColor = colors.primary[400];
  return (
    <>
      <Text style={[styles.zoneBadge, { color: testHeaderColor }]}>
        {'TEST'}
      </Text>
      <Text style={[styles.label, { color: labelColor }]}>{'START HERE'}</Text>
      {rec.suggestedKg !== null ? (
        <RNView style={styles.valueRow}>
          <Text style={[styles.value, { color: valueColor }]}>
            {rec.suggestedKg.toFixed(1)}
          </Text>
          <Text style={[styles.unit, { color: unitColor }]}>{'KG'}</Text>
        </RNView>
      ) : (
        <Text style={[styles.value, { color: valueColor }]}>{'Light'}</Text>
      )}
      <Text style={[styles.rangeText, { color: mutedColor }]}>
        {'Build from the bottom'}
      </Text>
    </>
  );
}

function NoPplNudgeView({ mutedColor }: { mutedColor: string }) {
  return (
    <>
      <Text style={[styles.nudgeTitle, { color: mutedColor }]}>
        {'No PPL yet'}
      </Text>
      <Text style={[styles.nudgeBody, { color: mutedColor }]}>
        {'Run a Discovery Test to unlock load targets'}
      </Text>
    </>
  );
}

// ---------------------------------------------------------------------------
// Main tile
// ---------------------------------------------------------------------------

type ColorSet = {
  labelColor: string;
  valueColor: string;
  unitColor: string;
  mutedColor: string;
};

function RecommendationContent({
  recommendation,
  colors: c,
}: {
  recommendation: LoadRecommendation;
  colors: ColorSet;
}) {
  if (recommendation.kind === 'zone_target')
    return <ZoneTargetView rec={recommendation} {...c} />;
  if (recommendation.kind === 'training_peak_nudge')
    return <TrainingPeakNudgeView rec={recommendation} {...c} />;
  if (recommendation.kind === 'next_sprint')
    return <NextSprintView rec={recommendation} {...c} />;
  if (recommendation.kind === 'discovery_start')
    return <DiscoveryStartView rec={recommendation} {...c} />;
  if (recommendation.kind === 'first_sprint_start')
    return <FirstSprintStartView rec={recommendation} {...c} />;
  return <NoPplNudgeView mutedColor={c.mutedColor} />;
}

function canApplyRecommendation(rec: LoadRecommendation): boolean {
  if (rec.kind === 'no_ppl_nudge') return false;
  if (rec.kind === 'discovery_start' && rec.loadKg === null) return false;
  if (rec.kind === 'first_sprint_start' && rec.suggestedKg === null)
    return false;
  return true;
}

const TILE_CLASS = 'flex-1 bg-neutral-100 px-4 py-3 dark:bg-charcoal-900';

export function LoadRecommendationTile() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { recommendation, applyRecommendation } = useLoadRecommendation();

  const colorSet: ColorSet = {
    labelColor: isDark ? colors.neutral[400] : colors.neutral[500],
    valueColor: isDark ? colors.neutral[100] : colors.neutral[900],
    unitColor: isDark ? colors.neutral[500] : colors.neutral[400],
    mutedColor: isDark ? colors.charcoal[500] : colors.neutral[400],
  };

  if (!recommendation) return null;

  const canApply = canApplyRecommendation(recommendation);

  const handlePress = () => {
    applyRecommendation();
    showMessage({ message: 'Load updated', type: 'success', duration: 1800 });
  };

  const content = (
    <RecommendationContent recommendation={recommendation} colors={colorSet} />
  );

  if (canApply) {
    return (
      <Tile
        pressable
        onPress={handlePress}
        variant="full"
        className={TILE_CLASS}
      >
        {content}
      </Tile>
    );
  }

  return (
    <Tile variant="full" className={TILE_CLASS}>
      {content}
    </Tile>
  );
}

const styles = StyleSheet.create({
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 4,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 4,
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  unit: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 4,
  },
  zoneBadge: {
    fontSize: 9,
    fontWeight: '800',
    letterSpacing: 1.0,
    marginTop: 4,
  },
  rangeText: {
    fontSize: 10,
    fontWeight: '500',
    marginTop: 2,
  },
  nudgeTitle: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 6,
  },
  nudgeBody: {
    fontSize: 10,
    fontWeight: '500',
    lineHeight: 14,
  },
});
