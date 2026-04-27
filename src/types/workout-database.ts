import { type ProcessedSensorData } from './processed-sensor-data';

/**
 * Supported workout types
 */
export enum WorkoutType {
  GENERAL = 'general',
  STRENGTH = 'strength',
  CARDIO = 'cardio',
  SPORTS = 'sports',
  REHABILITATION = 'rehabilitation',
  CUSTOM = 'custom',
}

/**
 * Calculated metrics from workout sensor data
 */
export interface WorkoutMetrics {
  /** Peak acceleration magnitude */
  peakAcceleration?: number;
  /** Peak power output */
  peakPower?: number;
  /** Peak velocity */
  peakVelocity?: number;
  /** Average power over the workout */
  averagePower?: number;
  /** Maximum g-force experienced */
  maxGForce?: number;

  // ---------------------------------------------------------------------------
  // Power Profile Framework (optional extensions)
  // ---------------------------------------------------------------------------
  /** Null = unattached sprint/workout (guest session). */
  athleteId?: string | null;
  /** Total sled/load at time of sprint in kg. */
  loadKg?: number;
  /** Session identifier grouping multiple sprints. */
  sessionId?: string | null;

  /** Resolved power measurement mode (do not compare across modes). */
  powerMeasurementMode?: 'raw' | 'calibrated' | 'friction_corrected' | 'fused';
  /** Friction confidence (stored now; becomes meaningful when friction detection is validated). */
  frictionConfidence?: 'Unknown' | 'Low' | 'Medium' | 'High';
  /** frictionCorrectedPower / derivedPower when both channels exist, else null. */
  calibrationRatio?: number | null;
  /** Surface type used for calibration keying. */
  surfaceType?: 'turf' | null;

  /** PPL estimate (load kg) active when sprint was recorded. */
  pplAtTimeOfSprint?: number | null;
  /** Zone classification at time of recording (immutable after save). */
  zoneAtRecording?:
    | 'SPEED_STRENGTH'
    | 'PEAK_POWER'
    | 'STRENGTH_SPEED'
    | 'OVERLOAD';
}

/**
 * Metadata for a tracked workout entry in the database
 */
export interface WorkoutEntry {
  /** Unique identifier for the workout */
  id: string;
  /** Human-readable workout name */
  name: string;
  /** Date when the workout was recorded */
  date: Date;
  /** Duration of the workout in seconds */
  duration: number;
  /** Type of workout/sport */
  type: WorkoutType;
  /** File system path where the workout data is stored */
  filePath: string;
  /** Optional notes about the workout */
  notes?: string;
  /** Calculated metrics from the sensor data */
  metrics?: WorkoutMetrics;
  /** Tags for categorization */
  tags?: string[];
  /** Date when the entry was created */
  createdAt: Date;
  /** Date when the entry was last modified */
  updatedAt: Date;

  /** Soft delete timestamp (ISO) - hidden from athlete history when set */
  deletedAt?: string | null;
  /** Why it was deleted (reserved for future modeling decisions) */
  deletedReason?: 'user' | 'system' | null;
}

/**
 * Database of all tracked workouts - stores metadata and file paths
 */
export interface WorkoutTrackingDatabase {
  /** Collection of workout entries indexed by ID */
  workouts: Record<string, WorkoutEntry>;
  /** Database metadata */
  metadata: {
    version: string;
    createdAt: Date;
    lastUpdated: Date;
    totalWorkouts: number;
  };
}

/**
 * Complete workout data structure (stored in individual files)
 */
export interface WorkoutFile {
  /** Workout metadata */
  metadata: {
    id: string;
    name: string;
    date: Date;
    duration: number;
    type: WorkoutType;
    notes?: string;
    tags?: string[];
  };
  /** Processed sensor data for the workout */
  sensorData: ProcessedSensorData;
  /** Calculated metrics from the sensor data */
  metrics?: WorkoutMetrics;
  /** File format version for compatibility */
  version: string;
}

/**
 * Factory function to create a new workout entry for the tracking database
 */
export interface CreateWorkoutEntryParams {
  id?: string;
  name: string;
  type: WorkoutType;
  filePath: string;
  duration: number;
  notes?: string;
  tags?: string[];
  metrics?: WorkoutMetrics;
}

export function createWorkoutEntry(
  params: CreateWorkoutEntryParams
): WorkoutEntry {
  const now = new Date();
  const id =
    params.id ??
    `workout_${now.getTime()}_${Math.random().toString(36).substr(2, 9)}`;

  return {
    id,
    name: params.name,
    date: now,
    duration: params.duration,
    type: params.type,
    filePath: params.filePath,
    notes: params.notes,
    metrics: params.metrics,
    tags: params.tags,
    createdAt: now,
    updatedAt: now,
    deletedAt: null,
    deletedReason: null,
  };
}

/**
 * Factory function to create a workout file structure
 */
export function createWorkoutFile(
  workoutEntry: WorkoutEntry,
  sensorData: ProcessedSensorData,
  metrics?: WorkoutMetrics
): WorkoutFile {
  return {
    metadata: {
      id: workoutEntry.id,
      name: workoutEntry.name,
      date: workoutEntry.date,
      duration: workoutEntry.duration,
      type: workoutEntry.type,
      notes: workoutEntry.notes,
      tags: workoutEntry.tags,
    },
    sensorData,
    metrics: metrics || workoutEntry.metrics,
    version: '1.0.0',
  };
}

/**
 * Calculate workout metrics from processed sensor data
 */
export function calculateWorkoutMetrics(
  sensorData: ProcessedSensorData
): WorkoutMetrics {
  const metrics: WorkoutMetrics = {};

  // Peak acceleration magnitude
  const accelMag = sensorData.channels?.acc_mag;
  if (accelMag && accelMag.length > 0) {
    metrics.peakAcceleration = Math.max(...accelMag);
    metrics.maxGForce = metrics.peakAcceleration / 9.81; // Convert to g-force
  }

  // Peak power
  const powerMag = sensorData.channels?.power_magnitude;
  if (powerMag && powerMag.length > 0) {
    metrics.peakPower = Math.max(...powerMag);
    metrics.averagePower =
      powerMag.reduce((a, b) => a + b, 0) / powerMag.length;
  }

  // Peak velocity
  const velocityMag = sensorData.channels?.velocity_magnitude;
  if (velocityMag && velocityMag.length > 0) {
    metrics.peakVelocity = Math.max(...velocityMag);
  }

  return metrics;
}

/**
 * Calculate duration from sensor data timestamps
 */
export function calculateDuration(sensorData: ProcessedSensorData): number {
  const timestamps = sensorData.channels?.timestamp ?? [];
  return timestamps.length > 0
    ? (timestamps[timestamps.length - 1]! - timestamps[0]!) / 1000
    : 0;
}
