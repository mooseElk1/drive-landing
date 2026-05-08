import { useColorScheme } from 'nativewind';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import {
  Animated,
  Modal as RNModal,
  Pressable,
  type ScrollView,
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
  'w-full bg-neutral-100 px-4 py-3 dark:bg-charcoal-900 justify-center';

/** Vertical peek carousel: one centered row + partial rows above/below */
const CAROUSEL_ITEM_HEIGHT = 96;
const CAROUSEL_VISIBLE_ROWS = 3;

function clampCarouselIndex(i: number, len: number): number {
  return Math.max(0, Math.min(len - 1, Math.round(i)));
}

function getCarouselAnimations(params: {
  scrollY: Animated.Value;
  index: number;
}): {
  opacity: Animated.AnimatedInterpolation<number>;
  scale: Animated.AnimatedInterpolation<number>;
} {
  const { scrollY, index } = params;
  const h = CAROUSEL_ITEM_HEIGHT;
  const opacity = scrollY.interpolate({
    inputRange: [(index - 1) * h, index * h, (index + 1) * h],
    outputRange: [0.55, 1, 0.55],
    extrapolate: 'clamp',
  });
  const scale = scrollY.interpolate({
    inputRange: [(index - 1) * h, index * h, (index + 1) * h],
    outputRange: [0.92, 1, 0.92],
    extrapolate: 'clamp',
  });
  return { opacity, scale };
}

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
// Compact tile (stacked below SledMassTile on workout screen)
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
    <RNView className="w-full">
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

function ZoneCarouselCard({
  zone,
  index,
  prescription,
  scrollY,
  isDark,
  rowBg,
  mutedSmall,
  onPress,
}: {
  zone: TrainingZone;
  index: number;
  prescription: ZonePrescription | null;
  scrollY: Animated.Value;
  isDark: boolean;
  rowBg: string;
  mutedSmall: string;
  onPress: () => void;
}) {
  const kgText =
    prescription !== null ? formatKgRange(zone, prescription[zone]) : '—';
  const zoneColor = ZONE_COLORS[zone];
  const borderColor = isDark ? colors.charcoal[700] : colors.neutral[300];

  const { opacity, scale } = getCarouselAnimations({ scrollY, index });

  return (
    <Pressable
      onPress={onPress}
      style={styles.carouselSlot}
      testID={`zone-row-${zone}`}
    >
      <Animated.View
        style={[
          styles.carouselCardOuter,
          {
            opacity,
            transform: [{ scale }],
            borderColor,
            backgroundColor: rowBg,
          },
        ]}
      >
        <RNView style={styles.carouselCardInner}>
          <RNView style={styles.carouselCardLeft}>
            <Text style={[styles.zoneName, { color: zoneColor }]}>
              {ZONE_LABELS[zone]}
            </Text>
            <Text style={[styles.zonePct, { color: mutedSmall }]}>
              {ZONE_PPL_RANGE_LABEL[zone]}
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
        </RNView>
      </Animated.View>
    </Pressable>
  );
}

// ---------------------------------------------------------------------------
// Expanded panel (centered modal over workout screen)
// ---------------------------------------------------------------------------

function ZoneTargetCarouselList({
  prescription,
  scrollRef,
  scrollY,
  carouselHeight,
  onMomentumScrollEnd,
  onPressZone,
  isDark,
  mutedSmall,
}: {
  prescription: ZonePrescription | null;
  scrollRef: React.RefObject<ScrollView | null>;
  scrollY: Animated.Value;
  carouselHeight: number;
  onMomentumScrollEnd: (e: {
    nativeEvent: { contentOffset: { y: number } };
  }) => void;
  onPressZone: (index: number) => void;
  isDark: boolean;
  mutedSmall: string;
}) {
  const rowBg = isDark ? colors.charcoal[900] : colors.neutral[100];
  return (
    <Animated.ScrollView
      ref={scrollRef}
      testID="zone-prescription-carousel"
      style={{ height: carouselHeight }}
      contentContainerStyle={{ paddingVertical: CAROUSEL_ITEM_HEIGHT }}
      showsVerticalScrollIndicator={false}
      snapToInterval={CAROUSEL_ITEM_HEIGHT}
      snapToAlignment="start"
      decelerationRate="fast"
      onScroll={Animated.event(
        [{ nativeEvent: { contentOffset: { y: scrollY } } }],
        { useNativeDriver: true }
      )}
      onMomentumScrollEnd={onMomentumScrollEnd}
      scrollEventThrottle={16}
    >
      {ZONE_DISPLAY_ORDER.map((zone, index) => (
        <ZoneCarouselCard
          key={zone}
          zone={zone}
          index={index}
          prescription={prescription}
          scrollY={scrollY}
          isDark={isDark}
          rowBg={rowBg}
          mutedSmall={mutedSmall}
          onPress={() => onPressZone(index)}
        />
      ))}
    </Animated.ScrollView>
  );
}

function ZoneTargetCarouselPopup({
  visible,
  onCollapse,
  isDark,
  headerMuted,
  mutedSmall,
  prescription,
  scrollRef,
  scrollY,
  carouselHeight,
  onMomentumScrollEnd,
  onPressZone,
}: {
  visible: boolean;
  onCollapse: () => void;
  isDark: boolean;
  headerMuted: string;
  mutedSmall: string;
  prescription: ZonePrescription | null;
  scrollRef: React.RefObject<ScrollView | null>;
  scrollY: Animated.Value;
  carouselHeight: number;
  onMomentumScrollEnd: (e: {
    nativeEvent: { contentOffset: { y: number } };
  }) => void;
  onPressZone: (index: number) => void;
}) {
  const popupBg = isDark ? colors.charcoal[900] : colors.neutral[50];
  return (
    <RNModal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onCollapse}
      testID="zone-prescription-expanded"
    >
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Dismiss zone picker"
        style={styles.backdrop}
        onPress={onCollapse}
      >
        <RNView
          style={[styles.popupCard, { backgroundColor: popupBg }]}
          onStartShouldSetResponder={() => true}
        >
          <Text style={[styles.panelHeader, { color: headerMuted }]}>
            {'ZONE PRESCRIPTION · 4 ZONES DERIVED FROM PPL'}
          </Text>
          {!prescription ? (
            <Text style={[styles.noPplHint, { color: mutedSmall }]}>
              {'Run a Discovery Test to see weight ranges'}
            </Text>
          ) : null}
          <ZoneTargetCarouselList
            prescription={prescription}
            scrollRef={scrollRef}
            scrollY={scrollY}
            carouselHeight={carouselHeight}
            onMomentumScrollEnd={onMomentumScrollEnd}
            onPressZone={onPressZone}
            isDark={isDark}
            mutedSmall={mutedSmall}
          />
        </RNView>
      </Pressable>
    </RNModal>
  );
}

export function ZonePrescriptionExpandedPanel({
  visible,
  onCollapse,
}: {
  visible: boolean;
  onCollapse: () => void;
}) {
  const model = useZonePickerModel({ visible });

  return (
    <ZoneTargetCarouselPopup
      visible={visible}
      onCollapse={onCollapse}
      isDark={model.isDark}
      headerMuted={model.headerMuted}
      mutedSmall={model.mutedSmall}
      prescription={model.prescription}
      scrollRef={model.scrollRef}
      scrollY={model.scrollY}
      carouselHeight={model.carouselHeight}
      onMomentumScrollEnd={model.onMomentumScrollEnd}
      onPressZone={model.scrollToIndex}
    />
  );
}

function useZonePickerModel(params: { visible: boolean }) {
  const { visible } = params;
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
  const mutedSmall = isDark ? colors.charcoal[500] : colors.neutral[400];

  const scrollRef = useRef<ScrollView | null>(null);
  const scrollY = useRef(new Animated.Value(0)).current;

  const zoneCount = ZONE_DISPLAY_ORDER.length;
  const initialIndex = useMemo(() => {
    const resolved = targetZone ?? TrainingZone.PEAK_POWER;
    let idx = ZONE_DISPLAY_ORDER.indexOf(resolved);
    if (idx === -1) {
      idx = ZONE_DISPLAY_ORDER.indexOf(TrainingZone.PEAK_POWER);
    }
    return idx === -1 ? 0 : idx;
  }, [targetZone]);

  useEffect(() => {
    if (!visible) return;
    const y = initialIndex * CAROUSEL_ITEM_HEIGHT;
    scrollRef.current?.scrollTo({ y, animated: false });
    scrollY.setValue(y);
  }, [visible, initialIndex, scrollY]);

  const onMomentumScrollEnd = useCallback(
    (e: { nativeEvent: { contentOffset: { y: number } } }) => {
      const raw = e.nativeEvent.contentOffset.y / CAROUSEL_ITEM_HEIGHT;
      const i = clampCarouselIndex(raw, zoneCount);
      const selected = ZONE_DISPLAY_ORDER[i];
      if (selected !== undefined) {
        setTargetZone(selected);
      }
    },
    [setTargetZone, zoneCount]
  );

  const scrollToIndex = useCallback((i: number) => {
    const y = i * CAROUSEL_ITEM_HEIGHT;
    scrollRef.current?.scrollTo({ y, animated: true });
  }, []);

  const carouselHeight = CAROUSEL_ITEM_HEIGHT * CAROUSEL_VISIBLE_ROWS;

  return {
    isDark,
    headerMuted,
    mutedSmall,
    prescription,
    scrollRef,
    scrollY,
    carouselHeight,
    onMomentumScrollEnd,
    scrollToIndex,
  };
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 16,
  },
  popupCard: {
    width: '88%',
    maxWidth: 420,
    borderRadius: 24,
    padding: 16,
  },
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
  noPplHint: {
    fontSize: 11,
    fontStyle: 'italic',
    fontWeight: '500',
    textAlign: 'center',
    paddingHorizontal: 12,
    marginBottom: 8,
  },
  carouselSlot: {
    height: CAROUSEL_ITEM_HEIGHT,
    justifyContent: 'center',
    paddingHorizontal: 8,
  },
  carouselCardOuter: {
    flex: 1,
    borderRadius: 16,
    borderWidth: 1,
    overflow: 'hidden',
  },
  carouselCardInner: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 10,
    paddingHorizontal: 14,
  },
  carouselCardLeft: {
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
