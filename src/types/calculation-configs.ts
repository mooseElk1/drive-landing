/**
 * Configuration types for each calculation service.
 *
 * All properties are readonly to prevent accidental mutation after
 * construction. Services accept `Partial<XConfig>` in their constructors
 * and merge with defaults internally.
 */

import type { VelocityConfig } from './velocity-calcs';

/**
 * Configuration for AccelerationCalculationService.
 */
export interface AccelerationConfig {
  /** Whether to rotate raw accelerations to world frame via device-orientation quaternion. */
  readonly applyRotation: boolean;
  /** Whether to subtract the ZUPT-estimated bias from the output acceleration. */
  readonly removeBias: boolean;
  /** Moving-average window size for pre-smoothing before HPF and bias estimation. */
  readonly smoothWindowSize: number;
  /** High-pass filter cutoff frequency in Hz applied to the output channels. */
  readonly hpfCutoffHz: number;
  /** Sample period in seconds (must match sensor rate). */
  readonly dt: number;
  /** Accelerometer magnitude threshold for ZUPT bias-estimation detection (m/s²). */
  readonly zuptAccelThreshold: number;
  /** Gyroscope magnitude threshold for ZUPT bias-estimation detection (rad/s). */
  readonly zuptGyroThreshold: number;
  /** Minimum consecutive rest duration before ZUPT triggers (seconds). */
  readonly zuptMinTime: number;
  /** Low-pass filter cutoff frequency in Hz for the drive-feature branch (StepFeatureWindow). Default: 17.5 Hz. */
  readonly lpfCutoffHz: number;
  /** Low-pass filter cutoff frequency in Hz for the velocity-integration-only branch. Default: 3.0 Hz. */
  readonly velLpfCutoffHz: number;
  /** EMA alpha coefficient for bias update during ZUPT_ACTIVE. Default: 0.1. */
  readonly zuptBiasAlphaActive: number;
}

/**
 * Configuration for SprintAnalysisService.
 */
export interface SprintAnalysisConfig {
  /** Minimum time between consecutive drive events in milliseconds. */
  readonly refractoryMs: number;
  /** Minimum filtered acceleration peak to register as a drive event (m/s²). */
  readonly minPeakAccelMagFilt: number;
  /** Maximum number of stored drive events before oldest are discarded. */
  readonly maxDriveEvents: number;
}

/**
 * Configuration for PowerCalculationService.
 */
export interface PowerConfig {
  /** Mass of the athlete + sled in kilograms. */
  readonly mass: number;
}

/**
 * Top-level config for CalculationService.
 * Acts as a single source of truth that the orchestrator propagates
 * down to each sub-service's updateConfig method.
 */
export interface CalculationServiceConfig {
  /** Combined sled + athlete mass in kilograms (propagated to PowerCalculationService). */
  readonly mass: number;
  /** Acceleration processing config (propagated to AccelerationCalculationService). */
  readonly acceleration?: Readonly<Partial<AccelerationConfig>>;
  /** Velocity integration config overrides (propagated to VelocityCalculationService). */
  readonly velocity?: Readonly<Partial<VelocityConfig>>;
  /** Which acceleration channel to integrate for velocity: 'raw', 'lp', 'hp', or 'vel_lp'. Default 'vel_lp'. */
  readonly integrationAccelSource?: 'raw' | 'lp' | 'hp' | 'vel_lp';
}
