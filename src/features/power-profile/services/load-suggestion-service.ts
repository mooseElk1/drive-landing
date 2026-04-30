import { TrainingZone, type ZonePrescription } from '../types/training-zones';
import { computeDiscoveryOpenerLoad } from './discovery-test-protocol-service';
import type { TestPhase } from './ppl-test-protocol-service';
import {
  computePplTestNextLoad,
  computePplTestOpenerLoad,
} from './ppl-test-protocol-service';
import { computeTrainingPeakNudge } from './training-peak-nudge-service';
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

// ---------------------------------------------------------------------------
// Load Recommendation — richer, pre-sprint-aware API
// ---------------------------------------------------------------------------

export type LoadRecommendation =
  | {
      kind: 'zone_target';
      zone: TrainingZone;
      minKg: number;
      maxKg: number;
      suggestedKg: number;
      rationale: string;
    }
  | { kind: 'training_peak_nudge'; suggestedKg: number; rationale: string }
  | {
      kind: 'next_sprint';
      suggestedKg: number;
      zone: TrainingZone | null;
      rationale: string;
      phase: TestPhase;
    }
  | { kind: 'discovery_start'; loadKg: number | null; rationale: string }
  | { kind: 'no_ppl_nudge' }
  | { kind: 'first_sprint_start'; suggestedKg: number | null };

export type LoadRecommendationInput = {
  sessionMode: 'training' | 'test' | 'discovery' | 'targeted_retest';
  currentLoadKg: number;
  pplLoadKg: number | null;
  bodyWeightKg: number | null;
  targetZone: TrainingZone | null;
  lastSprintPowerW: number | null;
  secondLastSprintPowerW: number | null;
  newHistoricalPeakThisSession: boolean;
  newHistoricalPeakLoadKg: number | null;
};

function zoneSuggestedLoad(
  zone: TrainingZone,
  pplLoadKg: number,
  prescription: ZonePrescription
): number {
  // For Peak Power the zone midpoint = 100% PPL = pplLoadKg itself.
  // For other zones use the midpoint of the defined band as % of PPL.
  if (zone === TrainingZone.PEAK_POWER) return roundToOneDecimal(pplLoadKg);

  const band = prescription[zone];
  const max = Number.isFinite(band.maxLoadKg)
    ? band.maxLoadKg
    : band.minLoadKg * 1.1;
  return roundToOneDecimal((band.minLoadKg + max) / 2);
}

function getTrainingLoadRecommendation(
  input: LoadRecommendationInput
): LoadRecommendation {
  if (!input.pplLoadKg) return { kind: 'no_ppl_nudge' };

  if (input.newHistoricalPeakThisSession && input.newHistoricalPeakLoadKg) {
    const nudge = computeTrainingPeakNudge(input.newHistoricalPeakLoadKg);
    return {
      kind: 'training_peak_nudge',
      suggestedKg: nudge.suggestedKg,
      rationale: nudge.rationale,
    };
  }

  const prescription = computeZonePrescription(input.pplLoadKg);
  const zone = input.targetZone ?? TrainingZone.PEAK_POWER;
  const band = prescription[zone];
  const suggestedKg = zoneSuggestedLoad(zone, input.pplLoadKg, prescription);

  return {
    kind: 'zone_target',
    zone,
    minKg: band.minLoadKg,
    maxKg: Number.isFinite(band.maxLoadKg) ? band.maxLoadKg : suggestedKg,
    suggestedKg,
    rationale: `Target: ${zone.replace(/_/g, ' ')} zone`,
  };
}

export function getLoadRecommendation(
  input: LoadRecommendationInput
): LoadRecommendation {
  const isTestMode =
    input.sessionMode === 'test' ||
    input.sessionMode === 'discovery' ||
    input.sessionMode === 'targeted_retest';

  if (!isTestMode) {
    return getTrainingLoadRecommendation(input);
  }

  // Discovery mode — BW-based opener
  if (input.sessionMode === 'discovery' && input.lastSprintPowerW === null) {
    const opener = computeDiscoveryOpenerLoad(input.bodyWeightKg);
    return {
      kind: 'discovery_start',
      loadKg: opener.kind === 'numeric' ? opener.loadKg : null,
      rationale:
        opener.kind === 'numeric'
          ? 'Start at ~40% bodyweight.'
          : 'Start at ~40% of your bodyweight (calculate manually).',
    };
  }

  // Post-PPL tests — PPL-based opener
  if (input.lastSprintPowerW === null) {
    return {
      kind: 'first_sprint_start',
      suggestedKg: computePplTestOpenerLoad(input.pplLoadKg),
    };
  }

  const next = computePplTestNextLoad({
    currentLoadKg: input.currentLoadKg,
    lastSprintPowerW: input.lastSprintPowerW,
    secondLastSprintPowerW: input.secondLastSprintPowerW,
  });

  return {
    kind: 'next_sprint',
    suggestedKg: next.suggestedKg,
    zone: null,
    rationale: next.rationale,
    phase: next.phase,
  };
}
