import type { PPLRevision } from '../types/athlete-profile';
import type { PowerMeasurementMode } from '../types/power-measurement-mode';

export type LoadPowerPoint = {
  loadKg: number;
  powerW: number;
};

function roundToOneDecimal(n: number): number {
  return Math.round(n * 10) / 10;
}

function isFlatCurve(points: LoadPowerPoint[]): boolean {
  const powers = points.map((p) => p.powerW);
  const max = Math.max(...powers);
  const min = Math.min(...powers);
  if (max <= 0) return true;
  return (max - min) / max < 0.03;
}

function getMidpointLoad(points: LoadPowerPoint[]): number {
  const loads = points.map((p) => p.loadKg).sort((a, b) => a - b);
  const mid = (loads[0]! + loads[loads.length - 1]!) / 2;
  return roundToOneDecimal(mid);
}

function getMaxPowerPoint(points: LoadPowerPoint[]): LoadPowerPoint {
  let best = points[0]!;
  for (const p of points) {
    if (p.powerW > best.powerW) best = p;
  }
  return best;
}

export function calculatePPLRevision(params: {
  points: LoadPowerPoint[];
  powerMeasurementMode: PowerMeasurementMode;
  bodyWeightKg: number | null;
  timestamp?: number;
}): PPLRevision {
  const { points, powerMeasurementMode, bodyWeightKg } = params;
  const timestamp = params.timestamp ?? Date.now();

  if (!Array.isArray(points) || points.length < 2) {
    throw new Error('At least 2 points are required to estimate PPL');
  }

  for (const p of points) {
    if (!Number.isFinite(p.loadKg) || p.loadKg <= 0) {
      throw new Error('loadKg must be a positive number');
    }
    if (!Number.isFinite(p.powerW) || p.powerW <= 0) {
      throw new Error('powerW must be a positive number');
    }
  }

  const ambiguousPeak = isFlatCurve(points);
  const pplLoadKg = ambiguousPeak
    ? getMidpointLoad(points)
    : roundToOneDecimal(getMaxPowerPoint(points).loadKg);
  const peakPowerW = roundToOneDecimal(getMaxPowerPoint(points).powerW);

  const pplAsPctBW =
    bodyWeightKg && Number.isFinite(bodyWeightKg) && bodyWeightKg > 0
      ? roundToOneDecimal((pplLoadKg / bodyWeightKg) * 100)
      : null;

  return {
    pplLoadKg,
    peakPowerW,
    powerMeasurementMode,
    pplAsPctBW,
    ambiguousPeak,
    timestamp,
  };
}
