import {
  buildPPLRevisionFromDiscoveryWorkouts,
  finalizeDiscoveryPPL,
} from '@/features/power-profile/services/discovery-ppl-finalization-service';
import type { WorkoutEntry } from '@/types/workout-database';
import { WorkoutType } from '@/types/workout-database';

jest.mock('@/features/workout/services/workout-persistence', () => ({
  getWorkoutEntriesByIds: jest.fn(),
}));

const { getWorkoutEntriesByIds } = jest.requireMock<{
  getWorkoutEntriesByIds: jest.Mock;
}>('@/features/workout/services/workout-persistence');

function makeEntry(
  id: string,
  overrides?: Partial<NonNullable<WorkoutEntry['metrics']>>
): WorkoutEntry {
  const now = new Date();
  return {
    id,
    name: 'sprint',
    date: now,
    duration: 1,
    type: WorkoutType.GENERAL,
    filePath: '/tmp/x.json',
    createdAt: now,
    updatedAt: now,
    metrics: {
      loadKg: 70,
      peakPower: 1000,
      surfaceType: 'turf',
      ...overrides,
    },
  };
}

beforeEach(() => {
  getWorkoutEntriesByIds.mockReset();
});

test('buildPPLRevisionFromDiscoveryWorkouts returns null with one valid point', () => {
  expect(
    buildPPLRevisionFromDiscoveryWorkouts({
      entriesInSessionOrder: [makeEntry('a')],
      bodyWeightKg: 80,
      timestamp: 1,
    })
  ).toBeNull();
});

test('buildPPLRevisionFromDiscoveryWorkouts skips invalid metrics until enough points', () => {
  expect(
    buildPPLRevisionFromDiscoveryWorkouts({
      entriesInSessionOrder: [
        makeEntry('a', { loadKg: 0, peakPower: 100 }),
        makeEntry('b', { peakPower: undefined as unknown as number }),
        makeEntry('c', { loadKg: 50, peakPower: 900 }),
        makeEntry('d', { loadKg: 70, peakPower: 1100 }),
      ],
      bodyWeightKg: 80,
      timestamp: 99,
    })
  ).toEqual({
    pplLoadKg: 70,
    peakPowerW: 1100,
    powerMeasurementMode: 'raw',
    pplAsPctBW: 87.5,
    ambiguousPeak: false,
    timestamp: 99,
  });
});

test('finalizeDiscoveryPPL returns null when fewer than two sprint ids', async () => {
  await expect(
    finalizeDiscoveryPPL({ sprintIds: ['only'], bodyWeightKg: 80 })
  ).resolves.toBeNull();
  expect(getWorkoutEntriesByIds).not.toHaveBeenCalled();
});

test('finalizeDiscoveryPPL preserves sprint order when merging DB results', async () => {
  getWorkoutEntriesByIds.mockResolvedValue([
    makeEntry('second', { loadKg: 90, peakPower: 800 }),
    makeEntry('first', { loadKg: 50, peakPower: 900 }),
  ]);

  const revision = await finalizeDiscoveryPPL({
    sprintIds: ['first', 'second'],
    bodyWeightKg: null,
    timestamp: 1,
  });

  expect(getWorkoutEntriesByIds).toHaveBeenCalledWith(['first', 'second']);
  expect(revision).not.toBeNull();
  expect(revision!.pplLoadKg).toBe(50);
  expect(revision!.peakPowerW).toBe(900);
});
