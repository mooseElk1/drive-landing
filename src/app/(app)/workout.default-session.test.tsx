import React from 'react';

import { screen, setup } from '@/lib/test-utils';

import Workout from './workout';

// Workout imports d3-driven chart components which are ESM-only in Jest.
jest.mock('@/components/configurable-chart', () => ({
  ConfigurableChart: () => null,
}));
jest.mock('@/components/live-stat-tiles', () => ({
  LiveStatTiles: () => null,
}));
jest.mock('@/components/sled-mass-tile', () => ({
  SledMassTile: () => null,
}));

// Avoid native status bar + safe-area internals in Jest.
jest.mock('@/components/ui', () => {
  const actual = jest.requireActual('@/components/ui');
  return { ...actual, FocusAwareStatusBar: () => null };
});

const mockStartSession = jest.fn();

jest.mock('@/features/power-profile/store/power-session-store', () => ({
  usePowerSessionStore: (selector: (s: unknown) => unknown) =>
    selector({
      sessionId: null,
      athleteId: null,
      startedAt: null,
      sessionMode: 'training',
      targetZone: null,
      loadSuggestionsEnabled: true,
      sprintIds: [],
      startSession: mockStartSession,
      addSprintId: jest.fn(),
      discardSession: jest.fn(),
    }),
}));

jest.mock('@/features/power-profile/store/athlete-profile-store', () => ({
  useAthleteProfileStore: (selector: (s: unknown) => unknown) =>
    selector({
      athletes: [{ id: 'athlete_1', name: 'A' }],
      activeAthleteId: 'athlete_1',
      setActiveAthleteId: jest.fn(),
      getAthleteById: jest.fn(() => null),
    }),
}));

jest.mock('@/features/workout/providers/workout-services-context', () => ({
  WorkoutServicesProvider: ({ children }: { children: React.ReactNode }) => (
    <>{children}</>
  ),
  useWorkoutServices: () => ({
    resetServices: () => ({
      sprintAnalysisService: { startSprint: jest.fn() },
    }),
    sprintAnalysisService: { stopSprint: jest.fn(), getResult: jest.fn() },
    sensorService: { start: jest.fn(), stop: jest.fn() },
    bufferService: {},
  }),
}));

jest.mock('@/lib', () => ({
  useBufferSubscription: jest.fn(),
  useWorkoutFileOperations: () => ({
    saveWorkout: jest.fn(),
    clearError: jest.fn(),
  }),
}));

jest.mock('@/providers', () => ({
  useLoggedData: () => ({ dispatch: jest.fn() }),
}));

jest.mock('@/services/logger', () => ({
  logWorkoutData: jest.fn(),
}));

jest.mock('@/store/calculation-config', () => ({
  useCalculationConfigStore: () => ({ config: { mass: 30 } }),
}));

describe('Workout default session', () => {
  it('starts a default free training session on first Start', async () => {
    const { user } = setup(<Workout />);

    await user.press(screen.getByText('Start'));

    expect(mockStartSession).toHaveBeenCalledTimes(1);
    expect(mockStartSession).toHaveBeenCalledWith(
      expect.objectContaining({
        athleteId: 'athlete_1',
        sessionMode: 'training',
        targetZone: null,
        loadSuggestionsEnabled: false,
      })
    );
  });
});
