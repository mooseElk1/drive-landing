import type { PowerMeasurementMode } from './power-measurement-mode';

export type FVClassification =
  | 'force_dominant'
  | 'balanced'
  | 'velocity_dominant';

export type HistoryDepth = 'NEW' | 'PARTIAL' | 'FULL';

export type PPLRevision = {
  pplLoadKg: number;
  peakPowerW: number;
  powerMeasurementMode: PowerMeasurementMode;
  pplAsPctBW: number | null;
  ambiguousPeak: boolean;
  timestamp: number;
};

export type AthleteProfile = {
  id: string;
  name: string;
  bodyWeightKg: number | null;
  sex: 'male' | 'female' | null;

  createdAt: number;
  updatedAt: number;

  currentPPL: PPLRevision | null;
  pplHistory: PPLRevision[];

  fvClassification: FVClassification | null;
  historyDepth: HistoryDepth;

  frictionActivationAcknowledged: boolean;
  incompleteDiscoverySessionId: string | null;

  historicalPeakPower: number | null;
  historicalPeakPowerLoad: number | null;
};
