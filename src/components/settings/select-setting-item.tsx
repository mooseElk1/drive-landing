import * as React from 'react';
import { Pressable } from 'react-native';

import { Text, View } from '@/components/ui';
import type { TxKeyPath } from '@/lib';
import { translate } from '@/lib';

type SelectOption<T extends string> = {
  value: T;
  labelKey: TxKeyPath;
};

type SelectSettingItemProps<T extends string> = {
  label: TxKeyPath;
  value: T;
  options: SelectOption<T>[];
  onChange: (val: T) => void;
};

export function SelectSettingItem<T extends string>({
  label,
  value,
  options,
  onChange,
}: SelectSettingItemProps<T>) {
  return (
    <View className="flex-1 flex-row items-center justify-between px-4 py-2">
      <Text tx={label} />
      <View className="flex-row gap-1">
        {options.map((opt) => {
          const selected = opt.value === value;
          return (
            <Pressable
              key={opt.value}
              onPress={() => onChange(opt.value)}
              className={`rounded px-3 py-1 ${
                selected
                  ? 'bg-neutral-700 dark:bg-neutral-300'
                  : 'bg-neutral-200 dark:bg-neutral-600'
              }`}
            >
              <Text
                className={
                  selected
                    ? 'text-white dark:text-neutral-900'
                    : 'text-neutral-700 dark:text-neutral-200'
                }
              >
                {translate(opt.labelKey)}
              </Text>
            </Pressable>
          );
        })}
      </View>
    </View>
  );
}
