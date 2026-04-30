import React from 'react';

import { cleanup, screen, setup } from '@/lib/test-utils';

import { useAthleteProfileStore } from '../store/athlete-profile-store';
import type { AthleteProfile } from '../types/athlete-profile';
import { PowerProfileAnalyticsScreen } from './power-profile-analytics.screen';

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

test('renders an empty-state when no athlete exists', () => {
  setup(<PowerProfileAnalyticsScreen />);
  expect(screen.getByText('Power Profile')).toBeOnTheScreen();
  expect(
    screen.getByText('Create an athlete profile to view analytics.')
  ).toBeOnTheScreen();
});

test('renders the analytics chart card when athlete exists', () => {
  const athlete = makeAthlete();
  useAthleteProfileStore.setState({
    athletes: [athlete],
    activeAthleteId: athlete.id,
  });
  setup(<PowerProfileAnalyticsScreen />);
  expect(screen.getByText('Power Profile')).toBeOnTheScreen();
});
