import { VelocityCalculationService } from '@/features/workout/services/velocity-calculation-service';
import { CHANNELS } from '@/types/channel-names';
import { ProcessedSensorData } from '@/types/processed-sensor-data';

jest.mock('@/services/logger', () => ({
  logVelocityFSM: jest.fn(),
}));

function makeData(args: {
  timestamps: number[];
  rawX: number[];
  rawY?: number[];
  rawZ?: number[];
  hpX?: number[];
  hpY?: number[];
  hpZ?: number[];
  lpX?: number[];
  lpY?: number[];
  lpZ?: number[];
  zuptStatus?: number[];
}): ProcessedSensorData {
  const sampleCount = args.timestamps.length;
  const zeros = () => new Array<number>(sampleCount).fill(0);

  const data = new ProcessedSensorData();
  data.channels[CHANNELS.TIMESTAMP] = args.timestamps.slice();
  data.channels[CHANNELS.ZUPT_STATUS] = (args.zuptStatus ?? zeros()).slice();
  data.channels[CHANNELS.ACCEL_X_OUTPUT] = args.rawX.slice();
  data.channels[CHANNELS.ACCEL_Y_OUTPUT] = (args.rawY ?? zeros()).slice();
  data.channels[CHANNELS.ACCEL_Z_OUTPUT] = (args.rawZ ?? zeros()).slice();
  data.channels[CHANNELS.ACCEL_X_OUTPUT_FILTERED] = (
    args.hpX ?? zeros()
  ).slice();
  data.channels[CHANNELS.ACCEL_Y_OUTPUT_FILTERED] = (
    args.hpY ?? zeros()
  ).slice();
  data.channels[CHANNELS.ACCEL_Z_OUTPUT_FILTERED] = (
    args.hpZ ?? zeros()
  ).slice();
  data.channels[CHANNELS.ACCEL_X_LP] = (args.lpX ?? zeros()).slice();
  data.channels[CHANNELS.ACCEL_Y_LP] = (args.lpY ?? zeros()).slice();
  data.channels[CHANNELS.ACCEL_Z_LP] = (args.lpZ ?? zeros()).slice();
  return data;
}

describe('VelocityCalculationService', () => {
  it('defaults integrationAccelSource to vel_lp', () => {
    const service = new VelocityCalculationService();

    expect(
      (service as unknown as { config: { integrationAccelSource: string } })
        .config.integrationAccelSource
    ).toBe('vel_lp');
  });

  it('integrates from low-pass acceleration channels when integrationAccelSource is lp', () => {
    const data = makeData({
      timestamps: [1000, 2000],
      rawX: [10, 10],
      hpX: [100, 100],
      lpX: [1, 1],
    });
    const service = new VelocityCalculationService({
      integrationAccelSource: 'lp',
      dt: 1,
      velLeak: 1,
    });

    service.calculate(data);

    expect(data.getChannelData(CHANNELS.VELOCITY_X)).toEqual([1, 2]);
  });

  it('integrates from raw output acceleration channels when integrationAccelSource is raw', () => {
    const data = makeData({
      timestamps: [1000, 2000],
      rawX: [10, 10],
      hpX: [100, 100],
      lpX: [1, 1],
    });
    const service = new VelocityCalculationService({
      integrationAccelSource: 'raw',
      dt: 1,
      velLeak: 1,
    });

    service.calculate(data);

    expect(data.getChannelData(CHANNELS.VELOCITY_X)).toEqual([10, 20]);
  });
});
