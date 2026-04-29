import React from 'react';
import type { ViewStyle } from 'react-native';
import { Pressable } from 'react-native';

import { ChevronLeft } from '@/components/ui/icons';
import { translate } from '@/lib/i18n/utils';

type Props = {
  onPress: () => void;
  color?: string;
  style?: ViewStyle;
  accessibilityLabel?: string;
};

const DEFAULT_STYLE: ViewStyle = { marginLeft: 12 };

export function HeaderBackButton({
  onPress,
  color,
  style,
  accessibilityLabel,
}: Props): React.ReactElement {
  return (
    <Pressable
      onPress={onPress}
      hitSlop={10}
      accessibilityRole="button"
      accessibilityLabel={
        accessibilityLabel ?? translate('powerProfile.sessionDetail.back')
      }
      style={[DEFAULT_STYLE, style]}
    >
      <ChevronLeft color={color} />
    </Pressable>
  );
}
