import { type DeviceMotionMeasurement } from 'expo-sensors';

import { CHANNELS } from '@/types/channel-names';

function isDeviceMotionMeasurement(
  obj: unknown
): obj is DeviceMotionMeasurement {
  return (
    typeof obj === 'object' &&
    obj !== null &&
    ('acceleration' in obj || 'rotationRate' in obj || 'rotation' in obj)
  );
}

function isChannelsLike(
  obj: unknown
): obj is { channels?: Record<string, number[]> } {
  if (typeof obj !== 'object' || obj === null) return false;
  const maybe = obj as { channels?: unknown };
  if (maybe.channels === undefined) return true;
  if (typeof maybe.channels !== 'object' || maybe.channels === null)
    return false;
  const ch = maybe.channels as Record<string, unknown>;
  for (const k of Object.keys(ch)) {
    const val = ch[k];
    if (!Array.isArray(val)) return false;
    if (!val.every((v) => typeof v === 'number')) return false;
  }
  return true;
}

/**
 * Canonical ProcessedSensorData shape:
 * - `channels` holds channel-name => number[].
 * - Class methods operate on `channels`. Use toJSON/fromJSON for serialization.
 */

export interface ProcessedSensorData {
  channels: Record<string, number[]>;
  addData(data?: ProcessedSensorData): ProcessedSensorData;
  getLastNSeconds(n: number): ProcessedSensorData;
  getChannelData(channelName: string): number[];
  getLastData(chartTimeInSeconds: number, channel: string): number[];
  getDataInRange(startMs: number, endMs: number, channel: string): number[];
  getTimestampsInRange(startMs: number, endMs: number): number[];
  length(): number;
  /**
   * Ensure the specified channels exist as arrays on this ProcessedSensorData.
   * Missing channels will be created as empty arrays.
   */
  ensureChannels(requiredChannels: string[]): void;
  toJSON(): { channels: Record<string, number[]> };
}

export class ProcessedSensorData implements ProcessedSensorData {
  channels: Record<string, number[]> = {};

  constructor(
    data?: DeviceMotionMeasurement | { channels?: Record<string, number[]> }
  ) {
    if (!data) return;

    // Deserialized shape
    if (
      isChannelsLike(data) &&
      data.channels &&
      typeof data.channels === 'object'
    ) {
      this.channels = { ...data.channels };
      return;
    }

    // DeviceMotionMeasurement seed
    if (isDeviceMotionMeasurement(data)) {
      const maybeDM = data;
      if (maybeDM && (maybeDM.acceleration || maybeDM.rotationRate)) {
        this.channels[CHANNELS.ORIENTATION] = [maybeDM.orientation ?? 0];
        this.channels[CHANNELS.ACCEL_X] = [maybeDM.acceleration?.x ?? 0];
        this.channels[CHANNELS.ACCEL_Y] = [maybeDM.acceleration?.y ?? 0];
        this.channels[CHANNELS.ACCEL_Z] = [maybeDM.acceleration?.z ?? 0];
        this.channels[CHANNELS.ACCEL_X_GRAV] = [
          maybeDM.accelerationIncludingGravity?.x ?? 0,
        ];
        this.channels[CHANNELS.ACCEL_Y_GRAV] = [
          maybeDM.accelerationIncludingGravity?.y ?? 0,
        ];
        this.channels[CHANNELS.ACCEL_Z_GRAV] = [
          maybeDM.accelerationIncludingGravity?.z ?? 0,
        ];
        this.channels[CHANNELS.GYRO_X] = [maybeDM.rotationRate?.alpha ?? 0];
        this.channels[CHANNELS.GYRO_Y] = [maybeDM.rotationRate?.beta ?? 0];
        this.channels[CHANNELS.GYRO_Z] = [maybeDM.rotationRate?.gamma ?? 0];
        this.channels[CHANNELS.ROTATION_A] = [maybeDM.rotation?.alpha ?? 0];
        this.channels[CHANNELS.ROTATION_B] = [maybeDM.rotation?.beta ?? 0];
        this.channels[CHANNELS.ROTATION_G] = [maybeDM.rotation?.gamma ?? 0];
        this.channels[CHANNELS.TIMESTAMP] = [
          maybeDM.acceleration?.timestamp ?? 0,
        ];
        this.channels[CHANNELS.TIMESTAMP_ACCEL] = [
          maybeDM.acceleration?.timestamp ?? 0,
        ];
        this.channels[CHANNELS.TIMESTAMP_GYRO] = [
          maybeDM.rotationRate?.timestamp ?? 0,
        ];
        this.channels[CHANNELS.TIMESTAMP_ROTATION] = [
          maybeDM.rotation?.timestamp ?? 0,
        ];
        return;
      }
    }
  }

  addData(data?: ProcessedSensorData): ProcessedSensorData {
    if (!data || !data.channels) return this;
    for (const key of Object.keys(data.channels)) {
      const arr = data.channels[key];
      if (!Array.isArray(arr)) continue;
      if (!this.channels[key]) this.channels[key] = [];
      this.channels[key].push(...arr);
    }
    return this;
  }

  length(): number {
    const arrays = Object.values(this.channels).filter((val) =>
      Array.isArray(val)
    ) as number[][];
    return arrays.length > 0 ? Math.max(...arrays.map((arr) => arr.length)) : 0;
  }

  getLastData(chartTimeInSeconds: number, channel: string): number[] {
    const timestamps = this.getChannelData(CHANNELS.TIMESTAMP);
    if (!timestamps || timestamps.length === 0) return [];

    const channelData = this.getChannelData(channel);
    if (!channelData || channelData.length === 0) return [];

    const endTime = timestamps[timestamps.length - 1]!;
    const targetIndex = this.findIndex(endTime - chartTimeInSeconds * 1000);

    return channelData.slice(targetIndex);
  }

  getDataInRange(startMs: number, endMs: number, channel: string): number[] {
    const timestamps = this.getChannelData(CHANNELS.TIMESTAMP);
    if (timestamps.length === 0) return [];
    const channelData = this.getChannelData(channel);
    if (channelData.length === 0) return [];

    const startIdx = this.findIndex(startMs);
    let lo = 0,
      hi = timestamps.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (timestamps[mid]! <= endMs) lo = mid + 1;
      else hi = mid;
    }

    return channelData.slice(startIdx, lo);
  }

  getTimestampsInRange(startMs: number, endMs: number): number[] {
    const timestamps = this.getChannelData(CHANNELS.TIMESTAMP);
    if (timestamps.length === 0) return [];

    const startIdx = this.findIndex(startMs);
    let lo = 0,
      hi = timestamps.length;
    while (lo < hi) {
      const mid = (lo + hi) >>> 1;
      if (timestamps[mid]! <= endMs) lo = mid + 1;
      else hi = mid;
    }

    return timestamps.slice(startIdx, lo);
  }

  getLastNSeconds(n: number): ProcessedSensorData {
    const timestamps = this.getChannelData(CHANNELS.TIMESTAMP);
    if (!timestamps || timestamps.length === 0)
      return new ProcessedSensorData();

    const endTime = timestamps[timestamps.length - 1]!;
    const targetIndex = this.findIndex(endTime - n * 1000);

    const result = new ProcessedSensorData();
    for (const key of Object.keys(this.channels)) {
      const arr = this.getChannelData(key);
      if (arr.length > 0) result.channels[key] = arr.slice(targetIndex);
    }
    return result;
  }

  private findIndex(target: number): number {
    let left = 0;
    const timestamps = this.getChannelData(CHANNELS.TIMESTAMP);
    let right = timestamps.length - 1;

    while (left <= right) {
      const mid = Math.floor((left + right) / 2);
      const midValue = timestamps[mid]!;

      if (midValue === target) {
        return mid;
      } else if (midValue < target) {
        left = mid + 1;
      } else {
        right = mid - 1;
      }
    }

    return left;
  }

  getChannelData(channelName: string): number[] {
    const data = this.channels?.[channelName];
    if (Array.isArray(data)) return data;
    return [];
  }

  /**
   * Ensure the specified channels exist on this instance.
   * Creates empty arrays for any missing channels.
   */
  ensureChannels(requiredChannels: string[]): void {
    if (!Array.isArray(requiredChannels)) return;
    this.channels = this.channels || {};
    for (const ch of requiredChannels) {
      if (!Array.isArray(this.channels[ch])) {
        this.channels[ch] = [];
      }
    }
  }

  toJSON() {
    return { channels: this.channels };
  }

  static fromJSON(obj: unknown): ProcessedSensorData {
    if (
      isChannelsLike(obj) &&
      obj.channels &&
      typeof obj.channels === 'object'
    ) {
      return new ProcessedSensorData({ channels: obj.channels });
    }
    return new ProcessedSensorData();
  }
}
