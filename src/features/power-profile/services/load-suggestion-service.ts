import { TrainingZone } from '../types/training-zones';
import { computeZonePrescription } from './zone-calculator-service';

export type LoadSuggestionMode = 'discovery' | 'training';

export type LoadSuggestionInput = {
  mode: LoadSuggestionMode;
  currentLoadKg: number;
  // last sprint results (needed for discovery logic)
  previousPowerW: number | null;
  currentPowerW: number;

  // training mode context
  pplLoadKg: number | null;
  targetZone: TrainingZone | null;
};

export type LoadSuggestion = {
  nextLoadKg: number;
  zone: TrainingZone | null;
  rationale: string;
};

function roundToOneDecimal(n: number): number {
  return Math.round(n * 10) / 10;
}

function clamp(n: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, n));
}

function defaultStepKg(loadKg: number): number {
  // Keep it simple and safe: 5kg typical; smaller steps for lighter loads.
  if (loadKg < 30) return 2.5;
  return 5;
}

function computeDiscoveryNextLoad(params: {
  currentLoadKg: number;
  previousPowerW: number | null;
  currentPowerW: number;
}): LoadSuggestion {
  const step = defaultStepKg(params.currentLoadKg);

  if (params.previousPowerW === null) {
    return {
      nextLoadKg: roundToOneDecimal(params.currentLoadKg + step),
      zone: null,
      rationale: 'Getting started — increase load to map your curve.',
    };
  }

  const deltaPct =
    ((params.currentPowerW - params.previousPowerW) / params.previousPowerW) *
    100;

  // Ascending limb: power still rising → go heavier.
  if (deltaPct >= 1) {
    const bump = deltaPct >= 5 ? step * 2 : step;
    return {
      nextLoadKg: roundToOneDecimal(params.currentLoadKg + bump),
      zone: null,
      rationale: 'Power is rising — go heavier to find your peak.',
    };
  }

  // Near peak: small drop → fine-tune with smaller step.
  if (deltaPct < 1 && deltaPct >= -3) {
    return {
      nextLoadKg: roundToOneDecimal(params.currentLoadKg + step / 2),
      zone: null,
      rationale:
        'Near peak — smaller increase to confirm the top of the curve.',
    };
  }

  // Descending limb: noticeable drop → step back.
  return {
    nextLoadKg: roundToOneDecimal(params.currentLoadKg - step),
    zone: null,
    rationale: 'Power dropped — step back to bracket your peak.',
  };
}

function computeTrainingNextLoad(params: {
  currentLoadKg: number;
  pplLoadKg: number | null;
  targetZone: TrainingZone | null;
}): LoadSuggestion {
  if (!params.pplLoadKg) {
    return {
      nextLoadKg: roundToOneDecimal(params.currentLoadKg),
      zone: null,
      rationale: 'No PPL yet — run a Discovery Test for personalised targets.',
    };
  }

  const prescription = computeZonePrescription(params.pplLoadKg);
  const zone = params.targetZone ?? TrainingZone.PEAK_POWER;
  const band = prescription[zone];

  // Pick the band midpoint, but don’t jump too far from current load.
  const midpoint =
    (band.minLoadKg +
      (Number.isFinite(band.maxLoadKg)
        ? band.maxLoadKg
        : band.minLoadKg * 1.1)) /
    2;
  const step = defaultStepKg(params.currentLoadKg);
  const maxJump = step * 2;

  const proposed = clamp(
    midpoint,
    params.currentLoadKg - maxJump,
    params.currentLoadKg + maxJump
  );
  const nextLoadKg = roundToOneDecimal(proposed);

  return {
    nextLoadKg,
    zone,
    rationale: `Training in ${zone.replace('_', '-')} — stay within your zone range.`,
  };
}

export function getNextLoadSuggestion(
  input: LoadSuggestionInput
): LoadSuggestion {
  if (!Number.isFinite(input.currentLoadKg) || input.currentLoadKg <= 0) {
    throw new Error('currentLoadKg must be a positive number');
  }
  if (!Number.isFinite(input.currentPowerW) || input.currentPowerW <= 0) {
    throw new Error('currentPowerW must be a positive number');
  }
  if (
    input.previousPowerW !== null &&
    (!Number.isFinite(input.previousPowerW) || input.previousPowerW <= 0)
  ) {
    throw new Error('previousPowerW must be null or a positive number');
  }

  if (input.mode === 'discovery') {
    return computeDiscoveryNextLoad({
      currentLoadKg: input.currentLoadKg,
      previousPowerW: input.previousPowerW,
      currentPowerW: input.currentPowerW,
    });
  }

  return computeTrainingNextLoad({
    currentLoadKg: input.currentLoadKg,
    pplLoadKg: input.pplLoadKg,
    targetZone: input.targetZone,
  });
}
