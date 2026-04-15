import * as React from 'react';
import { Switch } from 'react-native';

import { Text, View } from '@/components/ui';
import type { TxKeyPath } from '@/lib';

type BooleanSettingItemProps = {
  label: TxKeyPath;
  value: boolean;
  onChange: (val: boolean) => void;
};

export const BooleanSettingItem = ({
  label,
  value,
  onChange,
}: BooleanSettingItemProps) => {
  return (
    <View className="flex-1 flex-row items-center justify-between px-4 py-2">
      <Text tx={label} />
      <Switch value={value} onValueChange={onChange} />
    </View>
  );
};
