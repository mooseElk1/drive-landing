import { resolveSprintPower } from '@/features/power-profile/services/power-source-service';

test('resolveSprintPower returns raw peak power mode by default', () => {
  const result = resolveSprintPower(
    { peakPower: 1234, peakVelocity: 5.6, averagePower: 900 },
    'turf'
  );

  expect(result).toEqual({
    power: 1234,
    mode: 'raw',
    frictionConfidence: 'Unknown',
    calibrationRatio: null,
    surfaceType: 'turf',
  });
});

test('resolveSprintPower throws when peakPower missing', () => {
  expect(() => resolveSprintPower({ peakVelocity: 1.2 }, 'turf')).toThrow(
    'Missing metrics.peakPower'
  );
});
