import * as React from 'react';
import type { SvgProps } from 'react-native-svg';
import Svg, { Circle, Line } from 'react-native-svg';

export function Sliders({ color = '#000', ...props }: SvgProps) {
  return (
    <Svg width={24} height={24} viewBox="0 0 24 24" fill="none" {...props}>
      <Line
        x1="4"
        y1="21"
        x2="4"
        y2="14"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Line
        x1="4"
        y1="10"
        x2="4"
        y2="3"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Line
        x1="12"
        y1="21"
        x2="12"
        y2="12"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Line
        x1="12"
        y1="8"
        x2="12"
        y2="3"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Line
        x1="20"
        y1="21"
        x2="20"
        y2="16"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Line
        x1="20"
        y1="12"
        x2="20"
        y2="3"
        stroke={color}
        strokeWidth={2}
        strokeLinecap="round"
      />
      <Circle cx="4" cy="12" r="2" stroke={color} strokeWidth={2} />
      <Circle cx="12" cy="10" r="2" stroke={color} strokeWidth={2} />
      <Circle cx="20" cy="14" r="2" stroke={color} strokeWidth={2} />
    </Svg>
  );
}
