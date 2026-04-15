import {
  type DriveEvent,
  type PeakMarker,
  type SprintSummary,
} from '@/features/workout/types/sprint-analysis';

export function buildSprintSummary(args: {
  startedAt: number | null;
  endedAt: number | null;
  distanceM: number;
  driveEvents: DriveEvent[];
  peakVelocity: PeakMarker | null;
  peakPower: PeakMarker | null;
}): SprintSummary {
  const {
    startedAt,
    endedAt,
    distanceM,
    driveEvents,
    peakVelocity,
    peakPower,
  } = args;

  const durationMs =
    startedAt !== null && endedAt !== null
      ? Math.max(0, endedAt - startedAt)
      : 0;

  return {
    startedAt,
    endedAt,
    durationMs,
    distanceM,
    driveCount: driveEvents.length,
    peakVelocity,
    peakPower,
  };
}
