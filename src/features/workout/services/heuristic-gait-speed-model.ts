import { type GaitSpeedModel } from '@/features/workout/types/gait-model';

interface HeuristicGaitSpeedModelConfig {
  interceptMs: number;
  slopeMsPerHz: number;
  minStepFreqHz: number;
  maxStepFreqHz: number;
  minSpeedMs: number;
  maxSpeedMs: number;
}

const DEFAULT_CONFIG: HeuristicGaitSpeedModelConfig = {
  interceptMs: 0.35,
  slopeMsPerHz: 1.85,
  minStepFreqHz: 0.75,
  maxStepFreqHz: 5,
  minSpeedMs: 0.5,
  maxSpeedMs: 10,
};

export class HeuristicGaitSpeedModel implements GaitSpeedModel {
  private readonly config: HeuristicGaitSpeedModelConfig;

  constructor(config?: Partial<HeuristicGaitSpeedModelConfig>) {
    this.config = { ...DEFAULT_CONFIG, ...(config ?? {}) };
  }

  predict(stepFreqHz: number): number | null {
    if (!Number.isFinite(stepFreqHz)) {
      return null;
    }

    if (
      stepFreqHz < this.config.minStepFreqHz ||
      stepFreqHz > this.config.maxStepFreqHz
    ) {
      return null;
    }

    const speedMs =
      this.config.interceptMs + this.config.slopeMsPerHz * stepFreqHz;

    return Math.min(
      this.config.maxSpeedMs,
      Math.max(this.config.minSpeedMs, speedMs)
    );
  }
}
