import { BaseCalculation } from '@/features/workout/services/base-calculations';
import { vectorMagnitude } from '@/lib/math-utils';
import { type PowerConfig } from '@/types/calculation-configs';
import { type ICalculations } from '@/types/calculations';
import { CHANNELS } from '@/types/channel-names';
import { type ProcessedSensorData } from '@/types/processed-sensor-data';

const DEFAULT_POWER_CONFIG: Readonly<PowerConfig> = {
  mass: 70, // kg
};

/**
 * Power calculation service that implements the ICalculations interface.
 *
 * Power is calculated using the formula: Power = Force × Velocity
 * In the context of sports/exercise, this can be approximated as:
 * Power = Mass × Acceleration × Velocity
 *
 * The service calculates:
 * - Instantaneous power in each axis (x, y, z)
 * - Power magnitude (total power)
 * - Average power over the measurement period
 */
export class PowerCalculationService
  extends BaseCalculation
  implements ICalculations
{
  private config: Readonly<PowerConfig>;
  private powerSum = 0;
  private runningCount = 0;

  protected requiredChannels = [
    CHANNELS.ACCEL_X,
    CHANNELS.ACCEL_Y,
    CHANNELS.ACCEL_Z,
    CHANNELS.VELOCITY_X,
    CHANNELS.VELOCITY_Y,
    CHANNELS.VELOCITY_Z,
    CHANNELS.VELOCITY_MAGNITUDE,
    CHANNELS.POWER_X,
    CHANNELS.POWER_Y,
    CHANNELS.POWER_Z,
    CHANNELS.POWER_MAGNITUDE,
    CHANNELS.POWER_INSTANTANEOUS,
    CHANNELS.POWER_AVERAGE,
  ];

  constructor(config?: Partial<PowerConfig>) {
    super();
    this.config = { ...DEFAULT_POWER_CONFIG, ...config };
  }

  /**
   * Calculate power using the formula: Power = Mass × Acceleration × Velocity
   * This provides an approximation of mechanical power output during movement.
   */
  calculate(data: ProcessedSensorData): void {
    this.ensureChannels(data);
    this.computeSampleCountFor([
      CHANNELS.ACCEL_X,
      CHANNELS.ACCEL_Y,
      CHANNELS.ACCEL_Z,
      CHANNELS.VELOCITY_X,
      CHANNELS.VELOCITY_Y,
      CHANNELS.VELOCITY_Z,
    ]);

    const ch = this.channels;
    const mass = this.config.mass;

    for (let i = 0; i < this.sampleCount; i++) {
      const ax = ch[CHANNELS.ACCEL_X]![i]!;
      const ay = ch[CHANNELS.ACCEL_Y]![i]!;
      const az = ch[CHANNELS.ACCEL_Z]![i]!;

      const vx = ch[CHANNELS.VELOCITY_X]![i]!;
      const vy = ch[CHANNELS.VELOCITY_Y]![i]!;
      const vz = ch[CHANNELS.VELOCITY_Z]![i]!;

      // P = m * a * v per axis
      const powerX = mass * ax * vx;
      const powerY = mass * ay * vy;
      const powerZ = mass * az * vz;

      // Instantaneous power: dot product F · v = m * (ax*vx + ay*vy + az*vz)
      const instantaneousPower = mass * (ax * vx + ay * vy + az * vz);

      this.powerSum += instantaneousPower;
      this.runningCount++;

      ch[CHANNELS.POWER_X]!.push(powerX);
      ch[CHANNELS.POWER_Y]!.push(powerY);
      ch[CHANNELS.POWER_Z]!.push(powerZ);
      ch[CHANNELS.POWER_MAGNITUDE]!.push(
        vectorMagnitude(powerX, powerY, powerZ)
      );
      ch[CHANNELS.POWER_INSTANTANEOUS]!.push(instantaneousPower);
      ch[CHANNELS.POWER_AVERAGE]!.push(
        this.runningCount > 0 ? this.powerSum / this.runningCount : 0
      );
    }
  }

  setMass(mass: number): void {
    this.config = { ...this.config, mass };
  }

  getMass(): number {
    return this.config.mass;
  }

  reset(): void {
    this.powerSum = 0;
    this.runningCount = 0;
  }
}
