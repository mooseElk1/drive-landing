import { useColorScheme } from 'nativewind';
import { StyleSheet, View } from 'react-native';

import { Text, Tile } from '@/components/ui';
import colors from '@/components/ui/colors';
import { useLoggedData } from '@/providers/logged-data-context';
import { CHANNELS } from '@/types/channel-names';

export function LiveStatTiles() {
  const { colorScheme } = useColorScheme();
  const isDark = colorScheme === 'dark';
  const { loggedData } = useLoggedData();

  const velocityArr = loggedData.getLastData(1, CHANNELS.VELOCITY_MAGNITUDE);
  const powerArr = loggedData.getLastData(1, CHANNELS.POWER_MAGNITUDE);
  const currentVelocity: number | null =
    velocityArr.length > 0
      ? (velocityArr[velocityArr.length - 1] ?? null)
      : null;
  const currentPower: number | null =
    powerArr.length > 0 ? (powerArr[powerArr.length - 1] ?? null) : null;

  const labelColor = isDark ? colors.neutral[400] : colors.neutral[500];
  const valueColor = isDark ? colors.neutral[100] : colors.neutral[900];
  const unitColor = isDark ? colors.neutral[500] : colors.neutral[400];

  return (
    <View style={styles.row}>
      <Tile variant="stat" className="bg-neutral-100 dark:bg-charcoal-900">
        <View style={styles.content}>
          <Text style={[styles.label, { color: labelColor }]}>{'POWER'}</Text>
          <View style={styles.valueRow}>
            <Text style={[styles.value, { color: valueColor }]}>
              {currentPower !== null
                ? Math.round(currentPower).toString()
                : '--'}
            </Text>
            <Text style={[styles.unit, { color: unitColor }]}>{'W'}</Text>
          </View>
        </View>
      </Tile>

      <Tile variant="stat" className="bg-neutral-100 dark:bg-charcoal-900">
        <View style={styles.content}>
          <Text style={[styles.label, { color: labelColor }]}>
            {'VELOCITY'}
          </Text>
          <View style={styles.valueRow}>
            <Text style={[styles.value, { color: valueColor }]}>
              {currentVelocity !== null ? currentVelocity.toFixed(2) : '--'}
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
