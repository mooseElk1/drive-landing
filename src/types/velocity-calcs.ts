export interface VelocityConfig {
  readonly dt: number;
  readonly velLeak: number;
  /** Which LP-filtered acceleration channels to integrate. Default: 'vel_lp' (3 Hz). */
  readonly integrationAccelSource?: 'raw' | 'lp' | 'hp' | 'vel_lp';
  /**
   * Velocity magnitude (m/s) that arms the sprint-direction floor.
   * Once armed, the floor zeroes velocity when the component along the sprint
   * direction drops below velFloorDirectionThreshold for velFloorMinSamples.
   */
  readonly velFloorActivationThreshold?: number;
  /** Sprint-direction component (m/s) below which the floor counts down. */
  readonly velFloorDirectionThreshold?: number;
  /** Consecutive samples below threshold before velocity is zeroed. */
  readonly velFloorMinSamples?: number;
}

export interface AccelVector {
  x: number;
  y: number;
  z: number;
}

export interface VelocityVector extends AccelVector {
  abs: number;
}

export interface VelocityLogger {
  transition(from: VelocityState, to: VelocityState, info?: string): void;
  event(message: string): void;
}

type VelocityState = 'NotMoving' | 'Moving';
