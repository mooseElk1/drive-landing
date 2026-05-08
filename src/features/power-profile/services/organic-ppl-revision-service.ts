import { getWorkoutEntries } from '@/features/workout/services/workout-persistence';
import type { WorkoutEntry } from '@/types/workout-database';

import type { PPLRevision } from '../types/athlete-profile';
import type { SurfaceType } from '../types/surface-type';
import { resolveSprintPower } from './power-source-service';
import {
  calculatePPLRevision,
  type LoadPowerPoint,
} from './ppl-calculation-service';

function roundToOneDecimal(n: number): number {
  return Math.round(n * 10) / 10;
}

function isValidPositive(n: unknown): n is number {
  return typeof n === 'number' && Number.isFinite(n) && n > 0;
}

function computePplAsPctBW(pplLoadKg: number, bodyWeightKg: number | null) {
  if (!isValidPositive(bodyWeightKg)) return null;
  return roundToOneDecimal((pplLoadKg / bodyWeightKg) * 100);
}

export function buildProvisionalPPLRevisionFromPB(params: {
  peakPowerW: number;
  loadKg: number;
  bodyWeightKg: number | null;
  surfaceType: SurfaceType | null;
  timestamp?: number;
}): PPLRevision {
  const timestamp = params.timestamp ?? Date.now();
  if (!isValidPositive(params.peakPowerW)) {
    throw new Error('peakPowerW must be a positive number');
  }
  if (!isValidPositive(params.loadKg)) {
    throw new Error('loadKg must be a positive number');
  }

  const resolved = resolveSprintPower(
    { peakPower: params.peakPowerW },
    params.surfaceType
  );

  const pplLoadKg = roundToOneDecimal(params.loadKg);
  const peakPowerW = roundToOneDecimal(resolved.power);

  return {
    pplLoadKg,
    peakPowerW,
    powerMeasurementMode: resolved.mode,
    pplAsPctBW: computePplAsPctBW(pplLoadKg, params.bodyWeightKg),
    ambiguousPeak: false,
    estimateSource: 'organic_pb',
    loadBracketed: false,
    timestamp,
  };
}

function getRelevantSprintEntries(entries: WorkoutEntry[], athleteId: string) {
  return entries.filter((e) => {
    if (e.deletedAt) return false;
    const m = e.metrics;
    if (!m) return false;
    if (m.athleteId !== athleteId) return false;
    if (!isValidPositive(m.loadKg)) return false;
    // resolveSprintPower will throw if peakPower missing.
    try {
      const r = resolveSprintPower(m, m.surfaceType === 'turf' ? 'turf' : null);
      return isValidPositive(r.power);
    } catch {
      return false;
    }
  });
}

export async function computeLoadBracketingFromHistory(params: {
  athleteId: string;
  pplLoadKg: number;
}): Promise<{ hasBelow: boolean; hasAbove: boolean; bracketed: boolean }> {
  const entries = await getWorkoutEntries();
  const sprints = getRelevantSprintEntries(entries, params.athleteId);

  let hasBelow = false;
  let hasAbove = false;
  for (const e of sprints) {
    const load = e.metrics!.loadKg!;
    if (load < params.pplLoadKg) hasBelow = true;
    if (load > params.pplLoadKg) hasAbove = true;
    if (hasBelow && hasAbove) break;
  }
  return { hasBelow, hasAbove, bracketed: hasBelow && hasAbove };
}

export async function recomputeCurvePPLFromHistory(params: {
  athleteId: string;
  bodyWeightKg: number | null;
  timestamp?: number;
}): Promise<PPLRevision | null> {
  const timestamp = params.timestamp ?? Date.now();
  const entries = await getWorkoutEntries();
  const sprints = getRelevantSprintEntries(entries, params.athleteId);

  const points: LoadPowerPoint[] = [];
  const resolvedModes: {
    powerW: number;
    mode: PPLRevision['powerMeasurementMode'];
  }[] = [];

  for (const e of sprints) {
    const m = e.metrics!;
    const loadKg = m.loadKg!;
    try {
      const r = resolveSprintPower(m, m.surfaceType === 'turf' ? 'turf' : null);
      if (!isValidPositive(r.power)) continue;
      points.push({ loadKg, powerW: r.power });
      resolvedModes.push({ powerW: r.power, mode: r.mode });
    } catch {
      continue;
    }
  }

  if (points.length < 2) return null;

  let best = resolvedModes[0]!;
  for (const p of resolvedModes) {
    if (p.powerW > best.powerW) best = p;
  }

  try {
    const revision = calculatePPLRevision({
      points,
      powerMeasurementMode: best.mode,
      bodyWeightKg: params.bodyWeightKg,
      timestamp,
    });

    return {
      ...revision,
      estimateSource: 'discovery_curve',
      loadBracketed: true,
    };
  } catch {
    return null;
  }
}

export async function maybeUpgradeProvisionalPPLFromHistory(params: {
  athleteId: string;
  current: PPLRevision;
  bodyWeightKg: number | null;
}): Promise<PPLRevision | null> {
  const estimateSource = params.current.estimateSource ?? 'discovery_curve';
  const loadBracketed = params.current.loadBracketed ?? true;

  if (estimateSource !== 'organic_pb') return null;
  if (loadBracketed) return null;

  const bracketing = await computeLoadBracketingFromHistory({
    athleteId: params.athleteId,
    pplLoadKg: params.current.pplLoadKg,
  });
  if (!bracketing.bracketed) {
    return { ...params.current, loadBracketed: false };
  }

  const recomputed = await recomputeCurvePPLFromHistory({
    athleteId: params.athleteId,
    bodyWeightKg: params.bodyWeightKg,
  });
  return recomputed;
}
