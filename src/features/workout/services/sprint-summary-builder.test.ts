import { buildSprintSummary } from '@/features/workout/services/sprint-summary-builder';
import { type DriveEvent } from '@/features/workout/types/sprint-analysis';

describe('buildSprintSummary', () => {
  it('returns zero duration when timestamps are missing', () => {
    const summary = buildSprintSummary({
      startedAt: null,
      endedAt: null,
      distanceM: 0,
      driveEvents: [],
      peakVelocity: null,
      peakPower: null,
    });

    expect(summary.durationMs).toBe(0);
    expect(summary.driveCount).toBe(0);
  });

  it('computes positive duration from startedAt and endedAt', () => {
    const summary = buildSprintSummary({
      startedAt: 1000,
      endedAt: 1300,
      distanceM: 2.5,
      driveEvents: [],
      peakVelocity: null,
      peakPower: null,
    });

    expect(summary.durationMs).toBe(300);
    expect(summary.distanceM).toBe(2.5);
  });

  it('guards against negative duration', () => {
    const summary = buildSprintSummary({
      startedAt: 1300,
      endedAt: 1000,
      distanceM: 0,
      driveEvents: [],
      peakVelocity: null,
      peakPower: null,
    });

    expect(summary.durationMs).toBe(0);
  });

  it('uses drive count and carries peak markers through', () => {
    const drives: DriveEvent[] = [
      {
        index: 1,
        timestamp: 1200,
        timeFromStartMs: 200,
        distanceFromStartM: 0.6,
        peakAccelMagFilt: 0.4,
        peakJerk: 2,
      },
    ];

    const peakVelocity = {
      value: 3,
      timestamp: 1300,
      timeFromStartMs: 300,
      distanceFromStartM: 0.6,
      drivesSoFar: 1,
    };

    const peakPower = {
      value: 20,
      timestamp: 1200,
      timeFromStartMs: 200,
      distanceFromStartM: 0.3,
      drivesSoFar: 0,
    };

    const summary = buildSprintSummary({
      startedAt: 1000,
      endedAt: 1300,
      distanceM: 0.6,
      driveEvents: drives,
      peakVelocity,
      peakPower,
    });

    expect(summary.driveCount).toBe(1);
    expect(summary.peakVelocity).toEqual(peakVelocity);
    expect(summary.peakPower).toEqual(peakPower);
  });
});
