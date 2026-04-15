export class MovingAverage {
  /**
   * Simple fixed-size moving average (sliding window) implementation.
   * Keeps a circular buffer and running sum for O(1) updates.
   */
  private windowSize: number;
  private buffer: number[];
  private sum: number;
  private index: number;
  private count: number;
  /**
   * Create a MovingAverage.
   * @param windowSize Number of samples in the moving window (must be >= 1)
   */
  constructor(windowSize: number) {
    if (!Number.isInteger(windowSize) || windowSize < 1) {
      throw new Error('windowSize must be an integer >= 1');
    }
    this.windowSize = windowSize;
    this.buffer = new Array(windowSize).fill(0);
    this.sum = 0;
    this.index = 0;
    this.count = 0;
  }
  /**
   * Add a new sample and return the current average.
   *
   * @param value - new sample (must be a finite number). Passing NaN or
   *  non-number will throw an error to avoid silently corrupting the running sum.
   * @returns the current moving average computed over up to `windowSize`
   *  most recent samples. While fewer than `windowSize` samples have been
   *  provided, the average is over the number of samples seen so far.
   *
   * Complexity: O(1) per call (uses circular buffer and running sum).
   */
  add(value: number): number {
    if (
      typeof value !== 'number' ||
      Number.isNaN(value) ||
      !Number.isFinite(value)
    ) {
      throw new Error('value must be a finite number');
    }

    // subtract the value being replaced, add the new one
    const replaced = this.buffer[this.index]!;
    this.buffer[this.index] = value;
    this.sum += value - replaced;

    // advance index and count
    this.index = (this.index + 1) % this.windowSize;
    if (this.count < this.windowSize) this.count += 1;

    return this.sum / this.count;
  }
}
