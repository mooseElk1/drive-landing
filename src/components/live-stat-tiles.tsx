import { useColorScheme } from 'nativewind';
import { StyleSheet, View } from 'react-native';

import { Text } from '@/components/ui';
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

  const tileBg = isDark ? colors.charcoal[900] : colors.neutral[100];
  const labelColor = isDark ? colors.neutral[400] : colors.neutral[500];
  const valueColor = isDark ? colors.neutral[100] : colors.neutral[900];
  const unitColor = isDark ? colors.neutral[500] : colors.neutral[400];

  return (
    <View style={styles.row}>
      <View style={[styles.tile, { backgroundColor: tileBg }]}>
        <Text style={[styles.label, { color: labelColor }]}>{'VELOCITY'}</Text>
        <Text style={[styles.value, { color: valueColor }]}>
          {currentVelocity !== null ? currentVelocity.toFixed(2) : '--'}
        </Text>
        <Text style={[styles.unit, { color: unitColor }]}>{'m/s'}</Text>
      </View>

      <View style={[styles.tile, { backgroundColor: tileBg }]}>
        <Text style={[styles.label, { color: labelColor }]}>{'POWER'}</Text>
        <Text style={[styles.value, { color: valueColor }]}>
          {currentPower !== null ? Math.round(currentPower).toString() : '--'}
        </Text>
        <Text style={[styles.unit, { color: unitColor }]}>{'W'}</Text>
      </View>
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
  tile: {
    flex: 1,
    alignItems: 'center',
    borderRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 8,
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
    marginTop: 1,
  },
});
