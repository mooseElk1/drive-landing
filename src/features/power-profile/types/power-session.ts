import type { TrainingZone } from './training-zones';

export type PowerProfileSessionMode =
  | 'training'
  | 'discovery'
  | 'targeted_retest';

export type PowerProfileSession = {
  sessionId: string;
  athleteId: string | null;
  sprintIds: string[];

  startedAt: number;
  completedAt: number | null;
  deletedAt: number | null;

  testStatus: 'complete' | 'incomplete' | 'not_a_test';
  testMode: 'discovery' | 'targeted_retest' | null;
  discarded?: boolean;

  targetZone: TrainingZone | null;
  loadSuggestionsEnabled: boolean;

  sessionPeakPower: number | null;
  sessionPPLEstimate: number | null;
};
