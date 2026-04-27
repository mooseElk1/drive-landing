/* eslint-disable max-lines-per-function */
import React from 'react';
import Svg, { Circle, Line, Rect, Text as SvgText } from 'react-native-svg';

import colors from '@/components/ui/colors';

export type PvPoint = {
  loadKg: number;
  peakPowerW?: number | null;
  peakVelocity?: number | null;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

export function PvScatterPlot({
  points,
  width,
  height,
  yLabelPower,
  yLabelVelocity,
  xLabelLoad,
  testID,
}: {
  points: PvPoint[];
  width: number;
  height: number;
  yLabelPower: string;
  yLabelVelocity: string;
  xLabelLoad: string;
  testID?: string;
}): React.ReactElement {
  const padding = 24;
  const innerW = Math.max(1, width - padding * 2);
  const innerH = Math.max(1, height - padding * 2);

  const valid = points.filter(
    (p) =>
      Number.isFinite(p.loadKg) &&
      (Number.isFinite(p.peakPowerW ?? NaN) ||
        Number.isFinite(p.peakVelocity ?? NaN))
  );

  const loads = valid.map((p) => p.loadKg);
  const powers = valid
    .map((p) => p.peakPowerW)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  const vels = valid
    .map((p) => p.peakVelocity)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));

  const minLoad = loads.length ? Math.min(...loads) : 0;
  const maxLoad = loads.length ? Math.max(...loads) : 1;

  const minPower = powers.length ? Math.min(...powers) : 0;
  const maxPower = powers.length ? Math.max(...powers) : 1;

  const minVel = vels.length ? Math.min(...vels) : 0;
  const maxVel = vels.length ? Math.max(...vels) : 1;

  const scaleX = (loadKg: number) => {
    const t =
      maxLoad === minLoad ? 0.5 : (loadKg - minLoad) / (maxLoad - minLoad);
    return padding + clamp(t, 0, 1) * innerW;
  };

  // For now we plot power points only if present, otherwise velocity.
  const hasPower = powers.length > 0;
  const scaleY = (p: PvPoint) => {
    if (hasPower) {
      const power = p.peakPowerW ?? 0;
      const t =
        maxPower === minPower
          ? 0.5
          : (power - minPower) / (maxPower - minPower);
      return padding + (1 - clamp(t, 0, 1)) * innerH;
    }

    const vel = p.peakVelocity ?? 0;
    const t = maxVel === minVel ? 0.5 : (vel - minVel) / (maxVel - minVel);
    return padding + (1 - clamp(t, 0, 1)) * innerH;
  };

  const axisColor = colors.neutral[400];
  const dotColor = colors.primary[300];

  return (
    <Svg width={width} height={height} testID={testID}>
      <Rect x={0} y={0} width={width} height={height} fill="transparent" />
      <Line
        x1={padding}
        y1={padding}
        x2={padding}
        y2={height - padding}
        stroke={axisColor}
        strokeWidth={1}
      />
      <Line
        x1={padding}
        y1={height - padding}
        x2={width - padding}
        y2={height - padding}
        stroke={axisColor}
        strokeWidth={1}
      />

      <SvgText x={padding} y={padding - 8} fill={axisColor} fontSize={10}>
        {hasPower ? yLabelPower : yLabelVelocity}
      </SvgText>

      <SvgText
        x={width - padding}
        y={height - 6}
        fill={axisColor}
        fontSize={10}
        textAnchor="end"
      >
        {xLabelLoad}
      </SvgText>

      {valid.map((p, idx) => {
        const cx = scaleX(p.loadKg);
        const cy = scaleY(p);
        return (
          <Circle
            key={`${p.loadKg}-${idx}`}
            cx={cx}
            cy={cy}
            r={4}
            fill={dotColor}
          />
        );
      })}
    </Svg>
  );
}
