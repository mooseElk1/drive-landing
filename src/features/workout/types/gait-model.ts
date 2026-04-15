export interface GaitSpeedModel {
  predict(stepFreqHz: number): number | null;
}
