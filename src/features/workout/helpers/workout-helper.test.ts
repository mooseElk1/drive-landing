import { workoutHelper } from '@/features/workout/helpers/workout-helper';
import { type SprintAnalysisResult } from '@/features/workout/types/sprint-analysis';
import { ProcessedSensorData } from '@/types/processed-sensor-data';
import { WorkoutClass } from '@/types/workout';

describe('workoutHelper', () => {
  it('should create a workout when given a name and ProcessedSensorData', () => {
    const mockProcessedSensorData = new ProcessedSensorData();
    mockProcessedSensorData.channels = {
      timestamp: [1701108454407, 1701108454413],
      gFx: [0.979, 0.978],
      gFy: [0.055, 0.045],
      gFz: [0.088, 0.104],
      ax: [-0.18],
      ay: [0.0],
      az: [0.02],
      wx: [0.01],
      wy: [-0.02],
      wz: [0.02],
      Bx: [316.83],
      By: [-6.24],
      Bz: [-6.68],
      latitude: [42.54426871489506],
      longitude: [-83.37821898618688],
      altitude: [287.79053136054426],
      speed: [],
    };

    // Call the workoutHelper function
    const workout = workoutHelper('foo', mockProcessedSensorData);

    // Assertions
    expect(workout).toBeInstanceOf(WorkoutClass);
    expect(workout.name).toBe('foo');
    expect(workout.date).toEqual(new Date(1701108454407));
    expect(workout.data.getChannelData('timestamp')).toEqual([
      1701108454407, 1701108454413,
    ]);
    expect(workout.data.getChannelData('gFx')).toEqual([0.979, 0.978]);
  });

  it('should attach sprint analysis when provided', () => {
    const mockProcessedSensorData = new ProcessedSensorData({
      channels: { timestamp: [1701108454407] },
    });
    const sprintAnalysis: SprintAnalysisResult = {
      summary: {
        startedAt: 1701108454407,
        endedAt: 1701108454507,
        durationMs: 100,
        distanceM: 1.2,
        driveCount: 1,
        peakVelocity: null,
        peakPower: null,
      },
      driveEvents: [],
    };

    const workout = workoutHelper(
      'foo',
      mockProcessedSensorData,
      sprintAnalysis
    );

    expect(workout.sprintAnalysis).toEqual(sprintAnalysis);
  });
});
