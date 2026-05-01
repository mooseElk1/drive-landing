export type MassUnit = 'kg' | 'lbs';

const LBS_PER_KG = 2.2046;

export function lbsToKg(lbs: number): number {
  return lbs / LBS_PER_KG;
}

export function kgToLbs(kg: number): number {
  return kg * LBS_PER_KG;
}

export function formatMassForUnit(kg: number, unit: MassUnit): string {
  const value = unit === 'lbs' ? kgToLbs(kg) : kg;
  return value.toFixed(1);
}
