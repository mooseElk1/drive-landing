import { act, renderHook } from '@testing-library/react-native';
import React from 'react';
import type { StoreApi, UseBoundStore } from 'zustand';

import { CalculationService } from '@/features/workout/services/calculation-service';
import { getSensorService } from '@/features/workout/services/sensors/sensors-service';
import { SprintAnalysisService } from '@/features/workout/services/sprint-analysis-service';
import { BufferService } from '@/services/buffer';

import {
  useWorkoutServices,
  WorkoutServicesProvider,
} from './workout-services-context';

// ── Mocks ─────────────────────────────────────────────────────────────────────

jest.mock('@/services/logger', () => ({
  logger: {
    debug: jest.fn(),
    info: jest.fn(),
    warn: jest.fn(),
    error: jest.fn(),
  },
  logWorkoutData: jest.fn(),
  logVelocityFSM: jest.fn(),
}));

// Mock the sensor service — it uses expo-device / expo-sensors which are
// unavailable in the Node/Jest environment.
jest.mock('@/features/workout/services/sensors/sensors-service');

// Mock CalculationService and BufferService so we can track construction and
// spy on methods without running the full signal-processing pipeline.
jest.mock('@/features/workout/services/calculation-service');
jest.mock('@/services/buffer');
jest.mock('@/features/workout/services/sprint-analysis-service');

// Replace the Zustand store with a plain in-memory store so tests have no
// dependency on MMKV (native module) or persisted state.
jest.mock('@/store/calculation-config', () => {
  const { create } = jest.requireActual<typeof import('zustand')>('zustand');
  const testStore = create<{ config: { mass: number } }>(() => ({
    config: { mass: 30 },
  }));
  return {
    useCalculationConfigStore: testStore,
    DEFAULT_CALCULATION_CONFIG: { mass: 30 },
  };
});

// ── Typed mock references ──────────────────────────────────────────────────────

const MockCalculationService = CalculationService as jest.MockedClass<
  typeof CalculationService
>;
const MockBufferService = BufferService as jest.MockedClass<
  typeof BufferService
>;
const MockSprintAnalysisService = SprintAnalysisService as jest.MockedClass<
  typeof SprintAnalysisService
>;
const mockGetSensorService = getSensorService as jest.MockedFunction<
  typeof getSensorService
>;

// Access the test store so individual tests can control config state.
const { useCalculationConfigStore: testStore } = jest.requireMock<{
  useCalculationConfigStore: UseBoundStore<
    StoreApi<{ config: { mass: number } }>
  >;
}>('@/store/calculation-config');

// ── Helpers ────────────────────────────────────────────────────────────────────

const mockSensorService = {
  start: jest.fn(),
  stop: jest.fn(),
  subscribe: jest.fn(),
  setUpdateInterval: jest.fn(),
};

function makeWrapper() {
  return ({ children }: { children: React.ReactNode }) => (
    <WorkoutServicesProvider>{children}</WorkoutServicesProvider>
  );
}

// ── Setup ──────────────────────────────────────────────────────────────────────

beforeEach(() => {
  jest.clearAllMocks();
  testStore.setState({ config: { mass: 30 } });

  mockGetSensorService.mockReturnValue(
    mockSensorService as unknown as ReturnType<typeof getSensorService>
  );

  MockCalculationService.mockImplementation(
    () => ({ updateConfig: jest.fn() }) as unknown as CalculationService
  );

  MockBufferService.mockImplementation(() => ({}) as BufferService);
  MockSprintAnalysisService.mockImplementation(
    () => ({ dispose: jest.fn() }) as unknown as SprintAnalysisService
  );
});

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('WorkoutServicesProvider', () => {
  it('provides a non-null context value with all expected fields', () => {
    const { result } = renderHook(() => useWorkoutServices(), {
      wrapper: makeWrapper(),
    });

    expect(result.current.sensorService).toBeDefined();
    expect(result.current.calculationService).toBeDefined();
    expect(result.current.bufferService).toBeDefined();
    expect(result.current.sprintAnalysisService).toBeDefined();
    expect(typeof result.current.resetServices).toBe('function');
  });

  it('throws when called outside WorkoutServicesProvider', () => {
    const consoleSpy = jest
      .spyOn(console, 'error')
      .mockImplementation(() => {});

    expect(() => {
      renderHook(() => useWorkoutServices());
    }).toThrow(
      'useWorkoutServices must be used within WorkoutServicesProvider'
    );

    consoleSpy.mockRestore();
  });

  it('resetServices creates new calculationService and bufferService but preserves sensorService', async () => {
    const { result } = renderHook(() => useWorkoutServices(), {
      wrapper: makeWrapper(),
    });

    const originalCalcService = result.current.calculationService;
    const originalBufferService = result.current.bufferService;
    const originalSprintAnalysisService = result.current.sprintAnalysisService;
    const originalSensorService = result.current.sensorService;

    await act(async () => {
      result.current.resetServices();
    });

    expect(result.current.calculationService).not.toBe(originalCalcService);
    expect(result.current.bufferService).not.toBe(originalBufferService);
    expect(result.current.sprintAnalysisService).not.toBe(
      originalSprintAnalysisService
    );
    expect(result.current.sensorService).toBe(originalSensorService);
  });

  it('resetServices applies the current store config, not a stale value', async () => {
    const { result } = renderHook(() => useWorkoutServices(), {
      wrapper: makeWrapper(),
    });

    // Change config in store after the provider has already mounted.
    act(() => {
      testStore.setState({ config: { mass: 85 } });
    });

    // Note how many CalculationService instances exist before reset.
    const instancesBefore = MockCalculationService.mock.results.length;

    await act(async () => {
      result.current.resetServices();
    });

    // The brand-new CalculationService instance should have received the
    // updated config (mass: 85), not the stale mount-time value (mass: 30).
    // Use mock.results (the returned object) not mock.instances (the `this`
    // context), because the mock factory returns a plain object.
    const newInstance = MockCalculationService.mock.results[instancesBefore]
      ?.value as unknown as { updateConfig: jest.Mock };
    expect(newInstance.updateConfig).toHaveBeenCalledWith(
      expect.objectContaining({ mass: 85 })
    );
  });

  it('calls updateConfig on the service when the store config changes', () => {
    const { result } = renderHook(() => useWorkoutServices(), {
      wrapper: makeWrapper(),
    });

    const calcService = result.current.calculationService as unknown as {
      updateConfig: jest.Mock;
    };
    const callsBefore = calcService.updateConfig.mock.calls.length;

    act(() => {
      testStore.setState({ config: { mass: 99 } });
    });

    expect(calcService.updateConfig).toHaveBeenCalledTimes(callsBefore + 1);
    expect(calcService.updateConfig).toHaveBeenLastCalledWith(
      expect.objectContaining({ mass: 99 })
    );
  });

  it('does not call updateConfig again when config reference is unchanged', () => {
    const { result } = renderHook(() => useWorkoutServices(), {
      wrapper: makeWrapper(),
    });

    const calcService = result.current.calculationService as unknown as {
      updateConfig: jest.Mock;
    };

    // Grab the current config object and set the same reference back.
    const currentConfig = testStore.getState().config;
    const callsBefore = calcService.updateConfig.mock.calls.length;

    act(() => {
      // Same reference → Zustand selector returns the same value → effect
      // dependency hasn't changed → updateConfig should NOT be called again.
      testStore.setState({ config: currentConfig });
    });

    expect(calcService.updateConfig.mock.calls.length).toBe(callsBefore);
  });
});
