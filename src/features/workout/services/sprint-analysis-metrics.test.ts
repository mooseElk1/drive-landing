import {
  computeJerk,
  updatePeakMarker,
} from '@/features/workout/services/sprint-analysis-metrics';

describe('sprint-analysis-metrics', () => {
  describe('computeJerk', () => {
    it('returns zero when dt is non-positive', () => {
      expect(
        computeJerk({ currentAccFilt: 1, prevAccFilt: 0.5, dtSeconds: 0 })
      ).toBe(0);
      expect(
        computeJerk({ currentAccFilt: 1, prevAccFilt: 0.5, dtSeconds: -0.1 })
      ).toBe(0);
    });

    it('returns zero when previous acceleration is missing', () => {
      expect(
        computeJerk({ currentAccFilt: 1, prevAccFilt: null, dtSeconds: 0.01 })
      ).toBe(0);
    });

    it('computes jerk from acceleration delta over dt', () => {
      expect(
        computeJerk({ currentAccFilt: 0.6, prevAccFilt: 0.2, dtSeconds: 0.2 })
      ).toBeCloseTo(2, 6);
    });
  });

  describe('updatePeakMarker', () => {
    it('creates a marker when there is no current peak', () => {
      const marker = updatePeakMarker({
        current: null,
        value: 3,
        timestamp: 1234,
        timeFromStartMs: 200,
        drivesSoFar: 1,
        distanceFromStartM: 2.5,
      });

      expect(marker).toEqual({
        value: 3,
        timestamp: 1234,
        timeFromStartMs: 200,
        distanceFromStartM: 2.5,
        drivesSoFar: 1,
      });
    });

    it('updates marker when value increases', () => {
      const marker = updatePeakMarker({
        current: {
          value: 2,
          timestamp: 1000,
          timeFromStartMs: 100,
          distanceFromStartM: 1,
          drivesSoFar: 0,
        },
        value: 4,
        timestamp: 1300,
        timeFromStartMs: 400,
        drivesSoFar: 2,
        distanceFromStartM: 3,
      });

      expect(marker.value).toBe(4);
      expect(marker.timestamp).toBe(1300);
      expect(marker.drivesSoFar).toBe(2);
      expect(marker.distanceFromStartM).toBe(3);
    });

    it('keeps existing marker when value does not increase', () => {
      const current = {
        value: 5,
        timestamp: 1000,
        timeFromStartMs: 100,
        distanceFromStartM: 1,
        drivesSoFar: 0,
      };

      const marker = updatePeakMarker({
        current,
        value: 5,
        timestamp: 1300,
        timeFromStartMs: 400,
        drivesSoFar: 2,
        distanceFromStartM: 3,
      });

      expect(marker).toBe(current);
    });
  });
});
