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

  setInterruptedAt: (ts: number | null) => void;

  endSession: (endedAt?: number) => void;

  discardSession: () => void;
};

export const usePowerSessionStore = create<PowerSessionState>()(
  persist(
    (set) => ({
      sessionId: null,
      athleteId: null,

      startedAt: null,
      sessionMode: 'training',
      targetZone: null,
      loadSuggestionsEnabled: true,

      sprintIds: [],

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
          historicalPBBeatenThisSession: false,
          interruptedAt: null,
          endedAt: null,
        }),

      addSprintId: (sprintId) =>
        set((state) => ({ sprintIds: [sprintId, ...state.sprintIds] })),

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
