function roundToOneDecimal(n: number): number {
  return Math.round(n * 10) / 10;
}

export function computeTrainingPeakNudge(loadKg: number): {
  suggestedKg: number;
  rationale: string;
} {
  return {
    suggestedKg: roundToOneDecimal(loadKg * 1.1),
    rationale: 'New peak — add ~10% load and try to beat it again.',
  };
}
