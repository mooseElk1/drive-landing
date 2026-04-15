import { type ZUPTConfig, ZUPTDetector, ZUPTStatus } from './zupt-detector';

const BASE_CONFIG: ZUPTConfig = {
  dt: 0.01,
  acc_thresh: 0.5,
  gyro_thresh: 0.1,
  min_time: 0.05, // 5 samples @ 100 Hz
};

function makeDetector(overrides?: Partial<ZUPTConfig>): ZUPTDetector {
  return new ZUPTDetector({ ...BASE_CONFIG, ...overrides });
}

describe('ZUPTDetector', () => {
  describe('initialization', () => {
    it('does not return true on construction', () => {
      const detector = makeDetector();
      // No samples added — calling addSample once with below-threshold values
      // for a detector that requires 5 samples should return false.
      expect(
        (detector.addSample(0.0, 0.0) & ZUPTStatus.ZUPT_ACTIVE) !== 0
      ).toBe(false);
    });
  });

  describe('addSample – basic threshold logic', () => {
    it('returns false when fewer consecutive quiet samples than min_samples', () => {
      const detector = makeDetector(); // min_samples = 5
      for (let i = 0; i < 4; i++) {
        expect(
          (detector.addSample(0.0, 0.0) & ZUPTStatus.ZUPT_ACTIVE) !== 0
        ).toBe(false);
      }
    });

    it('returns true once min_samples consecutive quiet samples are reached', () => {
      const detector = makeDetector(); // min_samples = 5
      for (let i = 0; i < 4; i++) {
        detector.addSample(0.0, 0.0);
      }
      expect(
        (detector.addSample(0.0, 0.0) & ZUPTStatus.ZUPT_ACTIVE) !== 0
      ).toBe(true);
    });

    it('continues returning true for each additional quiet sample after threshold is met', () => {
      const detector = makeDetector(); // min_samples = 5
      for (let i = 0; i < 5; i++) {
        detector.addSample(0.0, 0.0);
      }
      expect(
        (detector.addSample(0.0, 0.0) & ZUPTStatus.ZUPT_ACTIVE) !== 0
      ).toBe(true);
      expect(
        (detector.addSample(0.0, 0.0) & ZUPTStatus.ZUPT_ACTIVE) !== 0
      ).toBe(true);
    });
  });

  describe('threshold strictness', () => {
    it('returns false when accel_mag equals the threshold (strict <)', () => {
      const detector = makeDetector({ min_time: 0.01 }); // min_samples = 1
      expect(
        (detector.addSample(BASE_CONFIG.acc_thresh, 0.0) &
          ZUPTStatus.ZUPT_ACTIVE) !==
          0
      ).toBe(false);
    });

    it('returns false when gyro_mag equals the threshold (strict <)', () => {
      const detector = makeDetector({ min_time: 0.01 }); // min_samples = 1
      expect(
        (detector.addSample(0.0, BASE_CONFIG.gyro_thresh) &
          ZUPTStatus.ZUPT_ACTIVE) !==
          0
      ).toBe(false);
    });

    it('returns true when both magnitudes are just below their thresholds', () => {
      const detector = makeDetector({ min_time: 0.01 }); // min_samples = 1
      expect(
        (detector.addSample(
          BASE_CONFIG.acc_thresh - 1e-9,
          BASE_CONFIG.gyro_thresh - 1e-9
        ) &
          ZUPTStatus.ZUPT_ACTIVE) !==
          0
      ).toBe(true);
    });
  });

  describe('reset behaviour', () => {
    it('resets count when accel_mag exceeds threshold', () => {
      const detector = makeDetector(); // min_samples = 5
      for (let i = 0; i < 4; i++) {
        detector.addSample(0.0, 0.0);
      }
      // Breach — resets counter
      detector.addSample(1.0, 0.0);
      // Need another 5 quiet samples to reach ZUPT
      for (let i = 0; i < 4; i++) {
        expect(
          (detector.addSample(0.0, 0.0) & ZUPTStatus.ZUPT_ACTIVE) !== 0
        ).toBe(false);
      }
      expect(
        (detector.addSample(0.0, 0.0) & ZUPTStatus.ZUPT_ACTIVE) !== 0
      ).toBe(true);
    });

    it('resets count when gyro_mag exceeds threshold', () => {
      const detector = makeDetector(); // min_samples = 5
      for (let i = 0; i < 4; i++) {
        detector.addSample(0.0, 0.0);
      }
      detector.addSample(0.0, 1.0); // breach via gyro
      for (let i = 0; i < 4; i++) {
        expect(
          (detector.addSample(0.0, 0.0) & ZUPTStatus.ZUPT_ACTIVE) !== 0
        ).toBe(false);
      }
      expect(
        (detector.addSample(0.0, 0.0) & ZUPTStatus.ZUPT_ACTIVE) !== 0
      ).toBe(true);
    });

    it('resets immediately even after ZUPT was active', () => {
      const detector = makeDetector(); // min_samples = 5
      for (let i = 0; i < 5; i++) {
        detector.addSample(0.0, 0.0);
      }
      // Confirm ZUPT is active
      expect(
        (detector.addSample(0.0, 0.0) & ZUPTStatus.ZUPT_ACTIVE) !== 0
      ).toBe(true);

      // Breach — should immediately return false
      expect(
        (detector.addSample(1.0, 1.0) & ZUPTStatus.ZUPT_ACTIVE) !== 0
      ).toBe(false);

      // And the next quiet sample alone is also not enough
      expect(
        (detector.addSample(0.0, 0.0) & ZUPTStatus.ZUPT_ACTIVE) !== 0
      ).toBe(false);
    });
  });

  describe('edge cases', () => {
    it('clamps min_samples to 1 when min_time < dt', () => {
      const detector = makeDetector({ dt: 0.1, min_time: 0.01 }); // floor(0.01/0.1)=0 → clamped to 1
      expect(
        (detector.addSample(0.0, 0.0) & ZUPTStatus.ZUPT_ACTIVE) !== 0
      ).toBe(true);
    });

    it('clamps min_samples to 1 when min_time === 0', () => {
      const detector = makeDetector({ dt: 0.01, min_time: 0 });
      expect(
        (detector.addSample(0.0, 0.0) & ZUPTStatus.ZUPT_ACTIVE) !== 0
      ).toBe(true);
    });

    it('correctly computes min_samples for non-round divisions', () => {
      // dt=0.01, min_time=0.035 → floor(3.5)=3 samples required
      const detector = makeDetector({ dt: 0.01, min_time: 0.035 });
      expect(
        (detector.addSample(0.0, 0.0) & ZUPTStatus.ZUPT_ACTIVE) !== 0
      ).toBe(false);
      expect(
        (detector.addSample(0.0, 0.0) & ZUPTStatus.ZUPT_ACTIVE) !== 0
      ).toBe(false);
      expect(
        (detector.addSample(0.0, 0.0) & ZUPTStatus.ZUPT_ACTIVE) !== 0
      ).toBe(true);
    });

    it('handles multiple resets followed by recovery', () => {
      const detector = makeDetector({ dt: 0.01, min_time: 0.03 }); // min_samples = 3
      detector.addSample(0.0, 0.0);
      detector.addSample(1.0, 0.0); // reset
      detector.addSample(0.0, 0.0);
      detector.addSample(0.0, 1.0); // reset again
      expect(
        (detector.addSample(0.0, 0.0) & ZUPTStatus.ZUPT_ACTIVE) !== 0
      ).toBe(false);
      expect(
        (detector.addSample(0.0, 0.0) & ZUPTStatus.ZUPT_ACTIVE) !== 0
      ).toBe(false);
      expect(
        (detector.addSample(0.0, 0.0) & ZUPTStatus.ZUPT_ACTIVE) !== 0
      ).toBe(true);
    });
  });

  describe('bitfield bits', () => {
    it('sets ACCEL_QUIET when accel is below threshold but gyro is above', () => {
      const detector = makeDetector({ min_time: 0.01 }); // min_samples = 1
      const status = detector.addSample(0.0, BASE_CONFIG.gyro_thresh + 1);
      expect(status & ZUPTStatus.ACCEL_QUIET).not.toBe(0);
      expect(status & ZUPTStatus.GYRO_QUIET).toBe(0);
    });

    it('sets GYRO_QUIET when gyro is below threshold but accel is above', () => {
      const detector = makeDetector({ min_time: 0.01 }); // min_samples = 1
      const status = detector.addSample(BASE_CONFIG.acc_thresh + 1, 0.0);
      expect(status & ZUPTStatus.GYRO_QUIET).not.toBe(0);
      expect(status & ZUPTStatus.ACCEL_QUIET).toBe(0);
    });

    it('clears both ACCEL_QUIET and GYRO_QUIET when both are above threshold', () => {
      const detector = makeDetector({ min_time: 0.01 });
      const status = detector.addSample(
        BASE_CONFIG.acc_thresh + 1,
        BASE_CONFIG.gyro_thresh + 1
      );
      expect(status & ZUPTStatus.ACCEL_QUIET).toBe(0);
      expect(status & ZUPTStatus.GYRO_QUIET).toBe(0);
    });

    it('sets CONVERGING while 0 < count < min_samples and clears it at boundaries', () => {
      const detector = makeDetector(); // min_samples = 5
      // After a breach: count === 0, no CONVERGING
      expect(detector.addSample(1.0, 1.0) & ZUPTStatus.CONVERGING).toBe(0);
      // count === 1: CONVERGING
      expect(detector.addSample(0.0, 0.0) & ZUPTStatus.CONVERGING).not.toBe(0);
      // count === 2: CONVERGING
      expect(detector.addSample(0.0, 0.0) & ZUPTStatus.CONVERGING).not.toBe(0);
      // count === 3, 4: still converging (skip assertions)
      detector.addSample(0.0, 0.0);
      detector.addSample(0.0, 0.0);
      // count === 5 (=== min_samples): ZUPT_ACTIVE, no CONVERGING
      expect(detector.addSample(0.0, 0.0) & ZUPTStatus.CONVERGING).toBe(0);
    });

    it('sets ACCEL_QUIET and GYRO_QUIET when ZUPT_ACTIVE is set', () => {
      const detector = makeDetector({ min_time: 0.01 }); // min_samples = 1
      const status = detector.addSample(0.0, 0.0);
      expect(status & ZUPTStatus.ZUPT_ACTIVE).not.toBe(0);
      expect(status & ZUPTStatus.ACCEL_QUIET).not.toBe(0);
      expect(status & ZUPTStatus.GYRO_QUIET).not.toBe(0);
    });

    it('never sets CONVERGING and ZUPT_ACTIVE simultaneously', () => {
      const detector = makeDetector(); // min_samples = 5
      for (let i = 0; i < 10; i++) {
        const status = detector.addSample(0.0, 0.0);
        expect(
          (status & ZUPTStatus.CONVERGING) !== 0 &&
            (status & ZUPTStatus.ZUPT_ACTIVE) !== 0
        ).toBe(false);
      }
    });
  });
});
