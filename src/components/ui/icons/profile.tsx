import * as React from 'react';
import type { SvgProps } from 'react-native-svg';
import Svg, { Path } from 'react-native-svg';

export function Profile({ color = '#000', ...props }: SvgProps) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M12 12.2a4.4 4.4 0 1 0 0-8.8 4.4 4.4 0 0 0 0 8.8Zm0 2.2c-4.15 0-7.6 2.52-7.6 5.1 0 .61.49 1.1 1.1 1.1h13c.61 0 1.1-.49 1.1-1.1 0-2.58-3.45-5.1-7.6-5.1Z"
        fill={color}
      />
    </Svg>
  );
}
