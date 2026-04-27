import {
  classifyLoad,
  computeZonePrescription,
} from '@/features/power-profile/services/zone-calculator-service';
import { TrainingZone } from '@/features/power-profile/types/training-zones';

test('computeZonePrescription derives bands from PPL', () => {
  const zones = computeZonePrescription(100);

  expect(zones[TrainingZone.SPEED_STRENGTH]).toEqual({
    minLoadKg: 0,
    maxLoadKg: 60,
  });
  expect(zones[TrainingZone.PEAK_POWER]).toEqual({
    minLoadKg: 80,
    maxLoadKg: 120,
  });
  expect(zones[TrainingZone.STRENGTH_SPEED]).toEqual({
    minLoadKg: 140,
    maxLoadKg: 180,
  });
  expect(zones[TrainingZone.OVERLOAD]).toEqual({
    minLoadKg: 200,
    maxLoadKg: Infinity,
  });
});

test('classifyLoad matches defined zone ranges', () => {
  const ppl = 100;
  expect(classifyLoad(59.9, ppl)).toBe(TrainingZone.SPEED_STRENGTH);
  expect(classifyLoad(80, ppl)).toBe(TrainingZone.PEAK_POWER);
  expect(classifyLoad(120, ppl)).toBe(TrainingZone.PEAK_POWER);
  expect(classifyLoad(140, ppl)).toBe(TrainingZone.STRENGTH_SPEED);
  expect(classifyLoad(180, ppl)).toBe(TrainingZone.STRENGTH_SPEED);
  expect(classifyLoad(201, ppl)).toBe(TrainingZone.OVERLOAD);
});

test('classifyLoad bridges gaps consistently', () => {
  const ppl = 100;
  expect(classifyLoad(70, ppl)).toBe(TrainingZone.SPEED_STRENGTH); // 0.6–0.8 gap
  expect(classifyLoad(130, ppl)).toBe(TrainingZone.PEAK_POWER); // 1.2–1.4 gap
  expect(classifyLoad(190, ppl)).toBe(TrainingZone.STRENGTH_SPEED); // 1.8–2.0 gap
});
