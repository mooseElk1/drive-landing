import { useColorScheme } from 'nativewind';
import { StyleSheet, View } from 'react-native';

import { Text, Tile } from '@/components/ui';
import colors from '@/components/ui/colors';
import { usePowerSessionStore } from '@/features/power-profile/store/power-session-store';

export function SessionPeakTiles() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';

  const sessionPeakPower = usePowerSessionStore((s) => s.sessionPeakPower);
  const sessionPeakVelocity = usePowerSessionStore(
    (s) => s.sessionPeakVelocity
  );

  const labelColor = isDark ? colors.neutral[400] : colors.neutral[500];
  const valueColor = isDark ? colors.neutral[100] : colors.neutral[900];
  const unitColor = isDark ? colors.neutral[500] : colors.neutral[400];

  return (
    <View style={styles.row}>
      <Tile variant="stat" className="bg-neutral-100 dark:bg-charcoal-900">
        <View style={styles.content}>
          <Text style={[styles.label, { color: labelColor }]}>
            {'SESSION PEAK PWR'}
          </Text>
          <View style={styles.valueRow}>
            <Text style={[styles.value, { color: valueColor }]}>
              {sessionPeakPower != null
                ? Math.round(sessionPeakPower).toString()
                : '--'}
            </Text>
            <Text style={[styles.unit, { color: unitColor }]}>{'W'}</Text>
          </View>
        </View>
      </Tile>

      <Tile variant="stat" className="bg-neutral-100 dark:bg-charcoal-900">
        <View style={styles.content}>
          <Text style={[styles.label, { color: labelColor }]}>
            {'SESSION PEAK VEL'}
          </Text>
          <View style={styles.valueRow}>
            <Text style={[styles.value, { color: valueColor }]}>
              {sessionPeakVelocity != null
                ? sessionPeakVelocity.toFixed(2)
                : '--'}
            </Text>
            <Text style={[styles.unit, { color: unitColor }]}>{'m/s'}</Text>
          </View>
        </View>
      </Tile>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 10,
    paddingHorizontal: 20,
    paddingBottom: 8,
    paddingTop: 4,
  },
  content: {
    width: '100%',
    alignItems: 'flex-start',
    paddingLeft: 8,
  },
  valueRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  label: {
    fontSize: 10,
    fontWeight: '700',
    letterSpacing: 1.2,
    marginBottom: 2,
  },
  value: {
    fontSize: 28,
    fontWeight: '700',
    lineHeight: 34,
  },
  unit: {
    fontSize: 11,
    fontWeight: '500',
    marginLeft: 6,
  },
});
