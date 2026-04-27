import type { WorkoutMetrics } from '@/types/workout-database';

import type { FrictionConfidence } from '../types/friction-confidence';
import type { PowerMeasurementMode } from '../types/power-measurement-mode';
import type { SurfaceType } from '../types/surface-type';

export type ResolvedSprintPower = {
  power: number;
  mode: PowerMeasurementMode;
  frictionConfidence: FrictionConfidence;
  calibrationRatio: number | null;
  surfaceType: SurfaceType | null;
};

/**
 * Single entry point for sprint power resolution. Today this defaults to raw
 * peak power until friction detection / calibration is implemented.
 */
export function resolveSprintPower(
  metrics: WorkoutMetrics | undefined,
  surfaceType: SurfaceType | null
): ResolvedSprintPower {
  const peakPower = metrics?.peakPower;
  if (typeof peakPower !== 'number') {
    throw new Error('Missing metrics.peakPower');
  }

  return {
    power: peakPower,
    mode: 'raw',
    frictionConfidence: 'Unknown',
    calibrationRatio: null,
    surfaceType,
  };
}
