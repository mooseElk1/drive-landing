import { isDevice } from 'expo-device';
import { DeviceMotion, type DeviceMotionMeasurement } from 'expo-sensors';
import { type Subscription } from 'expo-sensors/build/DeviceSensor';

import {
  type IIntervalSettings,
  type ISensorsService,
} from '@/types/sensors-service';

import { MockSensorsServiceFromJSON } from './mock-sensor-service';

export function getSensorService(): ISensorsService {
  if (isDevice) {
    console.log('Using real sensor service (running on physical device)');
    return new SensorsService();
  } else {
    console.log('Using mock sensor service (running on simulator)');
    return new MockSensorsServiceFromJSON();
  }
}

export class SensorsService implements ISensorsService {
  private subscription: Subscription | null = null;

  callback: ((data: DeviceMotionMeasurement) => void) | undefined = undefined;

  setUpdateInterval(interval: IIntervalSettings): void {
    DeviceMotion.setUpdateInterval(interval.deviceMotion);
  }

  private startSensorUpdates() {
    if (this.callback) {
      this.subscription = DeviceMotion.addListener(this.callback);
    }
  }

  private stopSensorUpdates(): void {
    if (this.subscription) {
      this.subscription.remove();
      this.subscription = null;
    }
  }

  start(): void {
    this.startSensorUpdates();
    return;
  }

  stop(): void {
    this.stopSensorUpdates();
  }

  subscribe(callback: (data: DeviceMotionMeasurement) => void): void {
    this.callback = callback;
  }
}
