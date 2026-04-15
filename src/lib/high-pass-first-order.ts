/**
 * First-order high-pass filter (discrete-time implementation).
 *
 * Implements the difference equation:
 *   y[n] = alpha * (y[n-1] + x[n] - x[n-1])
 * where alpha = RC / (RC + dt) and RC = 1 / (2*pi*cutoffFreq).
 *
 * This filter removes (attenuates) low-frequency components below the
 * specified cutoff frequency. It's useful for removing gravity or slow
 * biases from acceleration signals prior to further processing.
 */
export class HighPassFirstOrder {
  private alpha: number;
  private prevInput: number;
  private prevOutput: number;

  /**
   * Create a HighPassFirstOrder filter.
   *
   * @param cutoffFreq - cutoff frequency in Hz. Must be > 0. Lower values
   *   make the filter pass fewer low-frequency components.
   * @param samplePeriod - sample period (dt) in seconds. Must be > 0.
   *
   * Notes:
   * - The implementation computes RC = 1 / (2*pi*cutoffFreq) and
   *   alpha = RC / (RC + dt).
   * - If invalid values (<= 0) are provided the resulting alpha may be
   *   incorrect; callers should validate inputs if needed.
   */
  constructor(cutoffFreq: number, samplePeriod: number) {
    const rc = 1 / (2 * Math.PI * cutoffFreq);
    this.alpha = rc / (rc + samplePeriod);
    this.prevInput = 0;
    this.prevOutput = 0;
  }

  /**
   * Add a new sample and return the filtered output.
   *
   * @param value - new input sample (same units as the signal being filtered).
   * @returns filtered output sample.
   *
   * Edge cases:
   * - The filter is stateful. The first few outputs depend on initial state
   *   (prevInput and prevOutput are initialized to 0). For best results, the
   *   filter should be 'warmed up' or initial conditions chosen appropriately.
   */
  add(value: number): number {
    const output = this.alpha * (this.prevOutput + value - this.prevInput);
    this.prevInput = value;
    this.prevOutput = output;
    return output;
  }
}
