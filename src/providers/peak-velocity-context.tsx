import React, { createContext, useContext, useEffect } from 'react';
import { useMMKVNumber } from 'react-native-mmkv';

import { storage } from '@/lib/storage';
import { logWorkoutData } from '@/services/logger';

interface PeakVelocityContextType {
  peakVelocity: number;
  updatePeakVelocity: (newVelocity: number) => void;
  resetPeakVelocity: () => void;
}

const PeakVelocityContext = createContext<PeakVelocityContextType | undefined>(
  undefined
);

const PEAK_VELOCITY_KEY = 'peak_velocity';

export function PeakVelocityProvider({
  children,
}: {
  children: React.ReactNode;
}) {
  const [storedPeakVelocity, setStoredPeakVelocity] = useMMKVNumber(
    PEAK_VELOCITY_KEY,
    storage
  );

  // Handle undefined case - default to 0
  const peakVelocity = storedPeakVelocity ?? 0;
  const setPeakVelocity = (value: number) => setStoredPeakVelocity(value);

  // Context initialization logging
  useEffect(() => {
    logWorkoutData('Peak velocity context initialized');
  }, []);

  // Only log meaningful changes to reduce noise
  // useEffect(() => {
  //   if (storedPeakVelocity !== undefined && storedPeakVelocity > 0) {
  //     logWorkoutData('Peak velocity context updated', {
  //       stored: storedPeakVelocity,
  //       effective: peakVelocity,
  //     });
  //   }
  // }, [storedPeakVelocity, peakVelocity]);

  const updatePeakVelocity = (newVelocity: number) => {
    if (newVelocity > peakVelocity) {
      // logWorkoutData('Peak velocity updated', {
      //   previous: peakVelocity,
      //   new: newVelocity,
      // });
      setPeakVelocity(newVelocity);
    }
  };

  const resetPeakVelocity = () => {
    logWorkoutData('Peak velocity reset to 0');
    setPeakVelocity(0);
  };

  return (
    <PeakVelocityContext.Provider
      value={{ peakVelocity, updatePeakVelocity, resetPeakVelocity }}
    >
      {children}
    </PeakVelocityContext.Provider>
  );
}

export function usePeakVelocity() {
  const context = useContext(PeakVelocityContext);
  if (context === undefined) {
    throw new Error(
      'usePeakVelocity must be used within a PeakVelocityProvider'
    );
  }
  return context;
}
