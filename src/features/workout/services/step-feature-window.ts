import { type DriveEvent } from '@/features/workout/types/sprint-analysis';

type LpSample = {
  ts: number;
  x: number;
  y: number;
  z: number;
};

export class StepFeatureWindow {
  private readonly halfWindowMs = 150;
  private readonly dtSeconds = 0.01;
  private readonly capacity: number;
  private samples: LpSample[] = [];

  constructor(capacity = 30) {
    this.capacity = capacity;
  }

  add(sample: LpSample): void {
    this.samples.push(sample);
    if (this.samples.length > this.capacity) {
      this.samples.shift();
    }
  }

  reset(): void {
    this.samples = [];
  }

  computeFeatures(peakTs: number): Partial<DriveEvent> {
    const window = this.samples.filter(
      (s) =>
        s.ts >= peakTs - this.halfWindowMs && s.ts <= peakTs + this.halfWindowMs
    );

    if (window.length === 0) {
      return {};
    }

    let peakVerticalAccelLp = -Infinity;
    let peakBrakingAccelLp = Infinity;
    let peakPropulsiveAccelLp = -Infinity;
    let verticalImpulseProxy = 0;

    for (const sample of window) {
      if (sample.z > peakVerticalAccelLp) peakVerticalAccelLp = sample.z;
      if (sample.x < peakBrakingAccelLp) peakBrakingAccelLp = sample.x;
      if (sample.x > peakPropulsiveAccelLp) peakPropulsiveAccelLp = sample.x;
      verticalImpulseProxy += sample.z * this.dtSeconds;
    }

    const stepWindowMs = window[window.length - 1]!.ts - window[0]!.ts;

    return {
      peakVerticalAccelLp,
      peakBrakingAccelLp,
      peakPropulsiveAccelLp,
      verticalImpulseProxy,
      stepWindowMs,
    };
  }
}
