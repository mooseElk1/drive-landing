import { type DriveEvent } from '@/features/workout/types/sprint-analysis';
import { type SprintAnalysisConfig } from '@/types/calculation-configs';

type DriveDetectorConfig = Pick<
  SprintAnalysisConfig,
  'refractoryMs' | 'minPeakAccelMagFilt'
>;

export class DriveDetector {
  private readonly config: DriveDetectorConfig;
  private currentDrivePeakJerk = 0;
  private lastDriveTs: number | null = null;

  constructor(config: DriveDetectorConfig) {
    this.config = config;
  }

  reset(): void {
    this.currentDrivePeakJerk = 0;
    this.lastDriveTs = null;
  }

  trackJerk(jerk: number): void {
    if (jerk > this.currentDrivePeakJerk) {
      this.currentDrivePeakJerk = jerk;
    }
  }

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
  }): DriveEvent | null {
    const {
      jerk,
      ts,
      prevTs,
      prevJerk,
      prevAccFilt,
      startedAt,
      distanceFromStartM,
      nextIndex,
      computeFeatures,
    } = args;

    // Detect a local maximum at the previous sample when jerk crosses from + to <= 0.
    if (
      prevJerk === null ||
      prevJerk <= 0 ||
      jerk > 0 ||
      prevAccFilt === null
    ) {
      return null;
    }

    const peakAccel = prevAccFilt;
    const peakTs = prevTs ?? ts;

    const enoughGap =
      this.lastDriveTs === null ||
      peakTs - this.lastDriveTs >= this.config.refractoryMs;

    if (!enoughGap || peakAccel < this.config.minPeakAccelMagFilt) {
      return null;
    }

    const timeFromStartMs =
      startedAt !== null ? Math.max(0, peakTs - startedAt) : 0;

    const drive: DriveEvent = {
      index: nextIndex,
      timestamp: peakTs,
      timeFromStartMs,
      distanceFromStartM,
      peakAccelMagFilt: peakAccel,
      peakJerk: this.currentDrivePeakJerk,
      ...computeFeatures(peakTs),
    };

    this.lastDriveTs = peakTs;
    this.currentDrivePeakJerk = 0;

    return drive;
  }
}
