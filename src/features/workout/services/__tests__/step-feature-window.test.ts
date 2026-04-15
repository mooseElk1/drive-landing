import { StepFeatureWindow } from '@/features/workout/services/step-feature-window';

describe('StepFeatureWindow', () => {
  it('extracts the expected LP peak metrics around the target timestamp', () => {
    const window = new StepFeatureWindow();

    window.add({ ts: 900, x: 9, y: 0, z: 9 });
    window.add({ ts: 1000, x: -1, y: 0, z: 3 });
    window.add({ ts: 1100, x: 2, y: 0, z: 2 });
    window.add({ ts: 1200, x: -0.5, y: 0, z: 4 });
    window.add({ ts: 1400, x: 7, y: 0, z: 7 });

    const features = window.computeFeatures(1100);

    expect(features.peakVerticalAccelLp).toBe(4);
    expect(features.peakBrakingAccelLp).toBe(-1);
    expect(features.peakPropulsiveAccelLp).toBe(2);
  });

  it('computes verticalImpulseProxy as the sum of z * dt over the window', () => {
    const window = new StepFeatureWindow();

    window.add({ ts: 1000, x: -1, y: 0, z: 3 });
    window.add({ ts: 1100, x: 2, y: 0, z: 2 });
    window.add({ ts: 1200, x: -0.5, y: 0, z: 4 });

    const features = window.computeFeatures(1100);

    expect(features.verticalImpulseProxy).toBeCloseTo(0.09, 6);
  });

  it('excludes samples outside the +/- 150 ms window', () => {
    const window = new StepFeatureWindow();

    window.add({ ts: 900, x: -10, y: 0, z: 10 });
    window.add({ ts: 1000, x: -1, y: 0, z: 3 });
    window.add({ ts: 1100, x: 2, y: 0, z: 2 });
    window.add({ ts: 1200, x: -0.5, y: 0, z: 4 });
    window.add({ ts: 1400, x: 10, y: 0, z: 20 });

    const features = window.computeFeatures(1100);

    expect(features.peakVerticalAccelLp).toBe(4);
    expect(features.peakBrakingAccelLp).toBe(-1);
    expect(features.peakPropulsiveAccelLp).toBe(2);
    expect(features.stepWindowMs).toBe(200);
  });
});
