import type { SprintAnalysisResult } from '@/features/workout/services/sprint-analysis-service';
import { CHANNELS } from '@/types/channel-names';
import { ProcessedSensorData } from '@/types/processed-sensor-data';
import { WorkoutClass } from '@/types/workout';

export function workoutHelper(
  name: string,
  processedSensorData: ProcessedSensorData,
  sprintAnalysis?: SprintAnalysisResult | null
): WorkoutClass {
  const legacyData = (
    processedSensorData as unknown as { data?: Record<string, number[]> }
  ).data;

  const normalizedData =
    processedSensorData.getChannelData(CHANNELS.TIMESTAMP).length === 0 &&
    legacyData
      ? new ProcessedSensorData({ channels: legacyData })
      : processedSensorData;

  const firstTimestamp = normalizedData.getChannelData(CHANNELS.TIMESTAMP)[0];
  const date = new Date(firstTimestamp ?? Date.now());
  const workout = new WorkoutClass({
    name,
    date,
    data: normalizedData,
    sprintAnalysis,
  });

  return workout;
}
