export type CISubScores = {
  curveCoverage: number;
  peakZoneDensity: number;
  temporalRelevance: number;
  signalConsistency: number;
};

export type CIBadge =
  | 'CONFIRMED'
  | 'ESTABLISHED'
  | 'ESTIMATED'
  | 'LOW_CONFIDENCE'
  | 'EXPIRED';
