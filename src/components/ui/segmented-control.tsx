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
  testID,
}: {
  value: T;
  options: SegmentedOption<T>[];
  onChange: (value: T) => void;
  testID?: string;
}): React.ReactElement {
  return (
    <View
      className="mb-4 flex-row rounded-full bg-neutral-200 p-1 dark:bg-charcoal-800"
      testID={testID}
    >
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={opt.value}
            onPress={() => onChange(opt.value)}
            className={`flex-1 rounded-full px-3 py-2 ${
              selected ? 'bg-white dark:bg-charcoal-950' : 'bg-transparent'
            }`}
            accessibilityRole="button"
            accessibilityState={{ selected }}
            testID={testID ? `${testID}-${opt.value}` : undefined}
          >
            <Text
              className={`text-center text-sm font-semibold ${
                selected
                  ? 'text-neutral-900 dark:text-white'
                  : 'text-neutral-600 dark:text-neutral-300'
              }`}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
