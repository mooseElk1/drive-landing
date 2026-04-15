import { create } from 'zustand';

export interface DataPoint {
  timestamp: string;
  x: number;
  y: number;
  z: number;
}

interface StoreState {
  timeSeriesData: DataPoint[];
  addDataPoint: (dp: DataPoint) => void;
  clearDataPoints: () => void;
}

export const store = create<StoreState>((set) => ({
  timeSeriesData: [],
  addDataPoint: (dataPoint) =>
    set((state) => ({
      timeSeriesData: [...state.timeSeriesData, dataPoint],
    })),
  clearDataPoints: () => set({ timeSeriesData: [] }),
}));
