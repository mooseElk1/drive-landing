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

  historicalPBBeatenThisSession: boolean;

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

  setInterruptedAt: (ts: number | null) => void;

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

      historicalPBBeatenThisSession: false,

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
          historicalPBBeatenThisSession: false,
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
          };
        }),

      setInterruptedAt: (ts) => set({ interruptedAt: ts }),

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
          historicalPBBeatenThisSession: false,
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
