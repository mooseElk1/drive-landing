import { TrainingZone, type ZonePrescription } from '../types/training-zones';

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function roundToOneDecimal(n: number): number {
  return Math.round(n * 10) / 10;
}

export function computeZonePrescription(pplLoadKg: number): ZonePrescription {
  if (!Number.isFinite(pplLoadKg) || pplLoadKg <= 0) {
    throw new Error('pplLoadKg must be a positive number');
  }

  // Rule ranges per framework plan.
  // SPEED_STRENGTH: <60% PPL
  // PEAK_POWER: 70–120% PPL
  // STRENGTH_SPEED: 140–180% PPL
  // OVERLOAD: >200% PPL
  const speedStrengthMax = roundToOneDecimal(pplLoadKg * 0.6);
  const peakPowerMin = roundToOneDecimal(pplLoadKg * 0.7);
  const peakPowerMax = roundToOneDecimal(pplLoadKg * 1.2);
  const strengthSpeedMin = roundToOneDecimal(pplLoadKg * 1.4);
  const strengthSpeedMax = roundToOneDecimal(pplLoadKg * 1.8);
  const overloadMin = roundToOneDecimal(pplLoadKg * 2.0);

  return {
    [TrainingZone.SPEED_STRENGTH]: {
      minLoadKg: 0,
      maxLoadKg: speedStrengthMax,
    },
    [TrainingZone.PEAK_POWER]: {
      minLoadKg: peakPowerMin,
      maxLoadKg: peakPowerMax,
    },
    [TrainingZone.STRENGTH_SPEED]: {
      minLoadKg: strengthSpeedMin,
      maxLoadKg: strengthSpeedMax,
    },
    // Unbounded above; keep max as Infinity and allow UI to cap as needed.
    [TrainingZone.OVERLOAD]: { minLoadKg: overloadMin, maxLoadKg: Infinity },
  };
}

export function classifyLoad(loadKg: number, pplLoadKg: number): TrainingZone {
  if (!Number.isFinite(loadKg) || loadKg < 0) {
    throw new Error('loadKg must be a non-negative number');
  }
  if (!Number.isFinite(pplLoadKg) || pplLoadKg <= 0) {
    throw new Error('pplLoadKg must be a positive number');
  }

  const ratio = clamp(loadKg / pplLoadKg, 0, Infinity);

  // Use inclusive bands where defined; gaps fall back to nearest relevant band.
  if (ratio < 0.6) return TrainingZone.SPEED_STRENGTH;
  if (ratio >= 0.7 && ratio <= 1.2) return TrainingZone.PEAK_POWER;
  if (ratio >= 1.4 && ratio <= 1.8) return TrainingZone.STRENGTH_SPEED;
  if (ratio > 2.0) return TrainingZone.OVERLOAD;

  // Bridge gaps:
  // 0.6–0.7 → closer to SPEED_STRENGTH vs PEAK_POWER; treat as SPEED_STRENGTH.
  if (ratio >= 0.6 && ratio < 0.7) return TrainingZone.SPEED_STRENGTH;
  // 1.2–1.4 → treat as PEAK_POWER (still close to peak).
  if (ratio > 1.2 && ratio < 1.4) return TrainingZone.PEAK_POWER;
  // 1.8–2.0 → treat as STRENGTH_SPEED (heavy but not overload).
  return TrainingZone.STRENGTH_SPEED;
}
