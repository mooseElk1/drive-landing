import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { AthleteProfile } from '../types/athlete-profile';
import { mmkvStorage } from './mmkv-storage';

type AthleteProfileState = {
  athletes: AthleteProfile[];
  activeAthleteId: string | null;

  setActiveAthleteId: (athleteId: string | null) => void;

  upsertAthlete: (athlete: AthleteProfile) => void;
  deleteAthlete: (athleteId: string) => void;

  getAthleteById: (athleteId: string) => AthleteProfile | null;

  updateHistoricalPeak: (
    athleteId: string,
    peakPower: number,
    loadKg: number
  ) => void;
};

export const useAthleteProfileStore = create<AthleteProfileState>()(
  persist(
    (set, get) => ({
      athletes: [],
      activeAthleteId: null,

      setActiveAthleteId: (athleteId) => set({ activeAthleteId: athleteId }),

      upsertAthlete: (athlete) =>
        set((state) => {
          const idx = state.athletes.findIndex((a) => a.id === athlete.id);
          if (idx === -1) return { athletes: [athlete, ...state.athletes] };
          const next = [...state.athletes];
          next[idx] = athlete;
          return { athletes: next };
        }),

      deleteAthlete: (athleteId) =>
        set((state) => {
          const athletes = state.athletes.filter((a) => a.id !== athleteId);
          const activeAthleteId =
            state.activeAthleteId === athleteId ? null : state.activeAthleteId;
          return { athletes, activeAthleteId };
        }),

      getAthleteById: (athleteId) =>
        get().athletes.find((a) => a.id === athleteId) ?? null,

      updateHistoricalPeak: (athleteId, peakPower, loadKg) =>
        set((state) => {
          const idx = state.athletes.findIndex((a) => a.id === athleteId);
          if (idx === -1) return state;
          const athlete = state.athletes[idx]!;
          if (
            athlete.historicalPeakPower !== null &&
            peakPower <= athlete.historicalPeakPower
          ) {
            return state;
          }
          const updated: AthleteProfile = {
            ...athlete,
            historicalPeakPower: peakPower,
            historicalPeakPowerLoad: loadKg,
            updatedAt: Date.now(),
          };
          const next = [...state.athletes];
          next[idx] = updated;
          return { athletes: next };
        }),
    }),
    {
      name: 'power-profile/athlete-profile-store',
      storage: mmkvStorage,
    }
  )
);
