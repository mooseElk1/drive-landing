import React from 'react';
import { Pressable, View } from 'react-native';

import { Text } from './text';

export function PillToggleChip({
  label,
  active,
  onPress,
  testID,
  minWidthClassName = 'min-w-10',
  containerClassName,
}: {
  label: string;
  active: boolean;
  onPress: () => void;
  testID?: string;
  minWidthClassName?: string;
  containerClassName?: string;
}): React.ReactElement {
  const container =
    `flex-row overflow-hidden rounded-full bg-neutral-200 p-1 dark:bg-charcoal-800 ${
      containerClassName ?? ''
    }`.trim();
  const option = `items-center justify-center px-2 py-1 ${minWidthClassName} ${
    active ? 'rounded-full bg-white dark:bg-charcoal-950' : 'rounded-full'
  }`;
  const labelClassName = `text-center text-xs font-semibold ${
    active
      ? 'text-neutral-900 dark:text-white'
      : 'text-neutral-600 dark:text-neutral-300'
  } leading-none`;

  return (
    <View className={container}>
      <Pressable
        onPress={onPress}
        className={option}
        accessibilityRole="button"
        accessibilityState={{ selected: active }}
        testID={testID}
      >
        <Text className={labelClassName}>{label}</Text>
      </Pressable>
    </View>
  );
}
