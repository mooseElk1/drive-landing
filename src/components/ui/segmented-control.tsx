import React from 'react';
import { Pressable, View } from 'react-native';

import { Text } from './text';

export type SegmentedOption<T extends string> = {
  value: T;
  label: string;
};

export function SegmentedControl<T extends string>({
  value,
  options,
  onChange,
  size = 'md',
  className,
  optionClassName,
  testID,
}: {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  size?: 'sm' | 'md';
  className?: string;
  optionClassName?: string;
  testID?: string;
}): React.ReactElement {
  const container =
    `flex-row overflow-hidden rounded-xl bg-neutral-200 p-1 dark:bg-charcoal-800 ${
      className ?? ''
    }`.trim();
  const option = (selected: boolean) =>
    `flex-1 ${selected ? 'rounded-lg' : 'rounded-xl'} ${
      size === 'sm' ? 'px-2 py-1.5' : 'px-3 py-2'
    } ${selected ? 'bg-white dark:bg-charcoal-950' : 'bg-transparent'} ${
      optionClassName ?? ''
    }`.trim();
  const label = (selected: boolean) =>
    `text-center font-semibold ${size === 'sm' ? 'text-xs' : 'text-sm'} ${
      selected
        ? 'text-neutral-900 dark:text-white'
        : 'text-neutral-600 dark:text-neutral-300'
    }`;

  return (
    <View className={container} testID={testID}>
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            className={option(selected)}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            testID={testID ? `${testID}-${opt.value}` : undefined}
          >
            <Text className={label(selected)}>{opt.label}</Text>
          </Pressable>
        );
      })}
    </View>
  );
}
