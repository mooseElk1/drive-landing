import type { PowerMeasurementMode } from './power-measurement-mode';

export type FVClassification =
  | 'force_dominant'
  | 'balanced'
  | 'velocity_dominant';

export type HistoryDepth = 'NEW' | 'PARTIAL' | 'FULL';

export type PPLEstimateSource = 'discovery_curve' | 'organic_pb';

export type PPLRevision = {
  pplLoadKg: number;
  peakPowerW: number;
  powerMeasurementMode: PowerMeasurementMode;
  pplAsPctBW: number | null;
  ambiguousPeak: boolean;
  /**
   * Optional for backward compatibility with persisted revisions that predate
   * provisional-PPL support. Treat missing as 'discovery_curve'.
   */
  estimateSource?: PPLEstimateSource;
  /**
   * Optional for backward compatibility. True means the PPL load has at least
   * one observed sprint load above and below it; missing is treated as true for
   * older revisions.
   */
  loadBracketed?: boolean;
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
