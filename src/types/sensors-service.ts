import { type DeviceMotionMeasurement } from 'expo-sensors';

export interface ISensorsService {
  setUpdateInterval: (interval: IIntervalSettings) => void;
  start: () => void;
  stop: () => void;
  subscribe: (callback: (data: DeviceMotionMeasurement) => void) => void;
}

export interface IIntervalSettings {
  deviceMotion: number;
}

export type SensorData = {
  x: number;
  y: number;
  z: number;
};

export type BarometerData = {
  pressure: number;
  relativeAltitude?: number;
};
