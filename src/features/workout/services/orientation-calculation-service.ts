import { BaseCalculation } from '@/features/workout/services/base-calculations';
import { fromW3CAngles, rotateVector } from '@/lib/quaternion';
import { type ICalculations } from '@/types/calculations';
import { CHANNELS } from '@/types/channel-names';
import { type ProcessedSensorData } from '@/types/processed-sensor-data';
/**
 * Orientation calculation service that implements the ICalculations interface.
 *
 * This service rotates accelerometer data based on device orientation.
 * It processes all samples in the data arrays, not just the first one.
 */
export class OrientationCalculationService
  extends BaseCalculation
  implements ICalculations
{
  // Channels we require for this calculation (used by ensureChannels and when
  // taking references).
  protected requiredChannels = [
    CHANNELS.ROTATION_A,
    CHANNELS.ROTATION_B,
    CHANNELS.ROTATION_G,
    CHANNELS.ACCEL_X,
    CHANNELS.ACCEL_Y,
    CHANNELS.ACCEL_Z,
    CHANNELS.ORIENTATION,
    CHANNELS.ACCEL_X_ROTATED,
    CHANNELS.ACCEL_Y_ROTATED,
    CHANNELS.ACCEL_Z_ROTATED,
  ];

  /**
   * Calculate the world-frame rotated accelerations for all samples in the data.
   * Uses quaternion rotation based on W3C device orientation angles.
   */
  calculate(data: ProcessedSensorData): void {
    // Ensure channels are present and capture live references
    this.ensureChannels(data);

    // Determine how many samples we can safely process based on inputs
    this.computeSampleCountFor([
      CHANNELS.ACCEL_X,
      CHANNELS.ACCEL_Y,
      CHANNELS.ACCEL_Z,
      CHANNELS.ROTATION_A,
      CHANNELS.ROTATION_B,
      CHANNELS.ROTATION_G,
    ]);

    const ch = this.channels;

    for (let i = 0; i < this.sampleCount; i++) {
      const [rx, ry, rz] = rotateVector(
        fromW3CAngles(
          ch[CHANNELS.ROTATION_A]![i]!,
          ch[CHANNELS.ROTATION_B]![i]!,
          ch[CHANNELS.ROTATION_G]![i]!
        ),
        [
          ch[CHANNELS.ACCEL_X]![i]!,
          ch[CHANNELS.ACCEL_Y]![i]!,
          ch[CHANNELS.ACCEL_Z]![i]!,
        ]
      );

      ch[CHANNELS.ACCEL_X_ROTATED]!.push(rx);
      ch[CHANNELS.ACCEL_Y_ROTATED]!.push(ry);
      ch[CHANNELS.ACCEL_Z_ROTATED]!.push(rz);
    }
  }
}
