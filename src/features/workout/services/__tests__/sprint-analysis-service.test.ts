import { Subject } from 'rxjs';

import { updatePeakMarker } from '@/features/workout/services/sprint-analysis-metrics';
import { SprintAnalysisService } from '@/features/workout/services/sprint-analysis-service';
import { type SprintAnalysisState } from '@/features/workout/types/sprint-analysis';
import { type BufferService } from '@/services/buffer';
import { CHANNELS } from '@/types/channel-names';
import { ProcessedSensorData } from '@/types/processed-sensor-data';

function makeChunk(args: {
  timestamps: number[];
  accFilt: number[];
  velocity: number[];
  power: number[];
  lpX: number[];
  lpY: number[];
  lpZ: number[];
}): ProcessedSensorData {
  const chunk = new ProcessedSensorData();
  chunk.channels[CHANNELS.TIMESTAMP] = args.timestamps.slice();
  chunk.channels[CHANNELS.ACCEL_MAGNITUDE_OUTPUT_FILTERED] =
    args.accFilt.slice();
  chunk.channels[CHANNELS.VELOCITY_MAGNITUDE] = args.velocity.slice();
  chunk.channels[CHANNELS.POWER_MAGNITUDE] = args.power.slice();
  chunk.channels[CHANNELS.ACCEL_X_LP] = args.lpX.slice();
  chunk.channels[CHANNELS.ACCEL_Y_LP] = args.lpY.slice();
  chunk.channels[CHANNELS.ACCEL_Z_LP] = args.lpZ.slice();
  return chunk;
}

function createService() {
  const flushed$ = new Subject<ProcessedSensorData>();
  const bufferService = {
    getFlushedData: () => flushed$,
  } as BufferService;
  const service = new SprintAnalysisService(bufferService, {
    refractoryMs: 200,
    minPeakAccelMagFilt: 0.15,
    maxDriveEvents: 200,
  });

  return { flushed$, service };
}

describe('SprintAnalysisService', () => {
  it('processes valid chunks into the expected sprint state transitions', () => {
    const { flushed$, service } = createService();
    const states: SprintAnalysisState[] = [];
    const subscription = service.subscribe((state) => states.push(state));

    service.startSprint();
    flushed$.next(
      makeChunk({
        timestamps: [1000, 1100, 1200, 1300],
        accFilt: [0, 0.2, 0.4, 0.1],
        velocity: [0, 1, 2, 3],
        power: [0, 10, 20, 15],
        lpX: [0, -1, 2, -0.5],
        lpY: [0, 0, 0, 0],
        lpZ: [1, 3, 2, 4],
      })
    );
    service.stopSprint();

    const finalState = states.at(-1);

    expect(states[0]?.status).toBe('idle');
    expect(states[1]?.status).toBe('idle');
    expect(states[2]?.status).toBe('recording');
    expect(finalState?.status).toBe('stopped');
    expect(finalState?.summary.startedAt).toBe(1000);
    expect(finalState?.summary.endedAt).toBe(1300);
    expect(finalState?.summary.driveCount).toBe(1);

    subscription.unsubscribe();
    service.dispose();
  });

  it('populates per-step LP feature fields on drive events when LP channels are present', () => {
    const { flushed$, service } = createService();

    service.startSprint();
    flushed$.next(
      makeChunk({
        timestamps: [1000, 1100, 1200, 1300],
        accFilt: [0, 0.2, 0.4, 0.1],
        velocity: [0, 1, 2, 3],
        power: [0, 10, 20, 15],
        lpX: [0, -1, 2, -0.5],
        lpY: [0, 0, 0, 0],
        lpZ: [1, 3, 2, 4],
      })
    );
    service.stopSprint();

    const result = service.getResult();
    const drive = result?.driveEvents[0];

    expect(drive).toMatchObject({
      peakVerticalAccelLp: 4,
      peakBrakingAccelLp: -1,
      peakPropulsiveAccelLp: 2,
      verticalImpulseProxy: 0.09,
      stepWindowMs: 200,
    });

    service.dispose();
  });

  it('updatePeakMarker replaces lower peaks and preserves higher ones', () => {
    const initial = updatePeakMarker({
      current: null,
      value: 5,
      timestamp: 1000,
      timeFromStartMs: 0,
      drivesSoFar: 0,
      distanceFromStartM: 0,
    });
    const updated = updatePeakMarker({
      current: initial,
      value: 6,
      timestamp: 1100,
      timeFromStartMs: 100,
      drivesSoFar: 1,
      distanceFromStartM: 1,
    });
    const unchanged = updatePeakMarker({
      current: updated,
      value: 4,
      timestamp: 1200,
      timeFromStartMs: 200,
      drivesSoFar: 2,
      distanceFromStartM: 2,
    });

    expect(updated.value).toBe(6);
    expect(updated.timestamp).toBe(1100);
    expect(unchanged).toBe(updated);
  });
});
