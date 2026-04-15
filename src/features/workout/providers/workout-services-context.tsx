import React, {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';

import { CalculationService } from '@/features/workout/services/calculation-service';
import { HeuristicGaitSpeedModel } from '@/features/workout/services/heuristic-gait-speed-model';
import { getSensorService } from '@/features/workout/services/sensors/sensors-service';
import { SprintAnalysisService } from '@/features/workout/services/sprint-analysis-service';
import { BufferService } from '@/services/buffer';
import { useCalculationConfigStore } from '@/store/calculation-config';

interface WorkoutResettableServices {
  calculationService: CalculationService;
  bufferService: BufferService;
  sprintAnalysisService: SprintAnalysisService;
}

interface WorkoutServicesContextValue {
  sensorService: ReturnType<typeof getSensorService>;
  calculationService: CalculationService;
  bufferService: BufferService;
  sprintAnalysisService: SprintAnalysisService;
  resetServices: () => WorkoutResettableServices;
}

const WorkoutServicesContext = createContext<
  WorkoutServicesContextValue | undefined
>(undefined);

export function WorkoutServicesProvider({ children }: { children: ReactNode }) {
  // Sensor service is created once; it has no "reset" use case.
  const sensorService = useMemo(() => getSensorService(), []);
  const gaitModel = useMemo(() => new HeuristicGaitSpeedModel(), []);

  const createResettableServices =
    useCallback((): WorkoutResettableServices => {
      const calculationService = new CalculationService(sensorService);
      calculationService.updateConfig(
        useCalculationConfigStore.getState().config
      );
      const bufferService = new BufferService(calculationService, 4);
      const sprintAnalysisService = new SprintAnalysisService(
        bufferService,
        undefined,
        { gaitModel }
      );

      return { calculationService, bufferService, sprintAnalysisService };
    }, [gaitModel, sensorService]);

  // calculationService and bufferService live in state so that when
  // resetServices() replaces them, the context value updates and consumers
  // re-render with the new instances.
  const [
    { calculationService, bufferService, sprintAnalysisService },
    setResettable,
  ] = useState(() => createResettableServices());

  const resetServices = useCallback(() => {
    const nextServices = createResettableServices();
    sprintAnalysisService.dispose();
    setResettable(nextServices);
    return nextServices;
  }, [createResettableServices, sprintAnalysisService]);

  // Sync config changes into the service. Zustand returns a stable object
  // reference when nothing changes, so this effect only fires on real updates.
  const config = useCalculationConfigStore((s) => s.config);
  useEffect(() => {
    calculationService.updateConfig(config);
  }, [config, calculationService]);

  useEffect(
    () => () => sprintAnalysisService.dispose(),
    [sprintAnalysisService]
  );

  const value = useMemo(
    () => ({
      sensorService,
      calculationService,
      bufferService,
      sprintAnalysisService,
      resetServices,
    }),
    [
      sensorService,
      calculationService,
      bufferService,
      sprintAnalysisService,
      resetServices,
    ]
  );

  return (
    <WorkoutServicesContext.Provider value={value}>
      {children}
    </WorkoutServicesContext.Provider>
  );
}

export function useWorkoutServices(): WorkoutServicesContextValue {
  const ctx = useContext(WorkoutServicesContext);
  if (!ctx) {
    throw new Error(
      'useWorkoutServices must be used within WorkoutServicesProvider'
    );
  }
  return ctx;
}
