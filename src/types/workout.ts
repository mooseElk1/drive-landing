import { type SprintAnalysisResult } from '@/features/workout/types/sprint-analysis';

import { ProcessedSensorData } from './processed-sensor-data';
import { type WorkoutEntry } from './workout-database';

// Re-export the new workout database types
export type Workout = WorkoutEntry;

// For backward compatibility, export the class-style constructor
export class WorkoutClass {
  id: string;
  name: string;
  date: Date;
  data: ProcessedSensorData;
  sprintAnalysis?: SprintAnalysisResult | null;

  constructor(opts: {
    name: string;
    date: Date;
    data: ProcessedSensorData | { channels?: Record<string, number[]> };
    id?: string;
    sprintAnalysis?: SprintAnalysisResult | null;
  }) {
    const { name, date, data, id, sprintAnalysis } = opts;
    this.name = name;
    this.date = date;
    // Normalize data to a ProcessedSensorData instance when possible
    this.data =
      data instanceof ProcessedSensorData
        ? data
        : new ProcessedSensorData(
            data as { channels?: Record<string, number[]> }
          );
    this.id =
      id ??
      `workout_${date.getTime()}_${Math.random().toString(36).substr(2, 9)}`;
    this.sprintAnalysis = sprintAnalysis ?? null;
  }

  // Delegate ProcessedSensorData methods to maintain compatibility
  getLastData(chartTimeInSeconds: number, channel: string): number[] {
    return this.data.getLastData(chartTimeInSeconds, channel);
  }

  getDataInRange(startMs: number, endMs: number, channel: string): number[] {
    return this.data.getDataInRange(startMs, endMs, channel);
  }

  getTimestampsInRange(startMs: number, endMs: number): number[] {
    return this.data.getTimestampsInRange(startMs, endMs);
  }

  getLastNSeconds(n: number): ProcessedSensorData {
    return this.data.getLastNSeconds(n);
  }

  length(): number {
    return this.data.length();
  }

  addData(data: ProcessedSensorData): ProcessedSensorData {
    return this.data.addData(data);
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      date: this.date instanceof Date ? this.date.toISOString() : this.date,
      sprintAnalysis: this.sprintAnalysis ?? null,
      data:
        // `ProcessedSensorData` implements `toJSON()` and `channels`.
        // Call the well-typed API directly instead of using `any`.
        this.data.toJSON(),
    };
  }

  static fromJSON(obj: unknown): WorkoutClass {
    const o =
      obj && typeof obj === 'object' && obj !== null
        ? (obj as Record<string, unknown>)
        : {};
    const name = typeof o.name === 'string' ? o.name : 'unnamed';
    const date = o.date ? new Date(o.date as string) : new Date();
    const sprintAnalysis =
      'sprintAnalysis' in o
        ? ((o.sprintAnalysis as SprintAnalysisResult | null | undefined) ??
          null)
        : null;

    // Prepare a seed object for ProcessedSensorData (expected shape: { channels?: Record<string, number[]> })
    const seed =
      o.data && typeof o.data === 'object'
        ? (o.data as { channels?: Record<string, number[]> })
        : { channels: {} };

    // Use ProcessedSensorData.fromJSON if available, otherwise construct directly
    const psd =
      typeof (ProcessedSensorData as unknown as { fromJSON?: Function })
        .fromJSON === 'function'
        ? ProcessedSensorData.fromJSON(seed)
        : new ProcessedSensorData(seed);

    const id = typeof o.id === 'string' ? o.id : undefined;
    const inst = new WorkoutClass({
      name,
      date,
      data: psd,
      id,
      sprintAnalysis,
    });
    return inst;
  }
}
