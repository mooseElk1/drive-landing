import { Constants } from '@/constants';
import { BaseCalculation } from '@/features/workout/services/base-calculations';
import { toSeconds, vectorMagnitude } from '@/lib/math-utils';
import { ZUPTStatus } from '@/lib/zupt-detector';
import { logVelocityFSM } from '@/services/logger';
import { type ICalculations } from '@/types/calculations';
import { CHANNELS } from '@/types/channel-names';
import { type ProcessedSensorData } from '@/types/processed-sensor-data';
import {
  type VelocityConfig,
  type VelocityLogger,
  type VelocityVector,
} from '@/types/velocity-calcs';

/**
 * Buffered logger implementation for better performance during high-frequency operations.
 */
class BufferedVelocityLogger implements VelocityLogger {
  transition(
    from: 'NotMoving' | 'Moving',
    to: 'NotMoving' | 'Moving',
    info: string = ''
  ): void {
    logVelocityFSM(`${from} -> ${to} ${info}`.trim());
  }
  event(message: string): void {
    logVelocityFSM(message);
  }
}

const DEFAULT_VELOCITY_CONFIG: Readonly<VelocityConfig> = {
  dt: Constants.Foo.dt,
  velLeak: Constants.VelocityIntegrator.velLeak,
  integrationAccelSource: 'vel_lp',
  velFloorActivationThreshold:
    Constants.VelocityIntegrator.velFloorActivationThreshold,
  velFloorDirectionThreshold:
    Constants.VelocityIntegrator.velFloorDirectionThreshold,
  velFloorMinSamples: Constants.VelocityIntegrator.velFloorMinSamples,
};

/**
 * Implements leak-aware Euler velocity integration with ZUPT velocity-zeroing.
 *
 * The acceleration source is selected via `config.integrationAccelSource`:
 *   'lp'  → ACCEL_X/Y/Z_LP   (low-pass filtered, default)
 *   'hp'  → ACCEL_X/Y/Z_OUTPUT_FILTERED (high-pass filtered)
 *   'raw' → ACCEL_X/Y/Z_OUTPUT (bias-corrected, unfiltered)
 *
 * ZUPT status is consumed from CHANNELS.ZUPT_STATUS, which is populated
 * upstream by AccelerationCalculationService. When ZUPT_ACTIVE is set the
 * integrated velocity is zeroed. Bias estimation is also handled upstream.
 */
export class VelocityCalculationService
  extends BaseCalculation
  implements ICalculations
{
  private readonly config: Readonly<VelocityConfig>;
  private readonly logger: VelocityLogger;

  private previousVelocity: VelocityVector;
  private sessionStartTimeSec: number | null;

  // Sprint-direction floor state
  private floorArmed: boolean;
  private sprintDirUnit: { x: number; y: number; z: number };
  private prevVelAbs: number;
  private floorBelowCount: number;

  protected requiredChannels = [
    CHANNELS.TIMESTAMP,
    CHANNELS.TIME,
    CHANNELS.VELOCITY_X,
    CHANNELS.VELOCITY_Y,
    CHANNELS.VELOCITY_Z,
    CHANNELS.VELOCITY_MAGNITUDE,
    CHANNELS.ACCEL_X_OUTPUT,
    CHANNELS.ACCEL_Y_OUTPUT,
    CHANNELS.ACCEL_Z_OUTPUT,
    CHANNELS.ACCEL_X_OUTPUT_FILTERED,
    CHANNELS.ACCEL_Y_OUTPUT_FILTERED,
    CHANNELS.ACCEL_Z_OUTPUT_FILTERED,
    CHANNELS.ACCEL_X_LP,
    CHANNELS.ACCEL_Y_LP,
    CHANNELS.ACCEL_Z_LP,
    CHANNELS.ACCEL_X_VEL_LP,
    CHANNELS.ACCEL_Y_VEL_LP,
    CHANNELS.ACCEL_Z_VEL_LP,
    CHANNELS.ZUPT_STATUS,
  ];

  constructor(config?: Partial<VelocityConfig>, logger?: VelocityLogger) {
    super();
    this.config = { ...DEFAULT_VELOCITY_CONFIG, ...config };
    this.logger = logger ?? new BufferedVelocityLogger();

    this.previousVelocity = { x: 0, y: 0, z: 0, abs: 0 };
    this.sessionStartTimeSec = null;
    this.floorArmed = false;
    this.sprintDirUnit = { x: 0, y: 0, z: 0 };
    this.prevVelAbs = 0;
    this.floorBelowCount = 0;
  }

  updateConfig(patch: Partial<VelocityConfig>): void {
    Object.assign(this.config as VelocityConfig, patch);
  }

  /** Returns the three acceleration channel keys to use for integration. */
  private _resolveAccelChannels(): [string, string, string] {
    switch (this.config.integrationAccelSource) {
      case 'vel_lp':
        return [
          CHANNELS.ACCEL_X_VEL_LP,
          CHANNELS.ACCEL_Y_VEL_LP,
          CHANNELS.ACCEL_Z_VEL_LP,
        ];
      case 'lp':
        return [CHANNELS.ACCEL_X_LP, CHANNELS.ACCEL_Y_LP, CHANNELS.ACCEL_Z_LP];
      case 'hp':
        return [
          CHANNELS.ACCEL_X_OUTPUT_FILTERED,
          CHANNELS.ACCEL_Y_OUTPUT_FILTERED,
          CHANNELS.ACCEL_Z_OUTPUT_FILTERED,
        ];
      default:
        return [
          CHANNELS.ACCEL_X_OUTPUT,
          CHANNELS.ACCEL_Y_OUTPUT,
          CHANNELS.ACCEL_Z_OUTPUT,
        ];
    }
  }

  /** Leak-aware Euler velocity integration for one sample. */
  private _integrateVelocity(
    accelX: number,
    accelY: number,
    accelZ: number
  ): VelocityVector {
    const { velLeak, dt } = this.config;
    const prev = this.previousVelocity;
    const vx = velLeak * (prev.x + accelX * dt);
    const vy = velLeak * (prev.y + accelY * dt);
    const vz = velLeak * (prev.z + accelZ * dt);
    return { x: vx, y: vy, z: vz, abs: vectorMagnitude(vx, vy, vz) };
  }

  /**
   * Apply the sprint-direction component floor to a candidate velocity vector.
   * Returns the (possibly zeroed) velocity and updates internal floor state.
   * Call only when not at rest and after _integrateVelocity.
   */
  private _applySprintFloor(
    vel: VelocityVector,
    thresholds: {
      activation: number;
      direction: number;
      minSamples: number;
    }
  ): VelocityVector {
    const { activation, direction, minSamples } = thresholds;
    if (!this.floorArmed && vel.abs >= activation) {
      this.floorArmed = true;
      this.floorBelowCount = 0;
    }
    if (!this.floorArmed) return vel;

    if (vel.abs >= this.prevVelAbs && vel.abs > 0) {
      this.sprintDirUnit = {
        x: vel.x / vel.abs,
        y: vel.y / vel.abs,
        z: vel.z / vel.abs,
      };
    }

    const sprintComponent =
      vel.x * this.sprintDirUnit.x +
      vel.y * this.sprintDirUnit.y +
      vel.z * this.sprintDirUnit.z;

    if (sprintComponent < direction) {
      this.floorBelowCount++;
      if (this.floorBelowCount >= minSamples) {
        this.floorArmed = false;
        this.floorBelowCount = 0;
        return { x: 0, y: 0, z: 0, abs: 0 };
      }
    } else {
      this.floorBelowCount = 0;
    }
    return vel;
  }

  calculate(data: ProcessedSensorData): void {
    this.ensureChannels(data);
    this.computeSampleCountFor([
      CHANNELS.ACCEL_X_OUTPUT,
      CHANNELS.ACCEL_Y_OUTPUT,
      CHANNELS.ACCEL_Z_OUTPUT,
      CHANNELS.TIMESTAMP,
    ]);

    const ch = this.channels;
    const [axCh, ayCh, azCh] = this._resolveAccelChannels();
    const {
      velFloorActivationThreshold = Constants.VelocityIntegrator
        .velFloorActivationThreshold,
      velFloorDirectionThreshold = Constants.VelocityIntegrator
        .velFloorDirectionThreshold,
      velFloorMinSamples = Constants.VelocityIntegrator.velFloorMinSamples,
    } = this.config;

    for (let i = 0; i < this.sampleCount; i++) {
      const aX = ch[axCh]![i] ?? ch[CHANNELS.ACCEL_X_OUTPUT]![i]!;
      const aY = ch[ayCh]![i] ?? ch[CHANNELS.ACCEL_Y_OUTPUT]![i]!;
      const aZ = ch[azCh]![i] ?? ch[CHANNELS.ACCEL_Z_OUTPUT]![i]!;
      const integrated = this._integrateVelocity(aX, aY, aZ);
      const isRest =
        ((ch[CHANNELS.ZUPT_STATUS]?.[i] ?? 0) & ZUPTStatus.ZUPT_ACTIVE) !== 0;

      let currentVelocity: VelocityVector;
      if (isRest) {
        currentVelocity = { x: 0, y: 0, z: 0, abs: 0 };
        this.floorArmed = false;
        this.floorBelowCount = 0;
        this.prevVelAbs = 0;
      } else {
        currentVelocity = this._applySprintFloor(integrated, {
          activation: velFloorActivationThreshold,
          direction: velFloorDirectionThreshold,
          minSamples: velFloorMinSamples,
        });
      }

      this.prevVelAbs = currentVelocity.abs;
      this.previousVelocity = currentVelocity;

      const timestampSec = toSeconds(ch[CHANNELS.TIMESTAMP]?.[i]);
      if (this.sessionStartTimeSec === null) {
        this.sessionStartTimeSec = timestampSec;
      }
      const elapsedSec = Math.max(0, timestampSec - this.sessionStartTimeSec);

      ch[CHANNELS.VELOCITY_X]!.push(currentVelocity.x);
      ch[CHANNELS.VELOCITY_Y]!.push(currentVelocity.y);
      ch[CHANNELS.VELOCITY_Z]!.push(currentVelocity.z);
      ch[CHANNELS.VELOCITY_MAGNITUDE]!.push(currentVelocity.abs);
      ch[CHANNELS.TIME]!.push(elapsedSec);
    }
  }
}
