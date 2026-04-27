import React, {
  createContext,
  useCallback,
  useContext,
  useReducer,
  useRef,
} from 'react';

import { Constants } from '@/constants/constants';
import { ProcessedSensorData } from '@/types/processed-sensor-data';
import { WorkoutClass } from '@/types/workout';

const WINDOW_SIZE = 10;

const createWorkout = (data: ProcessedSensorData) =>
  new WorkoutClass({
    name: 'Sprint',
    date: new Date(),
    data,
  });

const baseState = {
  windowedData: createWorkout(new ProcessedSensorData()),
  fullDataSize: 0,
};

type LoggedDataState = typeof baseState;

interface LoggedDataAction {
  type: string;
  payload?: ProcessedSensorData;
  fullData?: ProcessedSensorData;
}

const copyFilteredData = (
  src: ProcessedSensorData,
  excludePred: (key: string) => boolean
) => {
  const dst = new ProcessedSensorData();
  for (const key in src) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const value = (src as any)[key];
    if (
      typeof value !== 'function' &&
      Array.isArray(value) &&
      !excludePred(key)
    ) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (dst as any)[key] = [...(value as number[])];
    }
  }
  return dst;
};

// Reducer for managing loggedData
function loggedDataReducer(state: LoggedDataState, action: LoggedDataAction) {
  const fullData = action.fullData ?? new ProcessedSensorData();

  switch (action.type) {
    case Constants.Reducers.AddData:
      const windowedSensorData =
        action.fullData?.getLastNSeconds(WINDOW_SIZE) ||
        new ProcessedSensorData();
      return {
        windowedData: createWorkout(windowedSensorData),
        fullDataSize: fullData.length(),
      };

    case Constants.Reducers.ClearData:
      return baseState;

    case Constants.Reducers.ResetVelocityData: {
      const resetData = copyFilteredData(
        fullData,
        (key) => key.includes('velocity') || key.includes('calculated')
      );
      return {
        windowedData: createWorkout(resetData.getLastNSeconds(WINDOW_SIZE)),
        fullDataSize: resetData.length(),
      };
    }

    case Constants.Reducers.ResetChartData: {
      const resetChartData = copyFilteredData(
        fullData,
        (key) => key.includes('velocity') || key.includes('power')
      );
      return {
        windowedData: createWorkout(
          resetChartData.getLastNSeconds(WINDOW_SIZE)
        ),
        fullDataSize: resetChartData.length(),
      };
    }

    default:
      return state;
  }
}

// Provider component
export const LoggedDataProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const fullDataRef = useRef(new ProcessedSensorData());

  const [state, dispatch] = useReducer(loggedDataReducer, baseState);

  const getFullData = useCallback(
    () =>
      new WorkoutClass({
        name: 'Sprint',
        date: new Date(),
        data: fullDataRef.current,
      }),
    []
  );

  const enhancedDispatch = (action: LoggedDataAction) => {
    switch (action.type) {
      case Constants.Reducers.AddData:
        fullDataRef.current.addData(
          action.payload ?? new ProcessedSensorData()
        );
        dispatch({ ...action, fullData: fullDataRef.current });
        break;

      case Constants.Reducers.ClearData:
        fullDataRef.current = new ProcessedSensorData();
        dispatch(action);
        break;

      case Constants.Reducers.ResetVelocityData: {
        const resetData = copyFilteredData(
          fullDataRef.current,
          (key) => key.includes('velocity') || key.includes('calculated')
        );
        fullDataRef.current = resetData;
        dispatch({ ...action, fullData: fullDataRef.current });
        break;
      }

      case Constants.Reducers.ResetChartData: {
        const resetChartData = copyFilteredData(
          fullDataRef.current,
          (key) => key.includes('velocity') || key.includes('power')
        );
        fullDataRef.current = resetChartData;
        dispatch({ ...action, fullData: fullDataRef.current });
        break;
      }

      default:
        dispatch(action);
    }
  };

  return (
    <LoggedDataContext.Provider
      value={{
        loggedData: state.windowedData,
        fullDataSize: state.fullDataSize,
        dispatch: enhancedDispatch,
        getFullData,
      }}
    >
      {children}
    </LoggedDataContext.Provider>
  );
};

// Define the context type
interface LoggedDataContextType {
  loggedData: WorkoutClass;
  fullDataSize: number;
  dispatch: React.Dispatch<LoggedDataAction>;
  getFullData: () => WorkoutClass;
}

// Create the context
const LoggedDataContext = createContext<LoggedDataContextType | undefined>(
  undefined
);

// Custom hook to use the context
export const useLoggedData = () => {
  const context = useContext(LoggedDataContext);
  if (!context) {
    throw new Error('useLoggedData must be used within a LoggedDataProvider');
  }
  return context;
};

export default LoggedDataProvider;
