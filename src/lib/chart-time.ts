// Helpers for chart time/x-domain calculations used by DriveChart

export interface TimeWindowResult {
  firstTimestamp: number;
  lastTimestamp: number;
  elapsedSeconds: number;
  xDomainStart: number;
  xDomainEnd: number;
}

const DEFAULT_WINDOW_S = 10;

/**
 * Compute the first/last timestamps, elapsed seconds, and the x-domain
 * in seconds. Assumes input timestamps are in seconds. When timestamps
 * is empty, returns a default window of DEFAULT_WINDOW_S starting at 0.
 */
export function computeTimeWindow(
  timestamps: number[],
  windowSec = DEFAULT_WINDOW_S
): TimeWindowResult {
  const hasData = timestamps && timestamps.length > 0;
  const firstTimestamp = hasData ? timestamps[0]! : 0;
  const lastTimestamp = hasData
    ? timestamps[timestamps.length - 1]!
    : firstTimestamp + windowSec;
  const elapsedSeconds = hasData ? lastTimestamp - firstTimestamp : windowSec;

  // Ensure x-domain never goes negative. If elapsed time < window, show [0, windowSec].
  let xDomainStart: number;
  let xDomainEnd: number;
  if (lastTimestamp < windowSec) {
    xDomainStart = 0;
    xDomainEnd = windowSec;
  } else {
    xDomainEnd = lastTimestamp;
    xDomainStart = lastTimestamp - windowSec;
  }

  return {
    firstTimestamp,
    lastTimestamp,
    elapsedSeconds,
    xDomainStart,
    xDomainEnd,
  };
}
