import { Subject } from 'rxjs';

import { SprintAnalysisService } from '@/features/workout/services/sprint-analysis-service';
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
  chunk.channels[CHANNELS.TIMESTAMP] = args.timestamps;
  chunk.channels[CHANNELS.ACCEL_MAGNITUDE_OUTPUT_FILTERED] = args.accFilt;
  chunk.channels[CHANNELS.VELOCITY_MAGNITUDE] = args.velocity;
  chunk.channels[CHANNELS.POWER_MAGNITUDE] = args.power;
  chunk.channels[CHANNELS.ACCEL_X_LP] = args.lpX;
  chunk.channels[CHANNELS.ACCEL_Y_LP] = args.lpY;
  chunk.channels[CHANNELS.ACCEL_Z_LP] = args.lpZ;
  return chunk;
}

function sliceChunk(args: {
  timestamps: number[];
  accFilt: number[];
  velocity: number[];
  power: number[];
  lpX: number[];
  lpY: number[];
  lpZ: number[];
  start: number;
  end: number;
}): ProcessedSensorData {
  const { timestamps, accFilt, velocity, power, lpX, lpY, lpZ, start, end } =
    args;

  return makeChunk({
    timestamps: timestamps.slice(start, end),
    accFilt: accFilt.slice(start, end),
    velocity: velocity.slice(start, end),
    power: power.slice(start, end),
    lpX: lpX.slice(start, end),
    lpY: lpY.slice(start, end),
    lpZ: lpZ.slice(start, end),
  });
}

describe('SprintAnalysisService integration fixture', () => {
  it('matches expected summary and drive outputs for a longer multi-chunk sprint sequence', () => {
    const flushed$ = new Subject<ProcessedSensorData>();
    const bufferService = {
      getFlushedData: () => flushed$,
    } as BufferService;

    const service = new SprintAnalysisService(bufferService, {
      refractoryMs: 200,
      minPeakAccelMagFilt: 0.15,
      maxDriveEvents: 200,
    });

    const timestamps = [
      1000, 1100, 1200, 1300, 1400, 1500, 1600, 1700, 1800, 1900, 2000, 2100,
      2200, 2300, 2400, 2500, 2600, 2700, 2800, 2900,
    ];

    const accFilt = [
      0, 0.2, 0.5, 0.1, 0.05, 0.2, 0.3, 0.6, 0.1, 0.05, 0.3, 0.35, 0.55, 0.2,
      0.15, 0.12, 0.1, 0.08, 0.06, 0.05,
    ];

    const velocity = [
      0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 4.5, 5, 5.5, 6, 5.5, 5, 4.5, 4, 3.5, 3,
      2.5,
    ];

    const power = velocity.map((v) => v * 12);

    const lpX = [
      -0.2, -0.1, -0.3, -0.2, -0.1, -0.4, -0.2, -0.5, -0.1, -0.1, -0.2, -0.3,
      -0.4, -0.2, -0.1, -0.2, -0.2, -0.1, -0.1, -0.1,
    ];
    const lpY = new Array(timestamps.length).fill(0);
    const lpZ = [
      1, 1.2, 1.6, 1.1, 1, 1.4, 1.8, 2.2, 1.2, 1.1, 1.5, 1.7, 2.1, 1.3, 1.2,
      1.4, 1.6, 1.3, 1.1, 1,
    ];

    service.startSprint();

    flushed$.next(
      sliceChunk({
        timestamps,
        accFilt,
        velocity,
        power,
        lpX,
        lpY,
        lpZ,
        start: 0,
        end: 10,
      })
    );

    flushed$.next(
      sliceChunk({
        timestamps,
        accFilt,
        velocity,
        power,
        lpX,
        lpY,
        lpZ,
        start: 10,
        end: 20,
      })
    );

    service.stopSprint();

    const result = service.getResult();
    expect(result).not.toBeNull();
    if (!result) {
      throw new Error('Expected sprint result for integration fixture');
    }

    expect(result.summary.startedAt).toBe(1000);
    expect(result.summary.endedAt).toBe(2900);
    expect(result.summary.durationMs).toBe(1900);
    expect(result.summary.distanceM).toBeCloseTo(6.7, 6);
    expect(result.summary.driveCount).toBe(3);

    expect(result.summary.peakVelocity).toMatchObject({
      value: 6,
      timestamp: 2200,
      timeFromStartMs: 1200,
      drivesSoFar: 2,
    });
    expect(result.summary.peakVelocity?.distanceFromStartM).toBeCloseTo(3.9, 6);

    expect(result.summary.peakPower).toMatchObject({
      value: 72,
      timestamp: 2200,
      timeFromStartMs: 1200,
      drivesSoFar: 2,
    });
    expect(result.summary.peakPower?.distanceFromStartM).toBeCloseTo(3.9, 6);

    expect(result.driveEvents).toHaveLength(3);

    expect(result.driveEvents[0]).toMatchObject({
      index: 1,
      timestamp: 1200,
      timeFromStartMs: 200,
      peakAccelMagFilt: 0.5,
      stepWindowMs: 200,
    });
    expect(result.driveEvents[0]?.peakJerk).toBeCloseTo(3, 6);
    expect(result.driveEvents[0]?.distanceFromStartM).toBeCloseTo(0.3, 6);

    expect(result.driveEvents[1]).toMatchObject({
      index: 2,
      timestamp: 1700,
      timeFromStartMs: 700,
      peakAccelMagFilt: 0.6,
      stepWindowMs: 200,
    });
    expect(result.driveEvents[1]?.peakJerk).toBeCloseTo(3, 6);
    expect(result.driveEvents[1]?.distanceFromStartM).toBeCloseTo(1.8, 6);

    expect(result.driveEvents[2]).toMatchObject({
      index: 3,
      timestamp: 2200,
      timeFromStartMs: 1200,
      peakAccelMagFilt: 0.55,
      stepWindowMs: 200,
    });
    expect(result.driveEvents[2]?.peakJerk).toBeCloseTo(2.5, 6);
    expect(result.driveEvents[2]?.distanceFromStartM).toBeCloseTo(4.45, 6);

    service.dispose();
  });
});
