import { type SprintStatus } from '@/features/workout/types/sprint-analysis';

export interface SprintStateSnapshot {
  status: SprintStatus;
  startedAt: number | null;
  endedAt: number | null;
  distanceM: number;
}

export class SprintStateManager {
  private status: SprintStatus = 'idle';
  private startedAt: number | null = null;
  private endedAt: number | null = null;
  private distanceM = 0;

  reset(): void {
    this.status = 'idle';
    this.startedAt = null;
    this.endedAt = null;
    this.distanceM = 0;
  }

  startRecording(): void {
    this.status = 'recording';
    this.startedAt = null;
    this.endedAt = null;
    this.distanceM = 0;
  }

  stopRecording(): void {
    if (this.status !== 'recording') {
      return;
    }
    this.status = 'stopped';
  }

  isRecording(): boolean {
    return this.status === 'recording';
  }

  getStatus(): SprintStatus {
    return this.status;
  }

  noteTimestamp(ts: number): void {
    if (this.startedAt === null) {
      this.startedAt = ts;
    }
    this.endedAt = ts;
  }

  addDistance(velocityMps: number, dtSeconds: number): void {
    if (dtSeconds <= 0) {
      return;
    }
    this.distanceM += velocityMps * dtSeconds;
  }

  snapshot(): SprintStateSnapshot {
    return {
      status: this.status,
      startedAt: this.startedAt,
      endedAt: this.endedAt,
      distanceM: this.distanceM,
    };
  }
}
