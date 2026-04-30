import React from 'react';

import { cleanup, screen, setup } from '@/lib/test-utils';

import { useAthleteProfileStore } from '../store/athlete-profile-store';
import type { AthleteProfile } from '../types/athlete-profile';
import { AthleteProfileSetupScreen } from './athlete-profile-setup.screen';

const mockRouter = {
  back: jest.fn(),
  push: jest.fn(),
  replace: jest.fn(),
};

jest.mock('expo-router', () => ({
  useRouter: () => mockRouter,
}));

function resetAthleteStore() {
  useAthleteProfileStore.setState({ athletes: [], activeAthleteId: null });
}

function makeAthlete(overrides?: Partial<AthleteProfile>): AthleteProfile {
  const now = Date.now();
  return {
    id: 'athlete_1',
    name: 'Test Athlete',
    bodyWeightKg: 82,
    sex: null,
    createdAt: now,
    updatedAt: now,
    currentPPL: null,
    pplHistory: [],
    fvClassification: null,
    historyDepth: 'NEW',
    frictionActivationAcknowledged: false,
    incompleteDiscoverySessionId: null,
    historicalPeakPower: null,
    historicalPeakPowerLoad: null,
    ...overrides,
  };
}

afterEach(() => {
  cleanup();
  resetAthleteStore();
  mockRouter.back.mockReset();
  mockRouter.push.mockReset();
  mockRouter.replace.mockReset();
});

describe('AthleteProfileSetupScreen', () => {
  it('creates a profile when none exists', async () => {
    const { user } = setup(<AthleteProfileSetupScreen />);

    await user.type(screen.getByTestId('athlete-name'), 'Corey');
    await user.type(screen.getByTestId('athlete-bodyweight'), '90');

    await user.press(screen.getByTestId('create-athlete'));

    const state = useAthleteProfileStore.getState();
    expect(state.athletes).toHaveLength(1);
    expect(state.activeAthleteId).toBe(state.athletes[0]?.id);
    expect(state.athletes[0]?.name).toBe('Corey');
    expect(state.athletes[0]?.bodyWeightKg).toBe(90);
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });

  it('shows read-only profile fields when athlete exists', () => {
    useAthleteProfileStore.setState({
      athletes: [makeAthlete({ name: 'A', bodyWeightKg: 80 })],
    });

    setup(<AthleteProfileSetupScreen />);

    expect(screen.getByText('A')).toBeOnTheScreen();
    expect(screen.getByText('80')).toBeOnTheScreen();
    expect(screen.getByTestId('view-analytics-cta')).toBeOnTheScreen();
  });

  it('shows a CTA when no power profile exists and routes to workout', async () => {
    useAthleteProfileStore.setState({ athletes: [makeAthlete()] });

    const { user } = setup(<AthleteProfileSetupScreen />);

    expect(screen.getByTestId('power-profile-cta')).toBeOnTheScreen();
    await user.press(screen.getByTestId('power-profile-cta'));
    expect(mockRouter.push).toHaveBeenCalledWith('/workout');
  });
});
