import { Constants } from '@/constants';
import { BaseCalculation } from '@/features/workout/services/base-calculations';
import { HighPassFirstOrder } from '@/lib/high-pass-first-order';
import { LowPassFirstOrder } from '@/lib/low-pass-first-order';
import { vectorMagnitude } from '@/lib/math-utils';
import { MovingAverage } from '@/lib/moving-average';
import { fromW3CAngles, rotateVector } from '@/lib/quaternion';
import { ZUPTDetector, ZUPTStatus } from '@/lib/zupt-detector';
import { type AccelerationConfig } from '@/types/calculation-configs';
import { type ICalculations } from '@/types/calculations';
import { CHANNELS } from '@/types/channel-names';
import { type ProcessedSensorData } from '@/types/processed-sensor-data';

const X = 0;
const Y = 1;
const Z = 2;
type AxisTuple = [number, number, number];

const DEFAULT_ACCELERATION_CONFIG: Readonly<AccelerationConfig> = {
  applyRotation: Constants.AccelerationProcessor.applyRotation,
  removeBias: Constants.AccelerationProcessor.removeBias,
  smoothWindowSize: Constants.AccelerationProcessor.smoothWindowSize,
  hpfCutoffHz: Constants.AccelerationProcessor.hpfCutoffHz,
  lpfCutoffHz: Constants.AccelerationProcessor.lpfCutoffHz,
  velLpfCutoffHz: Constants.AccelerationProcessor.velLpfCutoffHz,
  dt: Constants.Foo.dt,
  zuptAccelThreshold: Constants.ZuptDetector.zuptAccelThreshold,
  zuptGyroThreshold: Constants.ZuptDetector.zuptGyroThreshold,
  zuptMinTime: Constants.ZuptDetector.zuptMinTime,
  zuptBiasAlphaActive: Constants.AccelerationProcessor.zuptBiasAlphaActive,
};

/**
 * Acceleration calculation service.
 *
 * Pipeline per sample:
 *  1. Read raw ACCEL_X/Y/Z; compute raw magnitude + gyro magnitude.
 *  2. Optionally rotate to world frame via device-orientation quaternion (ROTATION_A/B/G).
 *     Emits ACCEL_X/Y/Z_ROTATED either way (rotated or raw copy).
 *  3. Pre-smooth rotated values via MovingAverage (used for bias EMA stability).
 *  4. Run ZUPT detection; during rest, slowly update per-axis bias via EMA.
 *     Emits ACCEL_X/Y/Z_BIAS.
 *  5. Output = rotated − (removeBias ? bias : 0).
 *     Emits ACCEL_X/Y/Z_OUTPUT + ACCEL_MAGNITUDE_OUTPUT.
 *  6. Filtered output = HPF(smoothed − (removeBias ? bias : 0)).
 *     Emits ACCEL_X/Y/Z_OUTPUT_FILTERED + ACCEL_MAGNITUDE_OUTPUT_FILTERED.
 */
export class AccelerationCalculationService
  extends BaseCalculation
  implements ICalculations
{
  private config: Readonly<AccelerationConfig>;

  private readonly smoothers: [MovingAverage, MovingAverage, MovingAverage];
  private readonly hpfs: [
    HighPassFirstOrder,
    HighPassFirstOrder,
    HighPassFirstOrder,
  ];
  private lpfs: [LowPassFirstOrder, LowPassFirstOrder, LowPassFirstOrder];
  private velLpfs: [LowPassFirstOrder, LowPassFirstOrder, LowPassFirstOrder];
  private zuptDetector: ZUPTDetector;
  private bias: AxisTuple;
  protected requiredChannels = [
    CHANNELS.ACCEL_X,
    CHANNELS.ACCEL_Y,
    CHANNELS.ACCEL_Z,
    CHANNELS.GYRO_X,
    CHANNELS.GYRO_Y,
    CHANNELS.GYRO_Z,
    CHANNELS.ROTATION_A,
    CHANNELS.ROTATION_B,
    CHANNELS.ROTATION_G,
    CHANNELS.ACCEL_MAGNITUDE,
    CHANNELS.GYRO_MAGNITUDE,
    CHANNELS.ACCEL_X_ROTATED,
    CHANNELS.ACCEL_Y_ROTATED,
    CHANNELS.ACCEL_Z_ROTATED,
    CHANNELS.ZUPT_STATUS,
    CHANNELS.ACCEL_X_BIAS,
    CHANNELS.ACCEL_Y_BIAS,
    CHANNELS.ACCEL_Z_BIAS,
    CHANNELS.ACCEL_X_OUTPUT,
    CHANNELS.ACCEL_Y_OUTPUT,
    CHANNELS.ACCEL_Z_OUTPUT,
    CHANNELS.ACCEL_MAGNITUDE_OUTPUT,
    CHANNELS.ACCEL_X_OUTPUT_FILTERED,
    CHANNELS.ACCEL_Y_OUTPUT_FILTERED,
    CHANNELS.ACCEL_Z_OUTPUT_FILTERED,
    CHANNELS.ACCEL_MAGNITUDE_OUTPUT_FILTERED,
    CHANNELS.ACCEL_X_LP,
    CHANNELS.ACCEL_Y_LP,
    CHANNELS.ACCEL_Z_LP,
    CHANNELS.ACCEL_MAGNITUDE_LP,
    CHANNELS.ACCEL_X_VEL_LP,
    CHANNELS.ACCEL_Y_VEL_LP,
    CHANNELS.ACCEL_Z_VEL_LP,
    CHANNELS.ACCEL_MAGNITUDE_VEL_LP,
  ];

  constructor(config?: Partial<AccelerationConfig>) {
    super();
    this.config = { ...DEFAULT_ACCELERATION_CONFIG, ...config };

    const { smoothWindowSize, hpfCutoffHz, lpfCutoffHz, velLpfCutoffHz, dt } =
      this.config;
    this.smoothers = [
      new MovingAverage(smoothWindowSize),
      new MovingAverage(smoothWindowSize),
      new MovingAverage(smoothWindowSize),
    ];
    this.hpfs = [
      new HighPassFirstOrder(hpfCutoffHz, dt),
      new HighPassFirstOrder(hpfCutoffHz, dt),
      new HighPassFirstOrder(hpfCutoffHz, dt),
    ];
    this.lpfs = [
      new LowPassFirstOrder(lpfCutoffHz, dt),
      new LowPassFirstOrder(lpfCutoffHz, dt),
      new LowPassFirstOrder(lpfCutoffHz, dt),
    ];
    this.velLpfs = [
      new LowPassFirstOrder(velLpfCutoffHz, dt),
      new LowPassFirstOrder(velLpfCutoffHz, dt),
      new LowPassFirstOrder(velLpfCutoffHz, dt),
    ];
    this.zuptDetector = new ZUPTDetector({
      acc_thresh: this.config.zuptAccelThreshold,
      gyro_thresh: this.config.zuptGyroThreshold,
      min_time: this.config.zuptMinTime,
      dt: this.config.dt,
    });
    this.bias = [0, 0, 0];
  }

  updateConfig(patch: Partial<AccelerationConfig>): void {
    this.config = { ...this.config, ...patch };

    this.zuptDetector.updateConfig({
      acc_thresh: this.config.zuptAccelThreshold,
      gyro_thresh: this.config.zuptGyroThreshold,
      min_time: this.config.zuptMinTime,
      dt: this.config.dt,
    });

    if (patch.lpfCutoffHz !== undefined || patch.dt !== undefined) {
      this.lpfs = [
        new LowPassFirstOrder(this.config.lpfCutoffHz, this.config.dt),
        new LowPassFirstOrder(this.config.lpfCutoffHz, this.config.dt),
        new LowPassFirstOrder(this.config.lpfCutoffHz, this.config.dt),
      ];
    }
    if (patch.velLpfCutoffHz !== undefined || patch.dt !== undefined) {
      this.velLpfs = [
        new LowPassFirstOrder(this.config.velLpfCutoffHz, this.config.dt),
        new LowPassFirstOrder(this.config.velLpfCutoffHz, this.config.dt),
        new LowPassFirstOrder(this.config.velLpfCutoffHz, this.config.dt),
      ];
    }
  }

  private _rotateSample(i: number): AxisTuple {
    const ch = this.channels;
    const rawX = ch[CHANNELS.ACCEL_X]![i]!;
    const rawY = ch[CHANNELS.ACCEL_Y]![i]!;
    const rawZ = ch[CHANNELS.ACCEL_Z]![i]!;

    if (!this.config.applyRotation) {
      return [rawX, rawY, rawZ];
    }

    const rotA = ch[CHANNELS.ROTATION_A]![i]!;
    const rotB = ch[CHANNELS.ROTATION_B]![i]!;
    const rotG = ch[CHANNELS.ROTATION_G]![i]!;
    return rotateVector(fromW3CAngles(rotA, rotB, rotG), [rawX, rawY, rawZ]);
  }

  private _detectZUPT(i: number): boolean {
    const ch = this.channels;
    const rawX = ch[CHANNELS.ACCEL_X]![i]!;
    const rawY = ch[CHANNELS.ACCEL_Y]![i]!;
    const rawZ = ch[CHANNELS.ACCEL_Z]![i]!;
    const gyrX = ch[CHANNELS.GYRO_X]![i]!;
    const gyrY = ch[CHANNELS.GYRO_Y]![i]!;
    const gyrZ = ch[CHANNELS.GYRO_Z]![i]!;

    const accelMag = vectorMagnitude(rawX, rawY, rawZ);
    const gyroMag = vectorMagnitude(gyrX, gyrY, gyrZ);
    ch[CHANNELS.ACCEL_MAGNITUDE]!.push(accelMag);
    ch[CHANNELS.GYRO_MAGNITUDE]!.push(gyroMag);

    const zuptStatus = this.zuptDetector.addSample(accelMag, gyroMag);
    ch[CHANNELS.ZUPT_STATUS]!.push(zuptStatus);
    return (zuptStatus & ZUPTStatus.ZUPT_ACTIVE) !== 0;
  }

  private _updateBiasIfRest(isRest: boolean, smoothed: AxisTuple): void {
    if (!isRest) return;

    const a = this.config.zuptBiasAlphaActive;
    const decay = 1 - a;
    this.bias[X] = decay * this.bias[X] + a * smoothed[X];
    this.bias[Y] = decay * this.bias[Y] + a * smoothed[Y];
    this.bias[Z] = decay * this.bias[Z] + a * smoothed[Z];
  }

  private _emitOutput(rotated: AxisTuple, smoothed: AxisTuple): void {
    const ch = this.channels;
    const [rotX, rotY, rotZ] = rotated;
    const bX = this.config.removeBias ? this.bias[X] : 0;
    const bY = this.config.removeBias ? this.bias[Y] : 0;
    const bZ = this.config.removeBias ? this.bias[Z] : 0;

    ch[CHANNELS.ACCEL_X_BIAS]!.push(this.bias[X]);
    ch[CHANNELS.ACCEL_Y_BIAS]!.push(this.bias[Y]);
    ch[CHANNELS.ACCEL_Z_BIAS]!.push(this.bias[Z]);

    const outX = rotX - bX;
    const outY = rotY - bY;
    const outZ = rotZ - bZ;
    ch[CHANNELS.ACCEL_X_OUTPUT]!.push(outX);
    ch[CHANNELS.ACCEL_Y_OUTPUT]!.push(outY);
    ch[CHANNELS.ACCEL_Z_OUTPUT]!.push(outZ);
    ch[CHANNELS.ACCEL_MAGNITUDE_OUTPUT]!.push(
      vectorMagnitude(outX, outY, outZ)
    );

    const fX = this.hpfs[X].add(smoothed[X] - bX);
    const fY = this.hpfs[Y].add(smoothed[Y] - bY);
    const fZ = this.hpfs[Z].add(smoothed[Z] - bZ);
    ch[CHANNELS.ACCEL_X_OUTPUT_FILTERED]!.push(fX);
    ch[CHANNELS.ACCEL_Y_OUTPUT_FILTERED]!.push(fY);
    ch[CHANNELS.ACCEL_Z_OUTPUT_FILTERED]!.push(fZ);
    ch[CHANNELS.ACCEL_MAGNITUDE_OUTPUT_FILTERED]!.push(
      vectorMagnitude(fX, fY, fZ)
    );

    const lpX = this.lpfs[X].add(outX);
    const lpY = this.lpfs[Y].add(outY);
    const lpZ = this.lpfs[Z].add(outZ);
    ch[CHANNELS.ACCEL_X_LP]!.push(lpX);
    ch[CHANNELS.ACCEL_Y_LP]!.push(lpY);
    ch[CHANNELS.ACCEL_Z_LP]!.push(lpZ);
    ch[CHANNELS.ACCEL_MAGNITUDE_LP]!.push(vectorMagnitude(lpX, lpY, lpZ));

    const vlpX = this.velLpfs[X].add(outX);
    const vlpY = this.velLpfs[Y].add(outY);
    const vlpZ = this.velLpfs[Z].add(outZ);
    ch[CHANNELS.ACCEL_X_VEL_LP]!.push(vlpX);
    ch[CHANNELS.ACCEL_Y_VEL_LP]!.push(vlpY);
    ch[CHANNELS.ACCEL_Z_VEL_LP]!.push(vlpZ);
    ch[CHANNELS.ACCEL_MAGNITUDE_VEL_LP]!.push(
      vectorMagnitude(vlpX, vlpY, vlpZ)
    );
  }

  calculate(data: ProcessedSensorData): void {
    this.ensureChannels(data);
    this.computeSampleCountFor([
      CHANNELS.ACCEL_X,
      CHANNELS.ACCEL_Y,
      CHANNELS.ACCEL_Z,
      CHANNELS.GYRO_X,
      CHANNELS.GYRO_Y,
      CHANNELS.GYRO_Z,
    ]);

    const ch = this.channels;

    for (let i = 0; i < this.sampleCount; i++) {
      const rotated = this._rotateSample(i);
      ch[CHANNELS.ACCEL_X_ROTATED]!.push(rotated[X]);
      ch[CHANNELS.ACCEL_Y_ROTATED]!.push(rotated[Y]);
      ch[CHANNELS.ACCEL_Z_ROTATED]!.push(rotated[Z]);

      const smoothed: AxisTuple = [
        this.smoothers[X].add(rotated[X]),
        this.smoothers[Y].add(rotated[Y]),
        this.smoothers[Z].add(rotated[Z]),
      ];

      const isRest = this._detectZUPT(i);
      this._updateBiasIfRest(isRest, smoothed);
      this._emitOutput(rotated, smoothed);
    }
  }
}
