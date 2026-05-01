import * as React from 'react';
import type { SvgProps } from 'react-native-svg';
import Svg, { Polyline } from 'react-native-svg';

export function TrendingUp({ color = '#000', ...props }: SvgProps) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" {...props}>
      <Polyline
        points="23 6 13.5 15.5 8.5 10.5 1 18"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <Polyline
        points="17 6 23 6 23 12"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </Svg>
  );
}
