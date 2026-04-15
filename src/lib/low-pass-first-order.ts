/**
 * First-order low-pass filter (discrete-time implementation).
 *
 * Implements the difference equation:
 *   y[n] = (1 − α) · y[n−1] + α · x[n]
 * where α = dt / (RC + dt) and RC = 1 / (2π · f_c).
 *
 * This filter passes low-frequency components and attenuates signals
 * above the specified cutoff frequency. Useful for smoothing bias-corrected
 * acceleration before velocity integration.
 */
export class LowPassFirstOrder {
  private readonly alpha: number;
  private prevOutput: number;

  /**
   * Create a LowPassFirstOrder filter.
   *
   * @param cutoffFreq - cutoff frequency in Hz. Must be > 0.
   * @param samplePeriod - sample period (dt) in seconds. Must be > 0.
   */
  constructor(cutoffFreq: number, samplePeriod: number) {
    const rc = 1 / (2 * Math.PI * cutoffFreq);
    this.alpha = samplePeriod / (rc + samplePeriod);
    this.prevOutput = 0;
  }

  /**
   * Add a new sample and return the filtered output.
   *
   * @param value - new input sample.
   * @returns filtered output sample.
   */
  add(value: number): number {
    this.prevOutput = (1 - this.alpha) * this.prevOutput + this.alpha * value;
    return this.prevOutput;
  }
}
