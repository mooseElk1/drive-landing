import { useColorScheme } from 'nativewind';
import React from 'react';
import {
  Pressable,
  StyleSheet,
  View as RNView,
  type ViewStyle,
} from 'react-native';

import { Text, Tile } from '@/components/ui';
import colors from '@/components/ui/colors';
import { CaretDown } from '@/components/ui/icons';

import { computeZonePrescription } from '../services/zone-calculator-service';
import { useAthleteProfileStore } from '../store/athlete-profile-store';
import { usePowerSessionStore } from '../store/power-session-store';
import type { ZonePrescription } from '../types/training-zones';
import { TrainingZone } from '../types/training-zones';

// ---------------------------------------------------------------------------
// Zone presentation (power-profile framework colors / labels)
// ---------------------------------------------------------------------------

const ZONE_DISPLAY_ORDER: TrainingZone[] = [
  TrainingZone.SPEED_STRENGTH,
  TrainingZone.PEAK_POWER,
  TrainingZone.STRENGTH_SPEED,
  TrainingZone.OVERLOAD,
];

const ZONE_LABELS: Record<TrainingZone, string> = {
  [TrainingZone.SPEED_STRENGTH]: 'Speed-Strength',
  [TrainingZone.PEAK_POWER]: 'Peak Power',
  [TrainingZone.STRENGTH_SPEED]: 'Strength-Speed',
  [TrainingZone.OVERLOAD]: 'Overload',
};

const ZONE_COLORS: Record<TrainingZone, string> = {
  [TrainingZone.SPEED_STRENGTH]: colors.secondary[500],
  [TrainingZone.PEAK_POWER]: colors.primary[400],
  [TrainingZone.STRENGTH_SPEED]: colors.tertiary[500],
  [TrainingZone.OVERLOAD]: colors.danger[500],
};

/** PPL % bands per zone-calculator-service / power-profile rules */
const ZONE_PPL_RANGE_LABEL: Record<TrainingZone, string> = {
  [TrainingZone.SPEED_STRENGTH]: '<60% PPL',
  [TrainingZone.PEAK_POWER]: '70–120% PPL',
  [TrainingZone.STRENGTH_SPEED]: '140–180% PPL',
  [TrainingZone.OVERLOAD]: '>200% PPL',
};

const TILE_CLASS =
  'flex-1 bg-neutral-100 px-4 py-3 dark:bg-charcoal-900 justify-center';

function formatKgRange(
  zone: TrainingZone,
  band: { minLoadKg: number; maxLoadKg: number }
): string {
  const min = band.minLoadKg;
  const max = band.maxLoadKg;
  if (zone === TrainingZone.OVERLOAD || !Number.isFinite(max)) {
    return `${min.toFixed(0)} kg+`;
  }
  if (max <= min) {
    return `${min.toFixed(0)} kg`;
  }
  return `${min.toFixed(0)}–${max.toFixed(0)} kg`;
}

function compactTilePresentation(params: {
  pplLoadKg: number | null;
  targetZone: TrainingZone | null;
  mutedColor: string;
}): { title: string; subtitle: string | null; accentColor: string } {
  const { pplLoadKg, targetZone, mutedColor } = params;
  if (!pplLoadKg) {
    return {
      title: 'NO PPL YET',
      subtitle: 'Run a Discovery Test',
      accentColor: mutedColor,
    };
  }
  if (!targetZone) {
    return {
      title: 'SELECT ZONE',
      subtitle: 'Tap to choose focus',
      accentColor: mutedColor,
    };
  }
  const prescription = computeZonePrescription(pplLoadKg);
  const band = prescription[targetZone];
  return {
    title: ZONE_LABELS[targetZone].toUpperCase(),
    subtitle: formatKgRange(targetZone, band),
    accentColor: ZONE_COLORS[targetZone],
  };
}

// ---------------------------------------------------------------------------
// Compact tile (sits beside SledMassTile)
// ---------------------------------------------------------------------------

export function ZonePrescriptionCompactTile({
  expanded,
  onToggle,
}: {
  expanded: boolean;
  onToggle: () => void;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const activeAthleteId = useAthleteProfileStore((s) => s.activeAthleteId);
  const getAthleteById = useAthleteProfileStore((s) => s.getAthleteById);
  const targetZone = usePowerSessionStore((s) => s.targetZone);

  const athlete = activeAthleteId ? getAthleteById(activeAthleteId) : null;
  const pplLoadKg = athlete?.currentPPL?.pplLoadKg ?? null;

  const mutedColor = colors.neutral[500];
  const labelColor = isDark ? colors.neutral[400] : colors.neutral[500];
  const caretStyle: ViewStyle = {
    transform: [{ rotate: expanded ? '180deg' : '0deg' }],
  };

  const { title, subtitle, accentColor } = compactTilePresentation({
    pplLoadKg,
    targetZone,
    mutedColor,
  });

  return (
    <RNView className="flex-1">
      <Tile
        pressable
        onPress={onToggle}
        variant="full"
        className={TILE_CLASS}
        testID="zone-prescription-compact"
      >
        <RNView style={styles.compactHeaderRow}>
          <Text
            style={[styles.compactLabel, { color: labelColor }]}
            numberOfLines={1}
          >
            {'ZONE TARGET'}
          </Text>
          <RNView style={caretStyle}>
            <CaretDown width={14} height={14} />
          </RNView>
        </RNView>
        <Text
          style={[styles.compactTitle, { color: accentColor }]}
          numberOfLines={1}
        >
          {title}
        </Text>
        {subtitle ? (
          <Text
            style={[styles.compactSubtitle, { color: mutedColor }]}
            numberOfLines={1}
          >
            {subtitle}
          </Text>
        ) : null}
      </Tile>
    </RNView>
  );
}

function NoPrescriptionNudge({
  isDark,
  disabledRowBg,
  mutedSmall,
}: {
  isDark: boolean;
  disabledRowBg: string;
  mutedSmall: string;
}) {
  return (
    <RNView
      style={[
        styles.nudgeRow,
        {
          backgroundColor: disabledRowBg,
          borderColor: isDark ? colors.charcoal[700] : colors.neutral[300],
        },
      ]}
    >
      <Text style={[styles.nudgeTitle, { color: mutedSmall }]}>
        {'Run a Discovery Test to unlock zones'}
      </Text>
    </RNView>
  );
}

function ZonePrescriptionRow({
  zone,
  prescription,
  targetZone,
  isDark,
  rowBg,
  disabledRowBg,
  mutedSmall,
  onSelectZone,
}: {
  zone: TrainingZone;
  prescription: ZonePrescription | null;
  targetZone: TrainingZone | null;
  isDark: boolean;
  rowBg: string;
  disabledRowBg: string;
  mutedSmall: string;
  onSelectZone: (z: TrainingZone) => void;
}) {
  const isSelected = prescription ? targetZone === zone : false;
  const band = prescription?.[zone];
  const kgText = band ? formatKgRange(zone, band) : '—';
  const zoneColor = ZONE_COLORS[zone];
  const canPress = Boolean(prescription);

  const borderColor = isSelected
    ? colors.primary[400]
    : isDark
      ? colors.charcoal[700]
      : colors.neutral[300];

  return (
    <Pressable
      disabled={!canPress}
      onPress={() => onSelectZone(zone)}
      style={({ pressed }) => [
        styles.zoneRow,
        {
          backgroundColor: canPress ? rowBg : disabledRowBg,
          borderColor,
          borderWidth: isSelected ? 2 : 1,
          opacity: !canPress ? 0.55 : pressed ? 0.85 : 1,
        },
      ]}
      testID={`zone-row-${zone}`}
    >
      <RNView style={styles.zoneRowLeft}>
        <Text style={[styles.zoneName, { color: zoneColor }]}>
          {ZONE_LABELS[zone]}
        </Text>
        <Text style={[styles.zonePct, { color: mutedSmall }]}>
          {ZONE_PPL_RANGE_LABEL[zone]}
          {isSelected ? ' · current target' : ''}
        </Text>
      </RNView>
      <Text
        style={[
          styles.zoneKg,
          { color: isDark ? colors.neutral[100] : colors.neutral[900] },
        ]}
      >
        {kgText}
      </Text>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Expanded panel (full width below LoadRow)
// ---------------------------------------------------------------------------

export function ZonePrescriptionExpandedPanel({
  visible,
  onCollapse,
}: {
  visible: boolean;
  onCollapse: () => void;
}) {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const activeAthleteId = useAthleteProfileStore((s) => s.activeAthleteId);
  const getAthleteById = useAthleteProfileStore((s) => s.getAthleteById);
  const targetZone = usePowerSessionStore((s) => s.targetZone);
  const setTargetZone = usePowerSessionStore((s) => s.setTargetZone);

  const athlete = activeAthleteId ? getAthleteById(activeAthleteId) : null;
  const pplLoadKg = athlete?.currentPPL?.pplLoadKg ?? null;

  const prescription: ZonePrescription | null = pplLoadKg
    ? computeZonePrescription(pplLoadKg)
    : null;

  const headerMuted = colors.neutral[500];
  const rowBg = isDark ? colors.charcoal[900] : colors.neutral[100];
  const disabledRowBg = isDark ? colors.charcoal[950] : colors.neutral[200];
  const mutedSmall = isDark ? colors.charcoal[500] : colors.neutral[400];

  if (!visible) return null;

  const onSelectZone = (zone: TrainingZone) => {
    if (!prescription) return;
    setTargetZone(zone);
    onCollapse();
  };

  return (
    <RNView
      className="mt-2 gap-2 rounded-3xl px-1 pb-1 pt-2"
      style={{ backgroundColor: 'transparent' }}
      testID="zone-prescription-expanded"
    >
      <Text style={[styles.panelHeader, { color: headerMuted }]}>
        {'ZONE PRESCRIPTION · 4 ZONES DERIVED FROM PPL'}
      </Text>

      {!prescription ? (
        <NoPrescriptionNudge
          isDark={isDark}
          disabledRowBg={disabledRowBg}
          mutedSmall={mutedSmall}
        />
      ) : null}

      {ZONE_DISPLAY_ORDER.map((zone) => (
        <ZonePrescriptionRow
          key={zone}
          zone={zone}
          prescription={prescription}
          targetZone={targetZone}
          isDark={isDark}
          rowBg={rowBg}
          disabledRowBg={disabledRowBg}
          mutedSmall={mutedSmall}
          onSelectZone={onSelectZone}
        />
      ))}
    </RNView>
  );
}

const styles = StyleSheet.create({
  compactHeaderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  compactLabel: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
  },
  compactTitle: {
    fontSize: 13,
    fontWeight: '800',
    letterSpacing: 0.5,
  },
  compactSubtitle: {
    fontSize: 11,
    fontWeight: '600',
    marginTop: 2,
  },
  panelHeader: {
    fontSize: 9,
    fontWeight: '700',
    letterSpacing: 0.8,
    paddingHorizontal: 8,
    marginBottom: 4,
  },
  nudgeRow: {
    borderRadius: 16,
    borderWidth: 1,
    paddingVertical: 12,
    paddingHorizontal: 14,
    marginBottom: 4,
  },
  nudgeTitle: {
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
  },
  zoneRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderRadius: 16,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },
  zoneRowLeft: {
    flex: 1,
    paddingRight: 12,
  },
  zoneName: {
    fontSize: 15,
    fontWeight: '700',
  },
  zonePct: {
    fontSize: 11,
    fontWeight: '500',
    marginTop: 4,
  },
  zoneKg: {
    fontSize: 16,
    fontWeight: '700',
  },
});
