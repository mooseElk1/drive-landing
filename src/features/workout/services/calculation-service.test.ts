// Mock the logger module to prevent file-system access during tests.
// The logger instantiates a BufferedLogger with a file sink on import, which
// fails in the Jest/Node environment (no Expo FileSystem / Paths.document).
import { type DeviceMotionMeasurement } from 'expo-sensors';

import { Constants } from '@/constants';
import { CalculationService } from '@/features/workout/services/calculation-service';
import { PowerCalculationService } from '@/features/workout/services/power-calculation-service';
import { CHANNELS } from '@/types/channel-names';
import { type ISensorsService } from '@/types/sensors-service';

jest.mock('@/services/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  logVelocityFSM: jest.fn(),
}));

/** Minimal stub that lets tests push sensor frames manually. */
function makeMockSensorService(): ISensorsService & {
  emit: (data: DeviceMotionMeasurement) => void;
} {
  let _cb: ((data: DeviceMotionMeasurement) => void) | undefined;
  return {
    setUpdateInterval: () => {},
    start: () => {},
    stop: () => {},
    subscribe: (cb) => {
      _cb = cb;
    },
    emit: (data) => _cb?.(data),
  };
}

/** Minimal DeviceMotionMeasurement with zeroed accelerations and rotations. */
function makeMeasurement(
  overrides: Partial<DeviceMotionMeasurement> = {}
): DeviceMotionMeasurement {
  return {
    acceleration: { x: 0, y: 0, z: 0, timestamp: 1000 },
    accelerationIncludingGravity: { x: 0, y: 0, z: 0, timestamp: 1000 },
    rotationRate: { alpha: 0, beta: 0, gamma: 0, timestamp: 1000 },
    orientation: 0,
    interval: 10,
    rotation: { alpha: 0, beta: 0, gamma: 0, timestamp: 1000 },
    ...overrides,
  };
}

describe('CalculationService', () => {
  describe('constructor defaults', () => {
    it('uses Constants.Sled.defaultMassKg as initial mass', () => {
      const sensor = makeMockSensorService();
      const svc = new CalculationService(sensor);
      expect(svc.getSledMass()).toBe(Constants.Sled.defaultMassKg);
    });
  });

  describe('updateConfig / setSledMass', () => {
    it('updateConfig propagates mass to PowerCalculationService', () => {
      const sensor = makeMockSensorService();
      const powerService = new PowerCalculationService();
      const svc = new CalculationService(sensor, undefined, powerService);

      svc.updateConfig({ mass: 85 });

      expect(svc.getSledMass()).toBe(85);
      expect(powerService.getMass()).toBe(85);
    });

    it('setSledMass is a convenience alias for updateConfig', () => {
      const sensor = makeMockSensorService();
      const powerService = new PowerCalculationService();
      const svc = new CalculationService(sensor, undefined, powerService);

      svc.setSledMass(60);

      expect(svc.getSledMass()).toBe(60);
      expect(powerService.getMass()).toBe(60);
    });

    it('updateConfig without mass field leaves mass unchanged', () => {
      const sensor = makeMockSensorService();
      const svc = new CalculationService(sensor);
      const initialMass = svc.getSledMass();

      svc.updateConfig({});

      expect(svc.getSledMass()).toBe(initialMass);
    });
  });

  describe('pipeline + subscribe', () => {
    it('invokes callback with processed data on each sensor frame', () => {
      const sensor = makeMockSensorService();
      const svc = new CalculationService(sensor);
      const callback = jest.fn();
      svc.subscribe(callback);

      sensor.emit(makeMeasurement());

      expect(callback).toHaveBeenCalledTimes(1);
      const result = callback.mock.calls[0][0];
      expect(result).toBeDefined();
    });

    it('output data contains velocity magnitude channel after processing', () => {
      const sensor = makeMockSensorService();
      const svc = new CalculationService(sensor);
      const callback = jest.fn();
      svc.subscribe(callback);

      sensor.emit(
        makeMeasurement({ acceleration: { x: 1, y: 0, z: 0, timestamp: 1000 } })
      );

      const data = callback.mock.calls[0][0];
      const velMag = data.getChannelData(CHANNELS.VELOCITY_MAGNITUDE);
      expect(velMag).toBeDefined();
      expect(velMag.length).toBeGreaterThan(0);
    });

    it('accepts injected pipeline (OCP — custom stage runs before power)', () => {
      const sensor = makeMockSensorService();
      const customStage = { calculate: jest.fn() };
      const svc = new CalculationService(sensor, [customStage]);
      svc.subscribe(() => {});

      sensor.emit(makeMeasurement());

      expect(customStage.calculate).toHaveBeenCalledTimes(1);
    });
  });
});
