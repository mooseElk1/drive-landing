import { BehaviorSubject, type Subscription } from 'rxjs';

import { DriveDetector } from '@/features/workout/services/drive-detector';
import {
  computeJerk,
  updatePeakMarker,
} from '@/features/workout/services/sprint-analysis-metrics';
import { SprintStateManager } from '@/features/workout/services/sprint-state-manager';
import { buildSprintSummary } from '@/features/workout/services/sprint-summary-builder';
import { StepFeatureWindow } from '@/features/workout/services/step-feature-window';
import { type GaitSpeedModel } from '@/features/workout/types/gait-model';
import {
  type DriveEvent,
  type PeakMarker,
  type SprintAnalysisResult,
  type SprintAnalysisState,
  type SprintSummary,
} from '@/features/workout/types/sprint-analysis';
import { type BufferService } from '@/services/buffer';
import { type SprintAnalysisConfig } from '@/types/calculation-configs';
import { CHANNELS } from '@/types/channel-names';
import { type ProcessedSensorData } from '@/types/processed-sensor-data';

type SummaryBuilder = (args: {
  startedAt: number | null;
  endedAt: number | null;
  distanceM: number;
  driveEvents: DriveEvent[];
  peakVelocity: PeakMarker | null;
  peakPower: PeakMarker | null;
}) => SprintSummary;

export interface SprintAnalysisStateManagerLike {
  reset(): void;
  startRecording(): void;
  stopRecording(): void;
  isRecording(): boolean;
  getStatus(): SprintAnalysisState['status'];
  noteTimestamp(ts: number): void;
  addDistance(velocityMps: number, dtSeconds: number): void;
  snapshot(): {
    status: SprintAnalysisState['status'];
    startedAt: number | null;
    endedAt: number | null;
    distanceM: number;
  };
}

export interface SprintAnalysisDriveDetectorLike {
  reset(): void;
  trackJerk(jerk: number): void;
  detectDrive(args: {
    jerk: number;
    ts: number;
    prevTs: number | null;
    prevJerk: number | null;
    prevAccFilt: number | null;
    startedAt: number | null;
    distanceFromStartM: number;
    nextIndex: number;
    computeFeatures: (peakTs: number) => Partial<DriveEvent>;
  }): DriveEvent | null;
}

export interface SprintAnalysisStepFeatureWindowLike {
  add(sample: { ts: number; x: number; y: number; z: number }): void;
  reset(): void;
  computeFeatures(peakTs: number): Partial<DriveEvent>;
}

export interface SprintAnalysisDependencies {
  driveDetector: SprintAnalysisDriveDetectorLike;
  stepFeatureWindow: SprintAnalysisStepFeatureWindowLike;
  sprintStateManager: SprintAnalysisStateManagerLike;
  summaryBuilder: SummaryBuilder;
  gaitModel: GaitSpeedModel;
}

export type {
  DriveEvent,
  PeakMarker,
  SprintAnalysisResult,
  SprintAnalysisState,
  SprintSummary,
};

const DEFAULT_CONFIG: SprintAnalysisConfig = {
  refractoryMs: 200,
  minPeakAccelMagFilt: 0.15,
  maxDriveEvents: 200,
};

function initialSummary(): SprintSummary {
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

function initialState(): SprintAnalysisState {
  return {
    status: 'idle',
    summary: initialSummary(),
    driveEvents: [],
  };
}

/**
 * SprintAnalysisService
 * - Subscribes to BufferService flushed chunks and, when recording, derives:
 *   - Drive events (peaks in filtered acceleration magnitude)
 *   - Jerk-based RFD proxy per drive: peak jerk between drives (d(acc_mag_filt)/dt)
 *   - Sprint summary: time, distance, peak power/velocity + drives-to-peak
 */
export class SprintAnalysisService {
  private readonly config: SprintAnalysisConfig;
  private readonly state$ = new BehaviorSubject<SprintAnalysisState>(
    initialState()
  );

  private bufferSub: Subscription | null = null;
  private readonly sprintState: SprintAnalysisStateManagerLike;

  private prevTs: number | null = null;
  private prevAccFilt: number | null = null;
  private prevJerk: number | null = null;

  private driveEvents: DriveEvent[] = [];
  private peakVelocity: PeakMarker | null = null;
  private peakPower: PeakMarker | null = null;
  private lastDriveTs: number | null = null;
  private readonly stepFeatureWindow: SprintAnalysisStepFeatureWindowLike;
  private readonly driveDetector: SprintAnalysisDriveDetectorLike;
  private readonly summaryBuilder: SummaryBuilder;
  private readonly gaitModel: GaitSpeedModel | null;

  constructor(
    bufferService: BufferService,
    config?: Partial<SprintAnalysisConfig>,
    dependencies?: Partial<SprintAnalysisDependencies>
  ) {
    this.config = { ...DEFAULT_CONFIG, ...(config ?? {}) };
    this.driveDetector =
      dependencies?.driveDetector ?? new DriveDetector(this.config);
    this.stepFeatureWindow =
      dependencies?.stepFeatureWindow ?? new StepFeatureWindow(30);
    this.sprintState =
      dependencies?.sprintStateManager ?? new SprintStateManager();
    this.summaryBuilder = dependencies?.summaryBuilder ?? buildSprintSummary;
    this.gaitModel = dependencies?.gaitModel ?? null;
    this.subscribeToBuffer(bufferService);
  }

  private subscribeToBuffer(bufferService: BufferService) {
    this.bufferSub = bufferService.getFlushedData().subscribe((chunk) => {
      this.processChunk(chunk);
    });
  }

  dispose() {
    this.bufferSub?.unsubscribe();
    this.bufferSub = null;
  }

  reset() {
    this.sprintState.reset();

    this.prevTs = null;
    this.prevAccFilt = null;
    this.prevJerk = null;

    this.driveEvents = [];
    this.peakVelocity = null;
    this.peakPower = null;
    this.lastDriveTs = null;
    this.driveDetector.reset();
    this.stepFeatureWindow.reset();

    this.state$.next(initialState());
  }

  startSprint() {
    // Start always implies a fresh sprint
    this.reset();
    this.sprintState.startRecording();
    this.emit();
  }

  stopSprint() {
    if (!this.sprintState.isRecording()) {
      return;
    }
    this.sprintState.stopRecording();
    this.emit();
  }

  getState$() {
    return this.state$.asObservable();
  }

  subscribe(cb: (state: SprintAnalysisState) => void) {
    return this.state$.subscribe(cb);
  }

  getResult(): SprintAnalysisResult | null {
    const state = this.state$.getValue();
    if (state.status === 'idle') return null;
    return { summary: state.summary, driveEvents: state.driveEvents };
  }

  private processChunk(chunk: ProcessedSensorData) {
    if (!this.sprintState.isRecording()) {
      return;
    }

    const arrays = {
      tsArr: chunk.channels[CHANNELS.TIMESTAMP] ?? [],
      accFiltArr:
        chunk.channels[CHANNELS.ACCEL_MAGNITUDE_OUTPUT_FILTERED] ?? [],
      vArr: chunk.channels[CHANNELS.VELOCITY_MAGNITUDE] ?? [],
      pArr: chunk.channels[CHANNELS.POWER_MAGNITUDE] ?? [],
      lpXArr: chunk.channels[CHANNELS.ACCEL_X_LP] ?? [],
      lpYArr: chunk.channels[CHANNELS.ACCEL_Y_LP] ?? [],
      lpZArr: chunk.channels[CHANNELS.ACCEL_Z_LP] ?? [],
    };

    const n = Math.max(
      arrays.tsArr.length,
      arrays.accFiltArr.length,
      arrays.vArr.length,
      arrays.pArr.length
    );
    if (n === 0) return;

    for (let i = 0; i < n; i++) {
      this._processSample(i, arrays);
    }

    this.emit();
  }

  private _processSample(
    i: number,
    arrays: {
      tsArr: number[];
      accFiltArr: number[];
      vArr: number[];
      pArr: number[];
      lpXArr: number[];
      lpYArr: number[];
      lpZArr: number[];
    }
  ): void {
    const ts = arrays.tsArr[i] ?? 0;
    if (!ts) return;
    this.sprintState.noteTimestamp(ts);

    const prevTs = this.prevTs;
    const dtMs = prevTs !== null && ts > prevTs ? ts - prevTs : 0;
    const dtSeconds = dtMs / 1000;

    const accFilt = arrays.accFiltArr[i] ?? 0;
    const v = arrays.vArr[i] ?? 0;
    const p = arrays.pArr[i] ?? 0;

    this.sprintState.addDistance(v, dtSeconds);

    const sprintSnapshot = this.sprintState.snapshot();

    const jerk = computeJerk({
      currentAccFilt: accFilt,
      prevAccFilt: this.prevAccFilt,
      dtSeconds,
    });
    this.driveDetector.trackJerk(jerk);

    // Maintain rolling LP buffer before drive detection so the peak sample is included
    this.stepFeatureWindow.add({
      ts,
      x: arrays.lpXArr[i] ?? 0,
      y: arrays.lpYArr[i] ?? 0,
      z: arrays.lpZArr[i] ?? 0,
    });

    const drive = this.driveDetector.detectDrive({
      jerk,
      ts,
      prevTs,
      prevJerk: this.prevJerk,
      prevAccFilt: this.prevAccFilt,
      startedAt: sprintSnapshot.startedAt,
      distanceFromStartM: sprintSnapshot.distanceM,
      nextIndex: this.driveEvents.length + 1,
      computeFeatures: (peakTs) =>
        this.stepFeatureWindow.computeFeatures(peakTs),
    });

    if (drive) {
      this._applyGaitPrediction(drive);
      this.driveEvents.push(drive);
      this.lastDriveTs = drive.timestamp;
      if (this.driveEvents.length > this.config.maxDriveEvents) {
        this.driveEvents.shift();
      }
    }

    // Track peak velocity and peak power (with drives-to-peak)
    const timeFromStartMs =
      sprintSnapshot.startedAt !== null
        ? Math.max(0, ts - sprintSnapshot.startedAt)
        : 0;
    const drivesSoFar = this.driveEvents.length;

    this.peakVelocity = updatePeakMarker({
      current: this.peakVelocity,
      value: v,
      timestamp: ts,
      timeFromStartMs,
      drivesSoFar,
      distanceFromStartM: sprintSnapshot.distanceM,
    });
    this.peakPower = updatePeakMarker({
      current: this.peakPower,
      value: p,
      timestamp: ts,
      timeFromStartMs,
      drivesSoFar,
      distanceFromStartM: sprintSnapshot.distanceM,
    });

    this.prevTs = ts;
    this.prevAccFilt = accFilt;
    this.prevJerk = jerk;
  }

  private _buildSummary(): SprintSummary {
    const sprintSnapshot = this.sprintState.snapshot();
    return this.summaryBuilder({
      startedAt: sprintSnapshot.startedAt,
      endedAt: sprintSnapshot.endedAt,
      distanceM: sprintSnapshot.distanceM,
      driveEvents: this.driveEvents,
      peakVelocity: this.peakVelocity,
      peakPower: this.peakPower,
    });
  }

  private _applyGaitPrediction(drive: DriveEvent): void {
    if (!this.gaitModel || this.lastDriveTs === null) {
      return;
    }

    const stepIntervalMs = drive.timestamp - this.lastDriveTs;
    if (stepIntervalMs <= 0) {
      return;
    }

    const predictedSpeedMs = this.gaitModel.predict(1000 / stepIntervalMs);
    if (predictedSpeedMs !== null) {
      drive.gaitPredictedSpeedMs = predictedSpeedMs;
    }
  }

  private emit(): void {
    this.state$.next({
      status: this.sprintState.getStatus(),
      summary: this._buildSummary(),
      driveEvents: [...this.driveEvents],
    });
  }
}
