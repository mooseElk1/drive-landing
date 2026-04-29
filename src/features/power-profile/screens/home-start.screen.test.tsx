import React from 'react';

import { screen, setup } from '@/lib/test-utils';

import { HomeStartScreen } from './home-start.screen';

const mockRouter = { push: jest.fn() };

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

const mockStartSession = jest.fn();

jest.mock('../store/power-session-store', () => ({
  usePowerSessionStore: (selector: (s: unknown) => unknown) =>
    selector({
      sessionId: null,
      sprintIds: [],
      loadSuggestionsEnabled: true,
      startSession: mockStartSession,
      discardSession: jest.fn(),
    }),
}));

jest.mock('../store/athlete-profile-store', () => ({
  useAthleteProfileStore: (selector: (s: unknown) => unknown) =>
    selector({
      athletes: [
        {
          id: 'athlete_1',
          name: 'A',
          historicalPeakPower: 1000,
          historicalPeakPowerLoad: 40,
        },
      ],
      activeAthleteId: 'athlete_1',
      setActiveAthleteId: jest.fn(),
    }),
}));

describe('HomeStartScreen', () => {
  beforeEach(() => {
    mockRouter.push.mockReset();
    mockStartSession.mockReset();
  });

  it('starts a training session and routes to workout', async () => {
    const { user } = setup(<HomeStartScreen />);

    await user.press(screen.getByTestId('mode-training'));
    await user.press(screen.getByTestId('home-start-training'));

    expect(mockStartSession).toHaveBeenCalledTimes(1);
    expect(mockRouter.push).toHaveBeenCalledWith('/workout');
  });

  it('starts a test session and routes to workout', async () => {
    const { user } = setup(<HomeStartScreen />);

    await user.press(screen.getByTestId('mode-test'));
    await user.press(screen.getByTestId('home-start-test'));

    expect(mockStartSession).toHaveBeenCalledTimes(1);
    expect(mockRouter.push).toHaveBeenCalledWith('/workout');
  });
});
