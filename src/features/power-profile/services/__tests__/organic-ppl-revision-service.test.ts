import {
  buildProvisionalPPLRevisionFromPB,
  computeLoadBracketingFromHistory,
  maybeUpgradeProvisionalPPLFromHistory,
  recomputeCurvePPLFromHistory,
} from '@/features/power-profile/services/organic-ppl-revision-service';
import type { WorkoutEntry } from '@/types/workout-database';
import { WorkoutType } from '@/types/workout-database';

jest.mock('@/features/workout/services/workout-persistence', () => ({
  getWorkoutEntries: jest.fn(),
}));

const { getWorkoutEntries } = jest.requireMock<{
  getWorkoutEntries: jest.Mock;
}>('@/features/workout/services/workout-persistence');

function makeEntry(params: {
  id: string;
  athleteId: string;
  loadKg: number;
  peakPower: number;
}): WorkoutEntry {
  const now = new Date();
  return {
    id: params.id,
    name: 'sprint',
    date: now,
    duration: 1,
    type: WorkoutType.GENERAL,
    filePath: '/tmp/x.json',
    createdAt: now,
    updatedAt: now,
    metrics: {
      athleteId: params.athleteId,
      loadKg: params.loadKg,
      peakPower: params.peakPower,
      surfaceType: 'turf',
    },
  };
}

beforeEach(() => {
  getWorkoutEntries.mockReset();
});

test('buildProvisionalPPLRevisionFromPB sets organic_pb + unbracketed', () => {
  const revision = buildProvisionalPPLRevisionFromPB({
    peakPowerW: 1234,
    loadKg: 72,
    bodyWeightKg: 80,
    surfaceType: 'turf',
    timestamp: 5,
  });

  expect(revision).toEqual({
    pplLoadKg: 72,
    peakPowerW: 1234,
    powerMeasurementMode: 'raw',
    pplAsPctBW: 90,
    ambiguousPeak: false,
    estimateSource: 'organic_pb',
    loadBracketed: false,
    timestamp: 5,
  });
});

test('computeLoadBracketingFromHistory returns bracketed when there is a load below and above', async () => {
  getWorkoutEntries.mockResolvedValue([
    makeEntry({ id: 'a', athleteId: 'ath1', loadKg: 60, peakPower: 900 }),
    makeEntry({ id: 'b', athleteId: 'ath1', loadKg: 80, peakPower: 950 }),
  ]);

  await expect(
    computeLoadBracketingFromHistory({ athleteId: 'ath1', pplLoadKg: 70 })
  ).resolves.toEqual({ hasBelow: true, hasAbove: true, bracketed: true });
});

test('recomputeCurvePPLFromHistory returns null with fewer than two qualifying points', async () => {
  getWorkoutEntries.mockResolvedValue([
    makeEntry({ id: 'a', athleteId: 'ath1', loadKg: 70, peakPower: 900 }),
  ]);

  await expect(
    recomputeCurvePPLFromHistory({ athleteId: 'ath1', bodyWeightKg: 80 })
  ).resolves.toBeNull();
});

test('maybeUpgradeProvisionalPPLFromHistory recomputes once bracketed', async () => {
  getWorkoutEntries.mockResolvedValue([
    makeEntry({ id: 'a', athleteId: 'ath1', loadKg: 60, peakPower: 900 }),
    makeEntry({ id: 'b', athleteId: 'ath1', loadKg: 70, peakPower: 1000 }),
    makeEntry({ id: 'c', athleteId: 'ath1', loadKg: 85, peakPower: 950 }),
  ]);

  const upgraded = await maybeUpgradeProvisionalPPLFromHistory({
    athleteId: 'ath1',
    current: {
      pplLoadKg: 70,
      peakPowerW: 1000,
      powerMeasurementMode: 'raw',
      pplAsPctBW: null,
      ambiguousPeak: false,
      estimateSource: 'organic_pb',
      loadBracketed: false,
      timestamp: 1,
    },
    bodyWeightKg: 80,
  });

  expect(upgraded).toMatchObject({
    estimateSource: 'discovery_curve',
    loadBracketed: true,
  });
  expect(upgraded?.pplLoadKg).toBe(70);
  expect(upgraded?.peakPowerW).toBe(1000);
});
