import { AccelerationCalculationService } from '@/features/workout/services/acceleration-calculation-service';
import { CHANNELS } from '@/types/channel-names';
import { ProcessedSensorData } from '@/types/processed-sensor-data';

function makeData(args: {
  ax: number[];
  ay?: number[];
  az?: number[];
  gyroX?: number[];
  gyroY?: number[];
  gyroZ?: number[];
  rotA?: number[];
  rotB?: number[];
  rotG?: number[];
}): ProcessedSensorData {
  const sampleCount = args.ax.length;
  const zeros = () => new Array<number>(sampleCount).fill(0);

  const data = new ProcessedSensorData();
  data.channels[CHANNELS.ACCEL_X] = args.ax.slice();
  data.channels[CHANNELS.ACCEL_Y] = (args.ay ?? zeros()).slice();
  data.channels[CHANNELS.ACCEL_Z] = (args.az ?? zeros()).slice();
  data.channels[CHANNELS.GYRO_X] = (args.gyroX ?? zeros()).slice();
  data.channels[CHANNELS.GYRO_Y] = (args.gyroY ?? zeros()).slice();
  data.channels[CHANNELS.GYRO_Z] = (args.gyroZ ?? zeros()).slice();
  data.channels[CHANNELS.ROTATION_A] = (args.rotA ?? zeros()).slice();
  data.channels[CHANNELS.ROTATION_B] = (args.rotB ?? zeros()).slice();
  data.channels[CHANNELS.ROTATION_G] = (args.rotG ?? zeros()).slice();
  return data;
}

function variance(values: number[]): number {
  const mean = values.reduce((sum, value) => sum + value, 0) / values.length;
  return (
    values.reduce((sum, value) => sum + (value - mean) ** 2, 0) / values.length
  );
}

describe('AccelerationCalculationService', () => {
  it('emits all low-pass channels during calculate()', () => {
    const data = makeData({
      ax: [0.5, -0.25, 0.75, -0.5],
      ay: [0.1, -0.1, 0.2, -0.2],
      az: [0.2, 0.25, 0.15, 0.1],
    });

    const service = new AccelerationCalculationService({
      applyRotation: false,
      removeBias: false,
      smoothWindowSize: 1,
      lpfCutoffHz: 5,
    });

    service.calculate(data);

    for (const channel of [
      CHANNELS.ACCEL_X_LP,
      CHANNELS.ACCEL_Y_LP,
      CHANNELS.ACCEL_Z_LP,
      CHANNELS.ACCEL_MAGNITUDE_LP,
    ]) {
      const samples = data.getChannelData(channel);
      expect(samples).toHaveLength(4);
      expect(samples.every(Number.isFinite)).toBe(true);
    }
  });

  it('produces lower-variance LP output than the unfiltered output on noisy input', () => {
    const ax = Array.from({ length: 120 }, (_, index) =>
      index % 2 === 0 ? 1 : -1
    );
    const data = makeData({ ax });

    const service = new AccelerationCalculationService({
      applyRotation: false,
      removeBias: false,
      smoothWindowSize: 1,
      lpfCutoffHz: 3,
    });

    service.calculate(data);

    const outputVariance = variance(
      data.getChannelData(CHANNELS.ACCEL_X_OUTPUT)
    );
    const lowPassVariance = variance(data.getChannelData(CHANNELS.ACCEL_X_LP));

    expect(lowPassVariance).toBeLessThan(outputVariance);
  });

  it('converges bias faster during ZUPT with zuptBiasAlphaActive = 0.1 than 0.01', () => {
    const restDataFast = makeData({ ax: new Array(60).fill(0.2) });
    const restDataSlow = makeData({ ax: new Array(60).fill(0.2) });

    const fastService = new AccelerationCalculationService({
      applyRotation: false,
      removeBias: true,
      smoothWindowSize: 1,
      dt: 0.01,
      zuptAccelThreshold: 1,
      zuptGyroThreshold: 1,
      zuptMinTime: 0.01,
      zuptBiasAlphaActive: 0.1,
    });
    const slowService = new AccelerationCalculationService({
      applyRotation: false,
      removeBias: true,
      smoothWindowSize: 1,
      dt: 0.01,
      zuptAccelThreshold: 1,
      zuptGyroThreshold: 1,
      zuptMinTime: 0.01,
      zuptBiasAlphaActive: 0.01,
    });

    fastService.calculate(restDataFast);
    slowService.calculate(restDataSlow);

    const fastBias =
      restDataFast.getChannelData(CHANNELS.ACCEL_X_BIAS).at(-1) ?? 0;
    const slowBias =
      restDataSlow.getChannelData(CHANNELS.ACCEL_X_BIAS).at(-1) ?? 0;

    expect(fastBias).toBeGreaterThan(slowBias);
    expect(Math.abs(0.2 - fastBias)).toBeLessThan(Math.abs(0.2 - slowBias));
  });
});
