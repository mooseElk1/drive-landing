export enum TrainingZone {
  SPEED_STRENGTH = 'SPEED_STRENGTH',
  PEAK_POWER = 'PEAK_POWER',
  STRENGTH_SPEED = 'STRENGTH_SPEED',
  OVERLOAD = 'OVERLOAD',
}

export type ZonePrescription = Record<
  TrainingZone,
  {
    minLoadKg: number;
    maxLoadKg: number;
  }
>;
