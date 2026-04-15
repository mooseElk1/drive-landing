import { DriveDetector } from '@/features/workout/services/drive-detector';

function createDetector() {
  return new DriveDetector({
    refractoryMs: 200,
    minPeakAccelMagFilt: 0.15,
  });
}

describe('DriveDetector', () => {
  it('detects a drive on a jerk zero-crossing local maximum', () => {
    const detector = createDetector();
    detector.trackJerk(2.2);

    const drive = detector.detectDrive({
      jerk: -0.1,
      ts: 1300,
      prevTs: 1200,
      prevJerk: 1,
      prevAccFilt: 0.4,
      startedAt: 1000,
      distanceFromStartM: 0.6,
      nextIndex: 1,
      computeFeatures: () => ({}),
    });

    expect(drive).toMatchObject({
      index: 1,
      timestamp: 1200,
      peakAccelMagFilt: 0.4,
      peakJerk: 2.2,
    });
  });

  it('suppresses a second event inside the refractory period', () => {
    const detector = createDetector();
    detector.trackJerk(2);
    detector.detectDrive({
      jerk: -0.1,
      ts: 1300,
      prevTs: 1200,
      prevJerk: 1,
      prevAccFilt: 0.4,
      startedAt: 1000,
      distanceFromStartM: 0.6,
      nextIndex: 1,
      computeFeatures: () => ({}),
    });

    detector.trackJerk(2.5);
    const blocked = detector.detectDrive({
      jerk: -0.1,
      ts: 1400,
      prevTs: 1350,
      prevJerk: 1,
      prevAccFilt: 0.5,
      startedAt: 1000,
      distanceFromStartM: 0.8,
      nextIndex: 2,
      computeFeatures: () => ({}),
    });

    expect(blocked).toBeNull();
  });

  it('rejects events below minPeakAccelMagFilt', () => {
    const detector = createDetector();
    detector.trackJerk(2);

    const drive = detector.detectDrive({
      jerk: -0.1,
      ts: 1300,
      prevTs: 1200,
      prevJerk: 1,
      prevAccFilt: 0.1,
      startedAt: 1000,
      distanceFromStartM: 0.6,
      nextIndex: 1,
      computeFeatures: () => ({}),
    });

    expect(drive).toBeNull();
  });
});
