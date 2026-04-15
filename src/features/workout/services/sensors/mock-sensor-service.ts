import { type DeviceMotionMeasurement } from 'expo-sensors';

import {
  type IIntervalSettings,
  type ISensorsService,
} from '@/types/sensors-service';

import sledPush from './fixtures/155lb-sled-push.json';

type SledPushFixture = typeof sledPush;

export class MockSensorsServiceFromJSON implements ISensorsService {
  private data: SledPushFixture;
  private intervalSettings: IIntervalSettings = {
    deviceMotion: 10,
  };
  private dataIndex = 0;
  private tickCount = 0;
  private startWallTime = 0;
  callback: ((data: DeviceMotionMeasurement) => void) | undefined = undefined;

  private subscription: ReturnType<typeof setInterval> | undefined;

  constructor() {
    this.data = sledPush;
  }

  setUpdateInterval(intervalSettings: IIntervalSettings): void {
    this.intervalSettings = intervalSettings;
  }

  start(): void {
    // Idempotent: clear any existing interval before starting fresh
    if (this.subscription !== undefined) {
      clearInterval(this.subscription);
      this.subscription = undefined;
    }
    this.dataIndex = 0;
    this.tickCount = 0;
    this.startWallTime = Date.now();
    if (this.callback) {
      this.subscription = this.createDataStream(this.callback);
    }
  }

  stop(): void {
    if (this.subscription !== undefined) {
      clearInterval(this.subscription);
      this.subscription = undefined;
    }
  }

  subscribe(callback: (data: DeviceMotionMeasurement) => void): void {
    this.callback = callback;
  }

  private createDataStream(
    callback: (data: DeviceMotionMeasurement) => void
  ): ReturnType<typeof setInterval> {
    return setInterval(() => {
      // Synthesise a monotonically-increasing timestamp so the chart never
      // sees time go backward when the data array loops.
      const ts =
        this.startWallTime +
        this.tickCount * this.intervalSettings.deviceMotion;

      const dataPoint = {
        acceleration: {
          x: this.data.ax[this.dataIndex],
          y: this.data.ay[this.dataIndex],
          z: this.data.az[this.dataIndex],
          timestamp: ts,
        },
        rotationRate: {
          alpha: this.data.wx[this.dataIndex],
          beta: this.data.wy[this.dataIndex],
          gamma: this.data.wz[this.dataIndex],
          timestamp: ts,
        },
        rotation: {
          alpha: this.data.Bx[this.dataIndex],
          beta: this.data.By[this.dataIndex],
          gamma: this.data.Bz[this.dataIndex],
          timestamp: ts,
        },
        interval: this.intervalSettings.deviceMotion,
      };

      this.tickCount++;
      this.dataIndex = this.tickCount % this.data.ax.length;

      callback(dataPoint as DeviceMotionMeasurement);
    }, this.intervalSettings.deviceMotion);
  }
}
