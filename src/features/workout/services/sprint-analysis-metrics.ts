import { type PeakMarker } from '@/features/workout/types/sprint-analysis';

export function computeJerk(args: {
  currentAccFilt: number;
  prevAccFilt: number | null;
  dtSeconds: number;
}): number {
  const { currentAccFilt, prevAccFilt, dtSeconds } = args;

  if (dtSeconds <= 0 || prevAccFilt === null) {
    return 0;
  }

  return (currentAccFilt - prevAccFilt) / dtSeconds;
}

export function updatePeakMarker(args: {
  current: PeakMarker | null;
  value: number;
  timestamp: number;
  timeFromStartMs: number;
  drivesSoFar: number;
  distanceFromStartM: number;
}): PeakMarker {
  const {
    current,
    value,
    timestamp,
    timeFromStartMs,
    drivesSoFar,
    distanceFromStartM,
  } = args;

  if (!current || value > current.value) {
    return {
      value,
      timestamp,
      timeFromStartMs,
      distanceFromStartM,
      drivesSoFar,
    };
  }

  return current;
}
