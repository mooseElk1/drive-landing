import { Subject } from 'rxjs';

import {
  type SprintAnalysisDependencies,
  SprintAnalysisService,
  type SprintAnalysisStateManagerLike,
} from '@/features/workout/services/sprint-analysis-service';
import { type GaitSpeedModel } from '@/features/workout/types/gait-model';
import { type SprintSummary } from '@/features/workout/types/sprint-analysis';
import { type BufferService } from '@/services/buffer';
import { CHANNELS } from '@/types/channel-names';
import { ProcessedSensorData } from '@/types/processed-sensor-data';

function makeChunk(): ProcessedSensorData {
  const chunk = new ProcessedSensorData();
  chunk.channels[CHANNELS.TIMESTAMP] = [1000];
  chunk.channels[CHANNELS.ACCEL_MAGNITUDE_OUTPUT_FILTERED] = [0.25];
  chunk.channels[CHANNELS.VELOCITY_MAGNITUDE] = [1.2];
  chunk.channels[CHANNELS.POWER_MAGNITUDE] = [10];
  chunk.channels[CHANNELS.ACCEL_X_LP] = [0.1];
  chunk.channels[CHANNELS.ACCEL_Y_LP] = [0.2];
  chunk.channels[CHANNELS.ACCEL_Z_LP] = [0.3];
  return chunk;
}

function makeSummary(): SprintSummary {
  return {
    startedAt: null,
    endedAt: null,
    durationMs: 0,
    distanceM: 0,
    driveCount: 0,
    peakVelocity: null,
    peakPower: null,
  };
}

function createStateManagerFake(): SprintAnalysisStateManagerLike {
  let status: 'idle' | 'recording' | 'stopped' = 'idle';
  let startedAt: number | null = null;
  let endedAt: number | null = null;
  let distanceM = 0;

  return {
    reset: jest.fn(() => {
      status = 'idle';
      startedAt = null;
      endedAt = null;
      distanceM = 0;
    }),
    startRecording: jest.fn(() => {
      status = 'recording';
      startedAt = null;
      endedAt = null;
      distanceM = 0;
    }),
    stopRecording: jest.fn(() => {
      if (status === 'recording') {
        status = 'stopped';
      }
    }),
    isRecording: jest.fn(() => status === 'recording'),
    getStatus: jest.fn(() => status),
    noteTimestamp: jest.fn((ts: number) => {
      if (startedAt === null) {
        startedAt = ts;
      }
      endedAt = ts;
    }),
    addDistance: jest.fn((velocityMps: number, dtSeconds: number) => {
      if (dtSeconds > 0) {
        distanceM += velocityMps * dtSeconds;
      }
    }),
    snapshot: jest.fn(() => ({
      status,
      startedAt,
      endedAt,
      distanceM,
    })),
  };
}

describe('SprintAnalysisService orchestration seams', () => {
  it('delegates lifecycle and processing to injected collaborators', () => {
    const flushed$ = new Subject<ProcessedSensorData>();
    const bufferService = {
      getFlushedData: () => flushed$,
    } as BufferService;

    const fakeState = createStateManagerFake();
    const fakeStepWindow = {
      add: jest.fn(),
      reset: jest.fn(),
      computeFeatures: jest.fn(() => ({}) as Record<string, never>),
    };
    const fakeDetector = {
      reset: jest.fn(),
      trackJerk: jest.fn(),
      detectDrive: jest.fn(() => null),
    };
    const fakeSummaryBuilder = jest.fn(() => makeSummary());

    const deps: Partial<SprintAnalysisDependencies> = {
      sprintStateManager: fakeState,
      stepFeatureWindow: fakeStepWindow,
      driveDetector: fakeDetector,
      summaryBuilder: fakeSummaryBuilder,
    };

    const service = new SprintAnalysisService(bufferService, undefined, deps);

    service.startSprint();
    flushed$.next(makeChunk());
    service.stopSprint();

    expect(fakeState.reset).toHaveBeenCalled();
    expect(fakeState.startRecording).toHaveBeenCalled();
    expect(fakeStepWindow.reset).toHaveBeenCalled();
    expect(fakeDetector.reset).toHaveBeenCalled();

    expect(fakeStepWindow.add).toHaveBeenCalledTimes(1);
    expect(fakeDetector.trackJerk).toHaveBeenCalledTimes(1);
    expect(fakeDetector.detectDrive).toHaveBeenCalledTimes(1);

    expect(fakeSummaryBuilder).toHaveBeenCalled();

    service.dispose();
  });

  it('skips gait prediction when a drive timestamp does not advance', () => {
    const flushed$ = new Subject<ProcessedSensorData>();
    const bufferService = {
      getFlushedData: () => flushed$,
    } as BufferService;

    const fakeState = createStateManagerFake();
    const fakeStepWindow = {
      add: jest.fn(),
      reset: jest.fn(),
      computeFeatures: jest.fn(() => ({}) as Record<string, never>),
    };
    const drives = [
      {
        index: 1,
        timestamp: 1000,
        timeFromStartMs: 0,
        distanceFromStartM: 0,
        peakAccelMagFilt: 0.3,
        peakJerk: 1,
      },
      {
        index: 2,
        timestamp: 1000,
        timeFromStartMs: 0,
        distanceFromStartM: 0,
        peakAccelMagFilt: 0.35,
        peakJerk: 1.2,
      },
    ];
    const fakeDetector = {
      reset: jest.fn(),
      trackJerk: jest.fn(),
      detectDrive: jest
        .fn()
        .mockReturnValueOnce(drives[0])
        .mockReturnValueOnce(drives[1]),
    };
    const fakeSummaryBuilder = jest.fn(() => makeSummary());
    const gaitModel: GaitSpeedModel = {
      predict: jest.fn(() => 5),
    };

    const deps: Partial<SprintAnalysisDependencies> = {
      sprintStateManager: fakeState,
      stepFeatureWindow: fakeStepWindow,
      driveDetector: fakeDetector,
      summaryBuilder: fakeSummaryBuilder,
      gaitModel,
    };

    const service = new SprintAnalysisService(bufferService, undefined, deps);

    service.startSprint();
    flushed$.next(makeChunk());
    flushed$.next(makeChunk());
    service.stopSprint();

    const result = service.getResult();
    expect(result).not.toBeNull();
    if (!result) {
      throw new Error('Expected sprint result');
    }

    expect(result.driveEvents).toHaveLength(2);
    expect(result.driveEvents[0]?.gaitPredictedSpeedMs).toBeUndefined();
    expect(result.driveEvents[1]?.gaitPredictedSpeedMs).toBeUndefined();
    expect(gaitModel.predict).not.toHaveBeenCalled();

    service.dispose();
  });
});
