/* eslint-disable max-lines-per-function */
import React from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Svg, {
  Circle,
  G,
  Line,
  Path,
  Rect,
  Text as SvgText,
} from 'react-native-svg';

import { Text, View } from '@/components/ui';
import colors from '@/components/ui/colors';
import { computeZonePrescription } from '@/features/power-profile/services/zone-calculator-service';
import { TrainingZone } from '@/features/power-profile/types/training-zones';
import {
  buildFvModel,
  buildSvgPowerPath,
  buildSvgVDecPath,
} from '@/features/power-profile/utils/fv-model';

export type ChartPoint = {
  id: string;
  loadKg: number;
  peakVelocity: number | null;
  peakPowerW: number | null;
  zoneName?: string;
};

export type LoadVelocityChartProps = {
  pplLoadKg: number;
  peakPowerW: number;
  points: ChartPoint[];
  selectedPointId?: string | null;
  onPointPress?: (id: string | null) => void;
  width: number;
  height?: number;
};

type ZoneBand = {
  zone: TrainingZone;
  label: string;
  minLoadKg: number;
  maxLoadKg: number; // can be Infinity
  fill: string;
  stroke: string;
};

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function formatMaybeNumber(n: number | null | undefined, digits = 2): string {
  if (typeof n !== 'number' || !Number.isFinite(n)) return '--';
  return n.toFixed(digits);
}

function getZoneLabel(zone: TrainingZone): string {
  switch (zone) {
    case TrainingZone.SPEED_STRENGTH:
      return 'Speed-Strength';
    case TrainingZone.PEAK_POWER:
      return 'Peak Power';
    case TrainingZone.STRENGTH_SPEED:
      return 'Strength-Speed';
    case TrainingZone.OVERLOAD:
      return 'Overload';
  }
}

function getZoneColors(zone: TrainingZone): { fill: string; stroke: string } {
  switch (zone) {
    case TrainingZone.SPEED_STRENGTH:
      return {
        fill: 'rgba(30, 179, 255, 0.22)',
        stroke: colors.secondary[500],
      };
    case TrainingZone.PEAK_POWER:
      return { fill: 'rgba(255, 140, 0, 0.20)', stroke: colors.primary[400] };
    case TrainingZone.STRENGTH_SPEED:
      return { fill: 'rgba(168, 85, 247, 0.18)', stroke: colors.purple[500] };
    case TrainingZone.OVERLOAD:
      return { fill: 'rgba(239, 68, 68, 0.16)', stroke: colors.danger[500] };
  }
}

function buildZoneBands(pplLoadKg: number): ZoneBand[] {
  if (!Number.isFinite(pplLoadKg) || pplLoadKg <= 0) return [];
  const p = computeZonePrescription(pplLoadKg);

  const zones: TrainingZone[] = [
    TrainingZone.SPEED_STRENGTH,
    TrainingZone.PEAK_POWER,
    TrainingZone.STRENGTH_SPEED,
    TrainingZone.OVERLOAD,
  ];

  return zones.map((z) => {
    const { fill, stroke } = getZoneColors(z);
    return {
      zone: z,
      label: getZoneLabel(z),
      minLoadKg: p[z].minLoadKg,
      maxLoadKg: p[z].maxLoadKg,
      fill,
      stroke,
    };
  });
}

function extent(vals: number[]): { min: number; max: number } {
  if (vals.length === 0) return { min: 0, max: 1 };
  return { min: Math.min(...vals), max: Math.max(...vals) };
}

export function LoadVelocityChart({
  pplLoadKg,
  peakPowerW,
  points,
  selectedPointId = null,
  onPointPress,
  width,
  height = 260,
}: LoadVelocityChartProps): React.ReactElement {
  const padding = 28;
  const innerW = Math.max(1, width - padding * 2);
  const innerH = Math.max(1, height - padding * 2);

  const model = buildFvModel(pplLoadKg, peakPowerW);

  const valid = points.filter(
    (p) =>
      Number.isFinite(p.loadKg) &&
      (Number.isFinite(p.peakVelocity ?? NaN) ||
        Number.isFinite(p.peakPowerW ?? NaN))
  );

  const loadVals = valid.map((p) => p.loadKg);
  const velVals = valid
    .map((p) => p.peakVelocity)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
  const powerVals = valid
    .map((p) => p.peakPowerW)
    .filter((v): v is number => typeof v === 'number' && Number.isFinite(v));

  const maxLoadFromPoints = loadVals.length ? Math.max(...loadVals) : 0;
  const xMax =
    model && Number.isFinite(model.loadMax)
      ? Math.max(
          maxLoadFromPoints * 1.15,
          pplLoadKg * 2.2,
          model.loadMax * 1.02
        )
      : Math.max(maxLoadFromPoints * 1.15, pplLoadKg * 2.2, 1);

  const velExt = extent(
    velVals.length ? velVals : model ? [0, model.v0] : [0, 1]
  );
  const powExt = extent(
    powerVals.length ? powerVals : model ? [0, model.peakPowerW] : [0, 1]
  );

  const velMax = Math.max(velExt.max, 0.1);
  const powMax = Math.max(powExt.max, 0.1);

  const xScale = (loadKg: number) =>
    padding + (clamp(loadKg, 0, xMax) / xMax) * innerW;
  const yVelScale = (v: number) =>
    padding + (1 - clamp(v, 0, velMax) / velMax) * innerH;
  const yPowScale = (p: number) =>
    padding + (1 - clamp(p, 0, powMax) / powMax) * innerH;

  const zoneBands = buildZoneBands(pplLoadKg);

  const selectedPoint = selectedPointId
    ? (valid.find((p) => p.id === selectedPointId) ?? null)
    : null;

  const selectedX = selectedPoint ? xScale(selectedPoint.loadKg) : null;
  const selectedY = selectedPoint
    ? yVelScale(
        typeof selectedPoint.peakVelocity === 'number'
          ? selectedPoint.peakVelocity
          : 0
      )
    : null;

  const clearSelection = () => onPointPress?.(null);
  const selectPoint = (id: string) => onPointPress?.(id);

  const axisColor = colors.neutral[400];
  const gridColor = 'rgba(255,255,255,0.08)';
  const velColor = colors.secondary[500];
  const powerColor = colors.primary[400];

  const curvePowerPath =
    model != null
      ? buildSvgPowerPath({ model, xScale, yPowerScale: yPowScale, xMax })
      : null;
  const vDecPath =
    model != null ? buildSvgVDecPath({ model, xScale, yVelScale, xMax }) : null;

  const yTicks = 4;
  const xTicks = 4;

  const yVelTickVals = Array.from(
    { length: yTicks + 1 },
    (_, i) => (velMax * i) / yTicks
  );
  const yPowTickVals = Array.from(
    { length: yTicks + 1 },
    (_, i) => (powMax * i) / yTicks
  );
  const xTickVals = Array.from(
    { length: xTicks + 1 },
    (_, i) => (xMax * i) / xTicks
  );

  const pplX = model != null ? xScale(model.pplLoadKg) : null;

  return (
    <View style={[styles.container, { width }]}>
      <Pressable style={styles.pressLayer} onPress={clearSelection}>
        <Svg width={width} height={height}>
          <Rect x={0} y={0} width={width} height={height} fill="transparent" />

          {/* Zone bands */}
          {zoneBands.map((b) => {
            const max = Number.isFinite(b.maxLoadKg) ? b.maxLoadKg : xMax;
            const x0 = xScale(b.minLoadKg);
            const x1 = xScale(Math.min(max, xMax));
            const w = Math.max(0, x1 - x0);
            if (w <= 0) return null;
            return (
              <G key={b.zone}>
                <Rect
                  x={x0}
                  y={padding}
                  width={w}
                  height={innerH}
                  fill={b.fill}
                />
                <SvgText
                  x={x0 + w / 2}
                  y={padding + innerH - 6}
                  fill={b.stroke}
                  fontSize={9}
                  textAnchor="middle"
                  opacity={0.9}
                >
                  {b.label}
                </SvgText>
              </G>
            );
          })}

          {/* Grid */}
          {yVelTickVals.map((v, idx) => {
            const y = yVelScale(v);
            return (
              <Line
                key={`gy-${idx}`}
                x1={padding}
                x2={width - padding}
                y1={y}
                y2={y}
                stroke={gridColor}
                strokeWidth={1}
              />
            );
          })}

          {/* Curves */}
          {curvePowerPath ? (
            <Path
              d={curvePowerPath}
              stroke={powerColor}
              strokeWidth={3}
              fill="none"
            />
          ) : null}
          {vDecPath ? (
            <Path d={vDecPath} stroke={velColor} strokeWidth={3} fill="none" />
          ) : null}

          {/* PPL marker */}
          {pplX != null ? (
            <Line
              x1={pplX}
              x2={pplX}
              y1={padding}
              y2={height - padding}
              stroke="rgba(255,255,255,0.35)"
              strokeWidth={1}
              strokeDasharray="6,4"
            />
          ) : null}

          {/* Axes */}
          <Line
            x1={padding}
            x2={padding}
            y1={padding}
            y2={height - padding}
            stroke={axisColor}
            strokeWidth={1}
          />
          <Line
            x1={width - padding}
            x2={width - padding}
            y1={padding}
            y2={height - padding}
            stroke={axisColor}
            strokeWidth={1}
          />
          <Line
            x1={padding}
            x2={width - padding}
            y1={height - padding}
            y2={height - padding}
            stroke={axisColor}
            strokeWidth={1}
          />

          {/* Axis labels */}
          <SvgText
            x={padding}
            y={12}
            fill={velColor}
            fontSize={10}
            fontWeight="700"
          >
            {'Velocity (m/s)'}
          </SvgText>
          <SvgText
            x={width - padding}
            y={12}
            fill={powerColor}
            fontSize={10}
            fontWeight="700"
            textAnchor="end"
          >
            {'Power (W)'}
          </SvgText>
          <SvgText
            x={width / 2}
            y={height - 6}
            fill={axisColor}
            fontSize={10}
            textAnchor="middle"
          >
            {'Load (kg)'}
          </SvgText>

          {/* Ticks */}
          {yVelTickVals.map((v, idx) => (
            <SvgText
              key={`yl-${idx}`}
              x={padding - 6}
              y={yVelScale(v) + 3}
              fill={axisColor}
              fontSize={9}
              textAnchor="end"
            >
              {v.toFixed(1)}
            </SvgText>
          ))}
          {yPowTickVals.map((p, idx) => (
            <SvgText
              key={`yr-${idx}`}
              x={width - padding + 6}
              y={yPowScale(p) + 3}
              fill={axisColor}
              fontSize={9}
              textAnchor="start"
            >
              {p >= 1000
                ? `${Math.round(p / 100) / 10}k`
                : Math.round(p).toString()}
            </SvgText>
          ))}
          {xTickVals.map((xv, idx) => (
            <SvgText
              key={`x-${idx}`}
              x={xScale(xv)}
              y={height - padding + 14}
              fill={axisColor}
              fontSize={9}
              textAnchor="middle"
            >
              {Math.round(xv).toString()}
            </SvgText>
          ))}

          {/* Points */}
          {valid.map((p) => {
            const x = xScale(p.loadKg);
            const isSelected = selectedPointId === p.id;

            const vel =
              typeof p.peakVelocity === 'number' ? p.peakVelocity : null;
            const pow = typeof p.peakPowerW === 'number' ? p.peakPowerW : null;

            const r = isSelected ? 6 : 4;
            const ringR = r + 2;

            return (
              <G key={p.id}>
                {typeof vel === 'number' ? (
                  <>
                    {isSelected ? (
                      <Circle
                        cx={x}
                        cy={yVelScale(vel)}
                        r={ringR}
                        fill="transparent"
                        stroke="#ffffff"
                        strokeWidth={2}
                      />
                    ) : null}
                    <Circle
                      cx={x}
                      cy={yVelScale(vel)}
                      r={r}
                      fill={velColor}
                      onPress={() => selectPoint(p.id)}
                    />
                  </>
                ) : null}
                {typeof pow === 'number' ? (
                  <>
                    {isSelected ? (
                      <Circle
                        cx={x}
                        cy={yPowScale(pow)}
                        r={ringR}
                        fill="transparent"
                        stroke="#ffffff"
                        strokeWidth={2}
                      />
                    ) : null}
                    <Circle
                      cx={x}
                      cy={yPowScale(pow)}
                      r={r}
                      fill={powerColor}
                      onPress={() => selectPoint(p.id)}
                    />
                  </>
                ) : null}
              </G>
            );
          })}
        </Svg>

        {selectedPoint && selectedX != null && selectedY != null ? (
          <View
            pointerEvents="none"
            style={[
              styles.tooltip,
              {
                left: clamp(selectedX - 110, 8, Math.max(8, width - 220)),
                top: clamp(selectedY - 72, 8, Math.max(8, height - 96)),
              },
            ]}
          >
            <Text
              style={styles.tooltipTitle}
            >{`Load: ${selectedPoint.loadKg.toFixed(1)} kg`}</Text>
            <Text
              style={styles.tooltipValue}
            >{`${formatMaybeNumber(selectedPoint.peakVelocity, 2)} m/s`}</Text>
            <Text
              style={styles.tooltipSub}
            >{`${selectedPoint.peakPowerW != null ? Math.round(selectedPoint.peakPowerW).toString() : '--'} W`}</Text>
            {selectedPoint.zoneName ? (
              <Text style={styles.tooltipZone}>{selectedPoint.zoneName}</Text>
            ) : null}
          </View>
        ) : null}
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    borderRadius: 18,
    overflow: 'hidden',
    backgroundColor: colors.charcoal[900],
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  },
  pressLayer: { position: 'relative' },
  tooltip: {
    position: 'absolute',
    width: 220,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 12,
    backgroundColor: 'rgba(32,32,32,0.92)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.14)',
  },
  tooltipTitle: {
    color: colors.neutral[300],
    fontSize: 12,
    marginBottom: 4,
  },
  tooltipValue: {
    color: colors.neutral[50],
    fontSize: 20,
    fontWeight: '800',
    marginBottom: 2,
  },
  tooltipSub: {
    color: colors.neutral[200],
    fontSize: 13,
    fontWeight: '600',
  },
  tooltipZone: {
    marginTop: 6,
    color: colors.purple[300],
    fontSize: 12,
    fontWeight: '700',
  },
});
