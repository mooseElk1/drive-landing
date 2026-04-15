import { OrientationCalculationService } from '@/features/workout/services/orientation-calculation-service';
import { CHANNELS } from '@/types/channel-names';
import { ProcessedSensorData } from '@/types/processed-sensor-data';

describe('OrientationCalculationService', () => {
  let svc: OrientationCalculationService;

  beforeEach(() => {
    svc = new OrientationCalculationService();
  });

  test('identity rotation leaves accelerations unchanged', () => {
    const psd = new ProcessedSensorData();
    psd.channels[CHANNELS.ACCEL_X] = [1];
    psd.channels[CHANNELS.ACCEL_Y] = [2];
    psd.channels[CHANNELS.ACCEL_Z] = [3];
    psd.channels[CHANNELS.ROTATION_A] = [0];
    psd.channels[CHANNELS.ROTATION_B] = [0];
    psd.channels[CHANNELS.ROTATION_G] = [0];
    psd.channels[CHANNELS.ACCEL_X_ROTATED] = [];
    psd.channels[CHANNELS.ACCEL_Y_ROTATED] = [];
    psd.channels[CHANNELS.ACCEL_Z_ROTATED] = [];

    svc.calculate(psd);

    expect(psd.getChannelData(CHANNELS.ACCEL_X_ROTATED)[0]).toBeCloseTo(1);
    expect(psd.getChannelData(CHANNELS.ACCEL_Y_ROTATED)[0]).toBeCloseTo(2);
    expect(psd.getChannelData(CHANNELS.ACCEL_Z_ROTATED)[0]).toBeCloseTo(3);
  });

  test('rotation around Z by +90 degrees rotates +X to -Y', () => {
    const psd = new ProcessedSensorData();
    psd.channels[CHANNELS.ACCEL_X] = [1];
    psd.channels[CHANNELS.ACCEL_Y] = [0];
    psd.channels[CHANNELS.ACCEL_Z] = [0];
    psd.channels[CHANNELS.ROTATION_A] = [Math.PI / 2]; // alpha
    psd.channels[CHANNELS.ROTATION_B] = [0];
    psd.channels[CHANNELS.ROTATION_G] = [0];
    psd.channels[CHANNELS.ACCEL_X_ROTATED] = [];
    psd.channels[CHANNELS.ACCEL_Y_ROTATED] = [];
    psd.channels[CHANNELS.ACCEL_Z_ROTATED] = [];

    svc.calculate(psd);

    expect(psd.getChannelData(CHANNELS.ACCEL_X_ROTATED)[0]).toBeCloseTo(0, 6);
    expect(psd.getChannelData(CHANNELS.ACCEL_Y_ROTATED)[0]).toBeCloseTo(-1, 6);
    expect(psd.getChannelData(CHANNELS.ACCEL_Z_ROTATED)[0]).toBeCloseTo(0, 6);
  });

  test('rotation around X by +90 degrees rotates +Y to -Z', () => {
    const psd = new ProcessedSensorData();
    psd.channels[CHANNELS.ACCEL_X] = [0];
    psd.channels[CHANNELS.ACCEL_Y] = [1];
    psd.channels[CHANNELS.ACCEL_Z] = [0];
    psd.channels[CHANNELS.ROTATION_A] = [0];
    psd.channels[CHANNELS.ROTATION_B] = [Math.PI / 2]; // beta
    psd.channels[CHANNELS.ROTATION_G] = [0];
    psd.channels[CHANNELS.ACCEL_X_ROTATED] = [];
    psd.channels[CHANNELS.ACCEL_Y_ROTATED] = [];
    psd.channels[CHANNELS.ACCEL_Z_ROTATED] = [];

    svc.calculate(psd);

    expect(psd.getChannelData(CHANNELS.ACCEL_X_ROTATED)[0]).toBeCloseTo(0, 6);
    expect(psd.getChannelData(CHANNELS.ACCEL_Y_ROTATED)[0]).toBeCloseTo(0, 6);
    expect(psd.getChannelData(CHANNELS.ACCEL_Z_ROTATED)[0]).toBeCloseTo(-1, 6);
  });

  test('rotation around Y by +90 degrees rotates +Z to -X', () => {
    const psd = new ProcessedSensorData();
    psd.channels[CHANNELS.ACCEL_X] = [0];
    psd.channels[CHANNELS.ACCEL_Y] = [0];
    psd.channels[CHANNELS.ACCEL_Z] = [1];
    psd.channels[CHANNELS.ROTATION_A] = [0];
    psd.channels[CHANNELS.ROTATION_B] = [0];
    psd.channels[CHANNELS.ROTATION_G] = [Math.PI / 2]; // gamma
    psd.channels[CHANNELS.ACCEL_X_ROTATED] = [];
    psd.channels[CHANNELS.ACCEL_Y_ROTATED] = [];
    psd.channels[CHANNELS.ACCEL_Z_ROTATED] = [];

    svc.calculate(psd);

    expect(psd.getChannelData(CHANNELS.ACCEL_X_ROTATED)[0]).toBeCloseTo(-1, 6);
    expect(psd.getChannelData(CHANNELS.ACCEL_Y_ROTATED)[0]).toBeCloseTo(0, 6);
    expect(psd.getChannelData(CHANNELS.ACCEL_Z_ROTATED)[0]).toBeCloseTo(0, 6);
  });
});
