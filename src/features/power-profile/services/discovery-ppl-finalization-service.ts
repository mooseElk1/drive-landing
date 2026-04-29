import { getWorkoutEntriesByIds } from '@/features/workout/services/workout-persistence';
import type { WorkoutEntry } from '@/types/workout-database';

import type { PPLRevision } from '../types/athlete-profile';
import type { PowerMeasurementMode } from '../types/power-measurement-mode';
import type { SurfaceType } from '../types/surface-type';
import { resolveSprintPower } from './power-source-service';
import {
  calculatePPLRevision,
  type LoadPowerPoint,
} from './ppl-calculation-service';

function surfaceFromMetrics(
  metrics: WorkoutEntry['metrics'] | undefined
): SurfaceType | null {
  return metrics?.surfaceType === 'turf' ? 'turf' : null;
}

type ResolvedPoint = LoadPowerPoint & { mode: PowerMeasurementMode };

/** Pure builder for tests and for finalize after DB reads. */
export function buildPPLRevisionFromDiscoveryWorkouts(params: {
  entriesInSessionOrder: WorkoutEntry[];
  bodyWeightKg: number | null;
  timestamp?: number;
}): PPLRevision | null {
  const { entriesInSessionOrder, bodyWeightKg } = params;
  const timestamp = params.timestamp ?? Date.now();

  const resolved: ResolvedPoint[] = [];
  for (const entry of entriesInSessionOrder) {
    const m = entry.metrics;
    const loadKg = m?.loadKg;
    if (typeof loadKg !== 'number' || !Number.isFinite(loadKg) || loadKg <= 0) {
      continue;
    }
    try {
      const r = resolveSprintPower(m, surfaceFromMetrics(m));
      if (!Number.isFinite(r.power) || r.power <= 0) continue;
      resolved.push({
        loadKg,
        powerW: r.power,
        mode: r.mode,
      });
    } catch {
      continue;
    }
  }

  if (resolved.length < 2) return null;

  let best = resolved[0]!;
  for (const p of resolved) {
    if (p.powerW > best.powerW) best = p;
  }
  const powerMeasurementMode = best.mode;
  const points: LoadPowerPoint[] = resolved.map(({ loadKg, powerW }) => ({
    loadKg,
    powerW,
  }));

  try {
    return calculatePPLRevision({
      points,
      powerMeasurementMode,
      bodyWeightKg,
      timestamp,
    });
  } catch {
    return null;
  }
}

export async function finalizeDiscoveryPPL(params: {
  sprintIds: string[];
  bodyWeightKg: number | null;
  timestamp?: number;
}): Promise<PPLRevision | null> {
  const { sprintIds, bodyWeightKg } = params;
  if (sprintIds.length < 2) return null;

  const entries = await getWorkoutEntriesByIds(sprintIds);
  const byId = new Map(entries.map((e) => [e.id, e]));
  const ordered: WorkoutEntry[] = [];
  for (const id of sprintIds) {
    const e = byId.get(id);
    if (e) ordered.push(e);
  }

  return buildPPLRevisionFromDiscoveryWorkouts({
    entriesInSessionOrder: ordered,
    bodyWeightKg,
    timestamp: params.timestamp,
  });
}
