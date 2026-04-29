export type TestPhase = 'ascending' | 'near_peak' | 'descending';

function roundToOneDecimal(n: number): number {
  return Math.round(n * 10) / 10;
}

function defaultStepKg(loadKg: number): number {
  if (loadKg < 30) return 2.5;
  return 5;
}

export function computeTestOpenerLoad(pplLoadKg: number | null): number | null {
  if (pplLoadKg == null) return null;
  if (!Number.isFinite(pplLoadKg) || pplLoadKg <= 0) return null;
  return roundToOneDecimal(pplLoadKg * 0.65);
}

export function computeTestNextLoad(params: {
  currentLoadKg: number;
  lastSprintPowerW: number;
  secondLastSprintPowerW: number | null;
}): { suggestedKg: number; rationale: string; phase: TestPhase } {
  const step = defaultStepKg(params.currentLoadKg);

  if (params.secondLastSprintPowerW === null) {
    return {
      suggestedKg: roundToOneDecimal(params.currentLoadKg + step),
      phase: 'ascending',
      rationale: 'Getting started — increase load to map your curve.',
    };
  }

  const deltaPct =
    ((params.lastSprintPowerW - params.secondLastSprintPowerW) /
      params.secondLastSprintPowerW) *
    100;

  if (deltaPct >= 1) {
    const bump = deltaPct >= 5 ? step * 2 : step;
    return {
      suggestedKg: roundToOneDecimal(params.currentLoadKg + bump),
      phase: 'ascending',
      rationale: 'Power is rising — go heavier to find your peak.',
    };
  }

  if (deltaPct < 1 && deltaPct >= -3) {
    return {
      suggestedKg: roundToOneDecimal(params.currentLoadKg + step / 2),
      phase: 'near_peak',
      rationale:
        'Near peak — smaller increase to confirm the top of the curve.',
    };
  }

  return {
    suggestedKg: roundToOneDecimal(params.currentLoadKg - step),
    phase: 'descending',
    rationale: 'Power dropped — step back to bracket your peak.',
  };
}
