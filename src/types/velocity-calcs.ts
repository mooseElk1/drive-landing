export interface VelocityConfig {
  readonly dt: number;
  readonly velLeak: number;
  readonly integrationAccelSource?: 'raw' | 'lp' | 'hp';
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
