function roundToOneDecimal(n: number): number {
  return Math.round(n * 10) / 10;
}

export type DiscoveryOpenerLoad =
  | { kind: 'numeric'; loadKg: number }
  | { kind: 'manual_instruction' };

export function computeDiscoveryOpenerLoad(
  bodyWeightKg: number | null
): DiscoveryOpenerLoad {
  if (bodyWeightKg == null) return { kind: 'manual_instruction' };
  if (!Number.isFinite(bodyWeightKg) || bodyWeightKg <= 0)
    return { kind: 'manual_instruction' };

  return { kind: 'numeric', loadKg: roundToOneDecimal(bodyWeightKg * 0.4) };
}
