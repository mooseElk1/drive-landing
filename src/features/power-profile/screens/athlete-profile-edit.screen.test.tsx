import React from 'react';

import { cleanup, screen, setup } from '@/lib/test-utils';

import { useAthleteProfileStore } from '../store/athlete-profile-store';
import type { AthleteProfile } from '../types/athlete-profile';
import { AthleteProfileEditScreen } from './athlete-profile-edit.screen';

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

describe('AthleteProfileEditScreen', () => {
  it('saves edits to name/body weight', async () => {
    useAthleteProfileStore.setState({
      athletes: [makeAthlete({ name: 'A', bodyWeightKg: 80 })],
    });

    const { user } = setup(<AthleteProfileEditScreen />);

    await user.clear(screen.getByTestId('athlete-name'));
    await user.type(screen.getByTestId('athlete-name'), 'Corey');
    await user.clear(screen.getByTestId('athlete-bodyweight'));
    await user.type(screen.getByTestId('athlete-bodyweight'), '85');

    await user.press(screen.getByTestId('save-edit'));

    const state = useAthleteProfileStore.getState();
    expect(state.athletes[0]?.name).toBe('Corey');
    expect(state.athletes[0]?.bodyWeightKg).toBe(85);
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });

  it('cancels edits without saving', async () => {
    useAthleteProfileStore.setState({
      athletes: [makeAthlete({ name: 'A', bodyWeightKg: 80 })],
    });

    const { user } = setup(<AthleteProfileEditScreen />);

    await user.clear(screen.getByTestId('athlete-bodyweight'));
    await user.type(screen.getByTestId('athlete-bodyweight'), '85');

    await user.press(screen.getByTestId('cancel-edit'));

    const state = useAthleteProfileStore.getState();
    expect(state.athletes[0]?.bodyWeightKg).toBe(80);
    expect(mockRouter.back).toHaveBeenCalledTimes(1);
  });
});
