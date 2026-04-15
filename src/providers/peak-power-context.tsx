import React, { createContext, useContext, useEffect } from 'react';
import { useMMKVNumber } from 'react-native-mmkv';

import { storage } from '@/lib/storage';
import { logWorkoutData } from '@/services/logger';

interface PeakPowerContextType {
  peakPower: number;
  updatePeakPower: (newPower: number) => void;
  resetPeakPower: () => void;
}

const PeakPowerContext = createContext<PeakPowerContextType | undefined>(
  undefined
);

const PEAK_POWER_KEY = 'peak_power';

export function PeakPowerProvider({ children }: { children: React.ReactNode }) {
  const [storedPeakPower, setStoredPeakPower] = useMMKVNumber(
    PEAK_POWER_KEY,
    storage
  );

  // Handle undefined case - default to 0
  const peakPower = storedPeakPower ?? 0;
  const setPeakPower = (value: number) => setStoredPeakPower(value);

  // Context initialization logging
  useEffect(() => {
    logWorkoutData('Peak power context initialized');
  }, []);

  // Only log meaningful changes to reduce noise
  // React.useEffect(() => {
  //   if (storedPeakPower !== undefined && storedPeakPower > 0) {
  //     logWorkoutData('Peak power context updated', {
  //       stored: storedPeakPower,
  //       effective: peakPower,
  //     });
  //   }
  // }, [storedPeakPower, peakPower]);

  const updatePeakPower = (newPower: number) => {
    if (newPower > peakPower) {
      // logWorkoutData('Peak power updated', {
      //   previous: peakPower,
      //   new: newPower,
      // });
      setPeakPower(newPower);
    }
  };

  const resetPeakPower = () => {
    logWorkoutData('Peak power reset to 0');
    setPeakPower(0);
  };

  return (
    <PeakPowerContext.Provider
      value={{ peakPower, updatePeakPower, resetPeakPower }}
    >
      {children}
    </PeakPowerContext.Provider>
  );
}

export function usePeakPower() {
  const context = useContext(PeakPowerContext);
  if (context === undefined) {
    throw new Error('usePeakPower must be used within a PeakPowerProvider');
  }
  return context;
}
