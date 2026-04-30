import {
  computePeakPowerAndLoad,
  getMostRecentPplTestSprintIds,
  selectAthleteEntries,
} from '@/features/power-profile/services/chart-point-selection-service';
import type { PowerProfileSession } from '@/features/power-profile/types/power-session';
import type { WorkoutEntry } from '@/types/workout-database';

function makeSession(
  overrides: Partial<PowerProfileSession> = {}
): PowerProfileSession {
  return {
    sessionId: 's1',
    athleteId: 'a1',
    sprintIds: ['w1', 'w2'],
    startedAt: 100,
    completedAt: 200,
    deletedAt: null,
    testStatus: 'complete',
    testMode: 'discovery',
    targetZone: null,
    loadSuggestionsEnabled: true,
    sessionPeakPower: null,
    sessionPeakVelocity: null,
    sessionPeakPowerLoad: null,
    sessionPPLEstimate: null,
    ...overrides,
  };
}

test('returns sprintIds for most recent test session', () => {
  const sessions: PowerProfileSession[] = [
    makeSession({ sessionId: 'old', startedAt: 10, sprintIds: ['w_old'] }),
    makeSession({ sessionId: 'new', startedAt: 20, sprintIds: ['w_new'] }),
  ];

  expect(getMostRecentPplTestSprintIds({ athleteId: 'a1', sessions })).toEqual([
    'w_new',
  ]);
});

test('ignores deleted sessions', () => {
  const sessions: PowerProfileSession[] = [
    makeSession({ sessionId: 'deleted', startedAt: 30, deletedAt: 999 }),
    makeSession({ sessionId: 'ok', startedAt: 20, sprintIds: ['w_ok'] }),
  ];

  expect(getMostRecentPplTestSprintIds({ athleteId: 'a1', sessions })).toEqual([
    'w_ok',
  ]);
});

test('returns null when no test sessions exist', () => {
  const sessions: PowerProfileSession[] = [
    makeSession({
      sessionId: 'training',
      testStatus: 'not_a_test',
      testMode: null,
    }),
  ];

  expect(
    getMostRecentPplTestSprintIds({ athleteId: 'a1', sessions })
  ).toBeNull();
});

function makeWorkout(
  id: string,
  params: { athleteId: string; powerW: number; loadKg: number; dateMs: number }
): WorkoutEntry {
  return {
    id,
    name: id,
    date: new Date(params.dateMs),
    deletedAt: null,
    metrics: {
      athleteId: params.athleteId,
      peakPower: params.powerW,
      loadKg: params.loadKg,
      peakVelocity: null,
    },
  } as unknown as WorkoutEntry;
}

test('selectAthleteEntries returns all time entries when selected', () => {
  const entries = [
    makeWorkout('w1', { athleteId: 'a1', powerW: 100, loadKg: 10, dateMs: 10 }),
    makeWorkout('w2', { athleteId: 'a1', powerW: 200, loadKg: 20, dateMs: 20 }),
  ];
  const sessions: PowerProfileSession[] = [];

  expect(
    selectAthleteEntries({
      athleteId: 'a1',
      selection: 'all_time',
      sessions,
      entries,
      nowMs: 1000,
    }).map((e) => e.id)
  ).toEqual(['w1', 'w2']);
});

test('computePeakPowerAndLoad returns max power and its load', () => {
  const entries = [
    makeWorkout('w1', { athleteId: 'a1', powerW: 100, loadKg: 10, dateMs: 10 }),
    makeWorkout('w2', { athleteId: 'a1', powerW: 300, loadKg: 25, dateMs: 20 }),
    makeWorkout('w3', { athleteId: 'a1', powerW: 200, loadKg: 20, dateMs: 30 }),
  ];

  expect(computePeakPowerAndLoad(entries)).toEqual({
    peakPowerW: 300,
    loadKg: 25,
  });
});
