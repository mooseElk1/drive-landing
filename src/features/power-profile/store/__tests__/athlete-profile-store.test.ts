import { useAthleteProfileStore } from '@/features/power-profile/store/athlete-profile-store';
import type { AthleteProfile } from '@/features/power-profile/types/athlete-profile';

function resetStore() {
  useAthleteProfileStore.setState({ athletes: [], activeAthleteId: null });
}

function makeAthlete(overrides?: Partial<AthleteProfile>): AthleteProfile {
  const now = Date.now();
  return {
    id: 'athlete_1',
    name: 'Test',
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
  resetStore();
});

test('commitPPLRevision sets currentPPL and appends pplHistory', () => {
  const athlete = makeAthlete();
  useAthleteProfileStore.getState().upsertAthlete(athlete);

  const revision = {
    pplLoadKg: 72,
    peakPowerW: 1200,
    powerMeasurementMode: 'raw' as const,
    pplAsPctBW: 87.8,
    ambiguousPeak: false,
    timestamp: 555,
  };

  useAthleteProfileStore.getState().commitPPLRevision(athlete.id, revision);

  const updated = useAthleteProfileStore.getState().getAthleteById(athlete.id)!;
  expect(updated.currentPPL).toEqual(revision);
  expect(updated.pplHistory).toEqual([revision]);
  expect(updated.updatedAt).toBeGreaterThanOrEqual(athlete.updatedAt);
});

test('commitPPLRevision no-ops for unknown athlete id', () => {
  useAthleteProfileStore.getState().upsertAthlete(makeAthlete());

  useAthleteProfileStore.getState().commitPPLRevision('missing', {
    pplLoadKg: 70,
    peakPowerW: 1000,
    powerMeasurementMode: 'raw',
    pplAsPctBW: null,
    ambiguousPeak: false,
    timestamp: 1,
  });

  const a = useAthleteProfileStore.getState().getAthleteById('athlete_1')!;
  expect(a.currentPPL).toBeNull();
  expect(a.pplHistory).toEqual([]);
});
