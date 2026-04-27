import { getNextLoadSuggestion } from '@/features/power-profile/services/load-suggestion-service';
import { TrainingZone } from '@/features/power-profile/types/training-zones';

test('discovery mode: first sprint suggests increasing load', () => {
  const s = getNextLoadSuggestion({
    mode: 'discovery',
    currentLoadKg: 50,
    previousPowerW: null,
    currentPowerW: 900,
    pplLoadKg: null,
    targetZone: null,
  });

  expect(s.nextLoadKg).toBe(55);
});

test('discovery mode: ascending limb increases load', () => {
  const s = getNextLoadSuggestion({
    mode: 'discovery',
    currentLoadKg: 50,
    previousPowerW: 900,
    currentPowerW: 1000,
    pplLoadKg: null,
    targetZone: null,
  });

  expect(s.nextLoadKg).toBeGreaterThan(50);
});

test('discovery mode: descending limb steps back', () => {
  const s = getNextLoadSuggestion({
    mode: 'discovery',
    currentLoadKg: 50,
    previousPowerW: 1000,
    currentPowerW: 900,
    pplLoadKg: null,
    targetZone: null,
  });

  expect(s.nextLoadKg).toBe(45);
});

test('training mode: without PPL returns current load with nudge', () => {
  const s = getNextLoadSuggestion({
    mode: 'training',
    currentLoadKg: 60,
    previousPowerW: null,
    currentPowerW: 1000,
    pplLoadKg: null,
    targetZone: TrainingZone.PEAK_POWER,
  });

  expect(s.nextLoadKg).toBe(60);
  expect(s.rationale).toMatch(/No PPL/);
});

test('training mode: zone-scoped suggestion returns within jump limit', () => {
  const s = getNextLoadSuggestion({
    mode: 'training',
    currentLoadKg: 60,
    previousPowerW: null,
    currentPowerW: 1000,
    pplLoadKg: 100,
    targetZone: TrainingZone.STRENGTH_SPEED,
  });

  // midpoint would be 160, but we clamp to avoid huge jumps
  expect(s.zone).toBe(TrainingZone.STRENGTH_SPEED);
  expect(s.nextLoadKg).toBeLessThanOrEqual(70);
});
