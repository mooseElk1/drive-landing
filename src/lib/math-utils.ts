import { Constants } from '@/constants';

/**
 * Calculate the Euclidean magnitude of a 3D vector.
 *
 * @param x - X component
 * @param y - Y component
 * @param z - Z component
 * @returns sqrt(x² + y² + z²)
 */
export function vectorMagnitude(x: number, y: number, z: number): number {
  return Math.sqrt(x * x + y * y + z * z);
}

/**
 * Normalise a raw sensor timestamp to seconds.
 *
 * Device timestamps can arrive either in seconds (e.g. iOS CoreMotion) or
 * milliseconds (e.g. Android sensor events). Values above
 * {@link Constants.Timestamp.millisecondThreshold} are assumed to be in
 * milliseconds and are divided by 1 000.
 *
 * @param rawTimestamp - The raw timestamp value, or `undefined` when absent.
 * @returns The timestamp expressed in seconds.
 */
export function toSeconds(rawTimestamp: number | undefined): number {
  const safeTimestamp = rawTimestamp ?? 0;
  return safeTimestamp > Constants.Timestamp.millisecondThreshold
    ? safeTimestamp / 1000
    : safeTimestamp;
}
