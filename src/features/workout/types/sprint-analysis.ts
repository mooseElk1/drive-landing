export type SprintStatus = 'idle' | 'recording' | 'stopped';

export interface DriveEvent {
  index: number;
  timestamp: number;
  timeFromStartMs: number;
  distanceFromStartM: number;
  peakAccelMagFilt: number;
  peakJerk: number;
  // Phase 4 — per-step features (optional)
  peakVerticalAccelLp?: number;
  peakBrakingAccelLp?: number;
  peakPropulsiveAccelLp?: number;
  verticalImpulseProxy?: number;
  stepWindowMs?: number;
  // Phase 5 — gait constraint (optional)
  gaitPredictedSpeedMs?: number;
}

export interface PeakMarker {
  value: number;
  timestamp: number;
  timeFromStartMs: number;
  distanceFromStartM: number;
  drivesSoFar: number;
}

export interface SprintSummary {
  startedAt: number | null;
  endedAt: number | null;
  durationMs: number;
  distanceM: number;
  driveCount: number;
  peakVelocity: PeakMarker | null;
  peakPower: PeakMarker | null;
}

export interface SprintAnalysisState {
  status: SprintStatus;
  summary: SprintSummary;
  driveEvents: DriveEvent[];
}

export interface SprintAnalysisResult {
  summary: SprintSummary;
  driveEvents: DriveEvent[];
}
