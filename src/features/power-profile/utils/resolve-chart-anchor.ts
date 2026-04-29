import type { AthleteProfile } from '../types/athlete-profile';

export type ChartAnchor = {
  /** Load at peak power for the theoretical curve / zone prescription (PPL or fallback). */
  anchorLoadKg: number;
  /** Peak power used to build the theoretical curve (PPL or fallback). */
  anchorPeakPowerW: number;
};

/**
 * Single source for chart curves + zone bands: prefer formal PPL; otherwise use
 * historical peak load/power until PPL exists.
 */
export function resolveChartAnchor(
  athlete: AthleteProfile | null | undefined
): ChartAnchor {
  if (!athlete) {
    return { anchorLoadKg: 0, anchorPeakPowerW: 0 };
  }

  const ppl = athlete.currentPPL;
  if (
    ppl &&
    Number.isFinite(ppl.pplLoadKg) &&
    ppl.pplLoadKg > 0 &&
    Number.isFinite(ppl.peakPowerW) &&
    ppl.peakPowerW > 0
  ) {
    return { anchorLoadKg: ppl.pplLoadKg, anchorPeakPowerW: ppl.peakPowerW };
  }

  const hLoad = athlete.historicalPeakPowerLoad;
  const hPow = athlete.historicalPeakPower;
  if (
    typeof hLoad === 'number' &&
    Number.isFinite(hLoad) &&
    hLoad > 0 &&
    typeof hPow === 'number' &&
    Number.isFinite(hPow) &&
    hPow > 0
  ) {
    return { anchorLoadKg: hLoad, anchorPeakPowerW: hPow };
  }

  return { anchorLoadKg: 0, anchorPeakPowerW: 0 };
}
