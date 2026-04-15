import { HeuristicGaitSpeedModel } from '@/features/workout/services/heuristic-gait-speed-model';

describe('HeuristicGaitSpeedModel', () => {
  it('predicts a bounded speed for plausible step frequencies', () => {
    const model = new HeuristicGaitSpeedModel();

    expect(model.predict(2.5)).toBeCloseTo(4.975, 6);
  });

  it('returns null for invalid or out-of-range frequencies', () => {
    const model = new HeuristicGaitSpeedModel();

    expect(model.predict(Number.NaN)).toBeNull();
    expect(model.predict(0.5)).toBeNull();
    expect(model.predict(6)).toBeNull();
  });
});
