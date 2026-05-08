import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

import { Constants } from '@/constants';
import { storage } from '@/lib/storage';
import {
  type AccelerationConfig,
  type CalculationServiceConfig,
} from '@/types/calculation-configs';

// ---------------------------------------------------------------------------
// MMKV storage adapter for Zustand persist middleware
// ---------------------------------------------------------------------------
const mmkvStorage = createJSONStorage(() => ({
  getItem: (name: string) => storage.getString(name) ?? null,
  setItem: (name: string, value: string) => storage.set(name, value),
  removeItem: (name: string) => storage.delete(name),
}));

// ---------------------------------------------------------------------------
// Default config — mirrors Constants so there is one source of truth
// ---------------------------------------------------------------------------
export const DEFAULT_CALCULATION_CONFIG: CalculationServiceConfig = {
  mass: Constants.Sled.defaultMassKg,
  acceleration: {
    applyRotation: Constants.AccelerationProcessor.applyRotation,
    removeBias: Constants.AccelerationProcessor.removeBias,
    smoothWindowSize: Constants.AccelerationProcessor.smoothWindowSize,
    hpfCutoffHz: Constants.AccelerationProcessor.hpfCutoffHz,
    lpfCutoffHz: Constants.AccelerationProcessor.lpfCutoffHz,
    velLpfCutoffHz: Constants.AccelerationProcessor.velLpfCutoffHz,
    dt: Constants.Foo.dt,
    zuptAccelThreshold: Constants.ZuptDetector.zuptAccelThreshold,
    zuptGyroThreshold: Constants.ZuptDetector.zuptGyroThreshold,
    zuptMinTime: Constants.ZuptDetector.zuptMinTime,
    zuptBiasAlphaActive: Constants.AccelerationProcessor.zuptBiasAlphaActive,
  },
  velocity: {
    velLeak: Constants.VelocityIntegrator.velLeak,
    dt: Constants.Foo.dt,
    integrationAccelSource: 'vel_lp' as const,
    velFloorActivationThreshold:
      Constants.VelocityIntegrator.velFloorActivationThreshold,
    velFloorDirectionThreshold:
      Constants.VelocityIntegrator.velFloorDirectionThreshold,
    velFloorMinSamples: Constants.VelocityIntegrator.velFloorMinSamples,
  },
};

function mergePersistedConfig(
  persisted: unknown,
  current: CalculationConfigState
): CalculationConfigState {
  if (!persisted || typeof persisted !== 'object' || !('config' in persisted)) {
    return current;
  }
  const stored = (persisted as { config?: Partial<CalculationServiceConfig> })
    .config;
  if (!stored || typeof stored !== 'object') {
    return current;
  }
  return {
    ...current,
    config: {
      ...DEFAULT_CALCULATION_CONFIG,
      ...stored,
      acceleration: {
        ...DEFAULT_CALCULATION_CONFIG.acceleration,
        ...stored.acceleration,
      },
      velocity: {
        ...DEFAULT_CALCULATION_CONFIG.velocity,
        ...stored.velocity,
      },
    },
  };
}

// ---------------------------------------------------------------------------
// Store shape
// ---------------------------------------------------------------------------
interface CalculationConfigState {
  config: CalculationServiceConfig;
  /** Replace the whole config object. */
  setConfig: (config: CalculationServiceConfig) => void;
  /** Partially update top-level fields. */
  updateConfig: (patch: Partial<CalculationServiceConfig>) => void;
  /** Partially update acceleration sub-config fields. */
  updateAccelerationConfig: (patch: Partial<AccelerationConfig>) => void;
  /** Partially update velocity sub-config fields. */
  updateVelocityConfig: (
    patch: Partial<CalculationServiceConfig['velocity']>
  ) => void;
  /** Reset everything back to defaults. */
  resetConfig: () => void;
}

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------
export const useCalculationConfigStore = create<CalculationConfigState>()(
  persist(
    (set) => ({
      config: DEFAULT_CALCULATION_CONFIG,

      setConfig: (config) => set({ config }),

      updateConfig: (patch) =>
        set((state) => ({ config: { ...state.config, ...patch } })),

      updateAccelerationConfig: (patch) =>
        set((state) => ({
          config: {
            ...state.config,
            acceleration: { ...state.config.acceleration, ...patch },
          },
        })),

      updateVelocityConfig: (patch) =>
        set((state) => ({
          config: {
            ...state.config,
            velocity: { ...state.config.velocity, ...patch },
          },
        })),

      resetConfig: () => set({ config: DEFAULT_CALCULATION_CONFIG }),
    }),
    {
      name: 'calculation-config',
      storage: mmkvStorage,
      merge: mergePersistedConfig,
    }
  )
);
