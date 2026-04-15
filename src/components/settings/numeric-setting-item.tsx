import * as React from 'react';
import { TextInput } from 'react-native';

import { Text, View } from '@/components/ui';
import type { TxKeyPath } from '@/lib';

type NumericSettingItemProps = {
  label: TxKeyPath;
  value: number;
  onChange: (val: number) => void;
  decimalPlaces?: number;
};

export const NumericSettingItem = ({
  label,
  value,
  onChange,
  decimalPlaces = 2,
}: NumericSettingItemProps) => {
  const [text, setText] = React.useState(value.toFixed(decimalPlaces));

  React.useEffect(() => {
    setText(value.toFixed(decimalPlaces));
  }, [value, decimalPlaces]);

  const handleBlur = React.useCallback(() => {
    const parsed = parseFloat(text);
    if (!isNaN(parsed)) {
      onChange(parsed);
    } else {
      setText(value.toFixed(decimalPlaces));
    }
  }, [text, value, decimalPlaces, onChange]);

  return (
    <View className="flex-1 flex-row items-center justify-between px-4 py-2">
      <Text tx={label} />
      <TextInput
        className="min-w-[80px] rounded-md border border-neutral-300 bg-neutral-100 px-2 py-1 text-right text-sm text-black dark:border-neutral-600 dark:bg-neutral-800 dark:text-white"
        value={text}
        onChangeText={setText}
        onBlur={handleBlur}
        keyboardType="decimal-pad"
        selectTextOnFocus
      />
    </View>
  );
};
