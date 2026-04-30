import { getMostRecentPplTestSprintIds } from '@/features/power-profile/services/chart-point-selection-service';
import type { PowerProfileSession } from '@/features/power-profile/types/power-session';

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
