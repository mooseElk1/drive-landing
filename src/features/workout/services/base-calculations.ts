import { type ICalculations } from '@/types/calculations';
import { type ProcessedSensorData } from '@/types/processed-sensor-data';

/**
 * BaseCalculation
 *
 * Provides shared utilities for calculation services that operate on
 * ProcessedSensorData. Subclasses should set `requiredChannels` and implement
 * the `calculate` method.
 */
export abstract class BaseCalculation implements ICalculations {
  /** Map of channel id -> live array reference (populated by ensureChannels) */
  protected channels: Record<string, number[]> = {};

  /** Number of samples that are safe to process (set by computeSampleCountFor) */
  protected sampleCount = 0;

  /** Channels required by the specific calculation. Subclasses must set this. */
  protected requiredChannels: string[] = [];

  /**
   * Ensure the required channels exist on the provided data and store live
   * references to the underlying arrays in `this.channels`.
   */
  protected ensureChannels(data: ProcessedSensorData): void {
    data.ensureChannels(this.requiredChannels);
    for (const ch of this.requiredChannels) {
      this.channels[ch] = data.getChannelData(ch);
    }
  }

  /**
   * Compute a safe sample count as the minimum length among the provided
   * channel identifiers. Sets and returns `this.sampleCount`.
   */
  protected computeSampleCountFor(channelList: string[]): number {
    const lengths = channelList.map((ch) => this.channels[ch]!.length);
    this.sampleCount = Math.min(...lengths);
    return this.sampleCount;
  }

  abstract calculate(data: ProcessedSensorData): void;
}
