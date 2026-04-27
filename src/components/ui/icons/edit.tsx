import * as React from 'react';
import type { SvgProps } from 'react-native-svg';
import Svg, { Path } from 'react-native-svg';

export function Edit({ color = '#000', ...props }: SvgProps) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" {...props}>
      <Path
        d="M4 17.25V20h2.75l8.1-8.1-2.75-2.75-8.1 8.1Zm15.71-9.04a1 1 0 0 0 0-1.42l-2.5-2.5a1 1 0 0 0-1.42 0l-1.96 1.96 3.92 3.92 1.96-1.96Z"
        fill={color}
      />
    </Svg>
  );
}
