/**
 * ZUPTDetector (Zero-Velocity UPdaTe detector)
 *
 * Simple threshold-based detector that declares the IMU to be in a zero-velocity
 * state when both the accelerometer magnitude and gyroscope magnitude stay
 * below configured thresholds for a minimum number of consecutive samples.
 *
 * This implementation is intentionally lightweight and deterministic. It's
 * suitable for on-device zero-velocity detection when performing inertial
 * navigation or sensor fusion that needs occasional velocity resets.
 *
 * Behaviour contract:
 * - addSample(accel_mag, gyro_mag) should be called for each time step.
 * - When both magnitudes are below their thresholds for at least
 *   `min_time / dt` consecutive samples, the detector returns true.
 * - The detector state resets (count -> 0) as soon as a sample exceeds either
 *   threshold.
 */

export interface ZUPTConfig {
  /** sampling period (seconds) */
  dt: number;
  /** accelerometer magnitude threshold (units should match accel_mag passed to addSample) */
  acc_thresh: number;
  /** gyroscope magnitude threshold (units should match gyro_mag passed to addSample) */
  gyro_thresh: number;
  /** minimum zero-velocity duration (seconds) */
  min_time: number;
}

export const ZUPTStatus = {
  ACCEL_QUIET: 1,
  GYRO_QUIET: 2,
  CONVERGING: 4,
  ZUPT_ACTIVE: 8,
} as const;

export class ZUPTDetector {
  private acc_thresh: number;
  private gyro_thresh: number;
  private dt: number;
  private min_time: number;
  private min_samples: number;
  private count: number;

  constructor(config: ZUPTConfig) {
    const { dt, acc_thresh, gyro_thresh, min_time } = config;

    this.acc_thresh = acc_thresh;
    this.gyro_thresh = gyro_thresh;
    this.dt = dt;
    this.min_time = min_time;
    this.min_samples = Math.max(1, Math.floor(min_time / dt));
    this.count = 0;
  }
  /**
   * Process a single IMU sample and update the detector state.
   *
   * @param accel_mag - magnitude of the accelerometer vector (e.g. sqrt(ax^2+ay^2+az^2)).
   * @param gyro_mag - magnitude of the gyroscope vector (e.g. sqrt(wx^2+wy^2+wz^2)).
   * @returns A bitfield composed of `ZUPTStatus` flags. `ZUPT_ACTIVE` is set when
   *   a zero-velocity condition has been maintained for at least the configured
   *   minimum number of consecutive samples.
   *
   * Notes / edge cases:
   * - If `min_time` passed to the constructor was less than `dt`, the detector
   *   will require at least one sample (floor(min_time/dt) is clamped to 1).
   * - The thresholds are strict ("<"). If equality behavior is desired, pass
   *   thresholds adjusted accordingly.
   */
  updateConfig(config: Partial<ZUPTConfig>): void {
    if (config.acc_thresh !== undefined) this.acc_thresh = config.acc_thresh;
    if (config.gyro_thresh !== undefined) this.gyro_thresh = config.gyro_thresh;
    if (config.dt !== undefined) this.dt = config.dt;
    if (config.min_time !== undefined) this.min_time = config.min_time;
    if (config.min_time !== undefined || config.dt !== undefined) {
      this.min_samples = Math.max(1, Math.floor(this.min_time / this.dt));
    }
  }

  addSample(accel_mag: number, gyro_mag: number): number {
    const a_ok = accel_mag < this.acc_thresh;
    const g_ok = gyro_mag < this.gyro_thresh;

    if (a_ok && g_ok) {
      this.count += 1;
    } else {
      // Reset consecutive-sample counter on any threshold violation
      this.count = 0;
    }

    let status = 0;
    if (a_ok) status |= ZUPTStatus.ACCEL_QUIET;
    if (g_ok) status |= ZUPTStatus.GYRO_QUIET;
    if (this.count > 0 && this.count < this.min_samples)
      status |= ZUPTStatus.CONVERGING;
    if (this.count >= this.min_samples) status |= ZUPTStatus.ZUPT_ACTIVE;
    return status;
  }
}
