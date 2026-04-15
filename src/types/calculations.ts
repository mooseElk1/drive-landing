import { type ProcessedSensorData } from './processed-sensor-data';

export interface ICalculations {
  calculate: (data: ProcessedSensorData) => void;
}
