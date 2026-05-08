import { create } from 'zustand';
import { persist } from 'zustand/middleware';

import type { PowerProfileSessionMode } from '../types/power-session';
import type { TrainingZone } from '../types/training-zones';
import { mmkvStorage } from './mmkv-storage';

type PowerSessionState = {
  sessionId: string | null;
  athleteId: string | null;

  startedAt: number | null;
  sessionMode: PowerProfileSessionMode;
  targetZone: TrainingZone | null;
  loadSuggestionsEnabled: boolean;

  sprintIds: string[];

  sessionPeakPower: number | null;
  sessionPeakVelocity: number | null;
  sessionPeakPowerLoad: number | null;

  lastSprintPowerW: number | null;
  secondLastSprintPowerW: number | null;
  lastSprintLoadKg: number | null;
  secondLastSprintLoadKg: number | null;

  historicalPBBeatenThisSession: boolean;
  newHistoricalPeakThisSession: boolean;
  newHistoricalPeakPowerW: number | null;
  newHistoricalPeakLoadKg: number | null;

  interruptedAt: number | null;
  endedAt: number | null;

  startSession: (params: {
    sessionId: string;
    athleteId: string | null;
    sessionMode: PowerProfileSessionMode;
    targetZone: TrainingZone | null;
    loadSuggestionsEnabled: boolean;
  }) => void;

  addSprintId: (sprintId: string) => void;
  removeSprintId: (sprintId: string) => void;

  updateSessionPeaks: (
    peakPower: number,
    peakVelocity: number,
    loadKg: number
  ) => void;

  markHistoricalPeakBeaten: (params: {
    powerW: number;
    loadKg: number;
  }) => void;

  setInterruptedAt: (ts: number | null) => void;

  setTargetZone: (zone: TrainingZone | null) => void;

  endSession: (endedAt?: number) => void;

  discardSession: () => void;
};

export const usePowerSessionStore = create<PowerSessionState>()(
  persist(
    // eslint-disable-next-line max-lines-per-function
    (set) => ({
      sessionId: null,
      athleteId: null,

      startedAt: null,
      sessionMode: 'training',
      targetZone: null,
      loadSuggestionsEnabled: true,

      sprintIds: [],

      sessionPeakPower: null,
      sessionPeakVelocity: null,
      sessionPeakPowerLoad: null,

      lastSprintPowerW: null,
      secondLastSprintPowerW: null,
      lastSprintLoadKg: null,
      secondLastSprintLoadKg: null,

      historicalPBBeatenThisSession: false,
      newHistoricalPeakThisSession: false,
      newHistoricalPeakPowerW: null,
      newHistoricalPeakLoadKg: null,

      interruptedAt: null,
      endedAt: null,

      startSession: ({
        sessionId,
        athleteId,
        sessionMode,
        targetZone,
        loadSuggestionsEnabled,
      }) =>
        set({
          sessionId,
          athleteId,
          startedAt: Date.now(),
          sessionMode,
          targetZone,
          loadSuggestionsEnabled,
          sprintIds: [],
          sessionPeakPower: null,
          sessionPeakVelocity: null,
          sessionPeakPowerLoad: null,
          lastSprintPowerW: null,
          secondLastSprintPowerW: null,
          lastSprintLoadKg: null,
          secondLastSprintLoadKg: null,
          historicalPBBeatenThisSession: false,
          newHistoricalPeakThisSession: false,
          newHistoricalPeakPowerW: null,
          newHistoricalPeakLoadKg: null,
          interruptedAt: null,
          endedAt: null,
        }),

      addSprintId: (sprintId) =>
        set((state) => ({ sprintIds: [sprintId, ...state.sprintIds] })),

      removeSprintId: (sprintId) =>
        set((state) => ({
          sprintIds: state.sprintIds.filter((id) => id !== sprintId),
        })),

      updateSessionPeaks: (peakPower, peakVelocity, loadKg) =>
        set((state) => {
          const isNewPeakPower =
            state.sessionPeakPower === null ||
            peakPower > state.sessionPeakPower;
          return {
            sessionPeakPower: isNewPeakPower
              ? peakPower
              : state.sessionPeakPower,
            sessionPeakPowerLoad: isNewPeakPower
              ? loadKg
              : state.sessionPeakPowerLoad,
            sessionPeakVelocity:
              state.sessionPeakVelocity === null
                ? peakVelocity
                : Math.max(state.sessionPeakVelocity, peakVelocity),
            secondLastSprintLoadKg: state.lastSprintLoadKg,
            lastSprintLoadKg: loadKg,
            secondLastSprintPowerW: state.lastSprintPowerW,
            lastSprintPowerW: peakPower,
          };
        }),

      markHistoricalPeakBeaten: ({ powerW, loadKg }) =>
        set({
          historicalPBBeatenThisSession: true,
          newHistoricalPeakThisSession: true,
          newHistoricalPeakPowerW: powerW,
          newHistoricalPeakLoadKg: loadKg,
        }),

      setInterruptedAt: (ts) => set({ interruptedAt: ts }),

      setTargetZone: (zone) => set({ targetZone: zone }),

      endSession: (endedAt = Date.now()) =>
        set({ endedAt, interruptedAt: null }),

      discardSession: () =>
        set({
          sessionId: null,
          athleteId: null,
          startedAt: null,
          sessionMode: 'training',
          targetZone: null,
          loadSuggestionsEnabled: true,
          sprintIds: [],
          sessionPeakPower: null,
          sessionPeakVelocity: null,
          sessionPeakPowerLoad: null,
          lastSprintPowerW: null,
          secondLastSprintPowerW: null,
          lastSprintLoadKg: null,
          secondLastSprintLoadKg: null,
          historicalPBBeatenThisSession: false,
          newHistoricalPeakThisSession: false,
          newHistoricalPeakPowerW: null,
          newHistoricalPeakLoadKg: null,
          interruptedAt: null,
          endedAt: null,
        }),
    }),
    {
      name: 'power-profile/power-session-store',
      storage: mmkvStorage,
    }
  )
);
