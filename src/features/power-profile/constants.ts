export const MIN_CALIBRATION_SAMPLES = 5;

export const STRENGTH_STANDARDS = {
  male: { elite: 5.0, advanced: 4.0, trained: 3.0 }, // × bodyweight
  female: { elite: 4.5, advanced: 3.5, trained: 2.5 }, // × bodyweight
} as const;
