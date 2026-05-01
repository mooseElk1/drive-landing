import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import type { MassUnit } from '@/lib/mass-units';
import { storage } from '@/lib/storage';

// ---------------------------------------------------------------------------
// MMKV storage adapter for Zustand persist middleware
// ---------------------------------------------------------------------------
const mmkvStorage = createJSONStorage(() => ({
  getItem: (name: string) => storage.getString(name) ?? null,
  setItem: (name: string, value: string) => storage.set(name, value),
  removeItem: (name: string) => storage.delete(name),
}));

interface UnitPreferencesState {
  massUnit: MassUnit;
  setMassUnit: (unit: MassUnit) => void;
}

export const useUnitPreferencesStore = create<UnitPreferencesState>()(
  persist(
    (set) => ({
      massUnit: 'kg',
      setMassUnit: (massUnit) => set({ massUnit }),
    }),
    {
      name: 'unit-preferences',
      storage: mmkvStorage,
    }
  )
);
