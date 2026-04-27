import { calculatePPLRevision } from '@/features/power-profile/services/ppl-calculation-service';

test('calculatePPLRevision picks max-power load as PPL (non-flat)', () => {
  const result = calculatePPLRevision({
    points: [
      { loadKg: 50, powerW: 900 },
      { loadKg: 70, powerW: 1100 },
      { loadKg: 90, powerW: 1000 },
    ],
    powerMeasurementMode: 'raw',
    bodyWeightKg: 80,
    timestamp: 123,
  });

  expect(result).toEqual({
    pplLoadKg: 70,
    peakPowerW: 1100,
    powerMeasurementMode: 'raw',
    pplAsPctBW: 87.5,
    ambiguousPeak: false,
    timestamp: 123,
  });
});

test('calculatePPLRevision marks flat curves as ambiguous and uses midpoint load', () => {
  const result = calculatePPLRevision({
    points: [
      { loadKg: 50, powerW: 1000 },
      { loadKg: 70, powerW: 1010 }, // <3% spread vs max
      { loadKg: 90, powerW: 995 },
    ],
    powerMeasurementMode: 'raw',
    bodyWeightKg: null,
    timestamp: 456,
  });

  expect(result).toEqual({
    pplLoadKg: 70,
    peakPowerW: 1010,
    powerMeasurementMode: 'raw',
    pplAsPctBW: null,
    ambiguousPeak: true,
    timestamp: 456,
  });
});

test('calculatePPLRevision requires at least 2 points', () => {
  expect(() =>
    calculatePPLRevision({
      points: [{ loadKg: 50, powerW: 900 }],
      powerMeasurementMode: 'raw',
      bodyWeightKg: null,
    })
  ).toThrow('At least 2 points are required to estimate PPL');
});
