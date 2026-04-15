export class Constants {
  static Reducers = {
    AddData: 'ADD_DATA',
    ClearData: 'CLEAR_DATA',
    ResetVelocityData: 'RESET_VELOCITY_DATA',
    ResetChartData: 'RESET_CHART_DATA',
  };

  static Thresholds = {
    AccelerationStartMoving: 1, // m/s^2
    AccelerationStopMoving: 1.0, // m/s^2 (hysteresis stop threshold - should be <= start)
    MinSamplesBelowStop: 5, // samples below stop threshold before switching to NotMoving
  };

  static Foo = {
    dt: 0.01, // seconds
  };

  static VelocityIntegrator = {
    velLeak: 0.995, // velocity leak factor per update
  };

  static AccelerationProcessor = {
    hpfCutoffHz: 0.5, // Hz
    lpfCutoffHz: 17.5, // Hz (integration branch)
    smoothWindowSize: 5, // samples
    applyRotation: true,
    removeBias: true,
    zuptBiasAlphaActive: 0.1, // EMA α during ZUPT_ACTIVE (10× faster than legacy 0.01)
  };

  static ZuptDetector = {
    zuptAccelThreshold: 0.12, // m/s^2
    zuptGyroThreshold: 0.1, // rad/s
    zuptMinTime: 0.15, // seconds
    /** Slow EMA coefficient for bias estimation during zero-velocity periods */
    zuptBiasAlpha: 0.01,
  };

  static Timestamp = {
    /**
     * Timestamps above this value (1e10) are treated as milliseconds; at or
     * below are treated as seconds. Unix epoch in milliseconds is ~1.7e12,
     * while in seconds it is ~1.7e9.
     */
    millisecondThreshold: 1e10,
  };

  static Sled = {
    /** Default combined sled + athlete mass in kilograms. */
    defaultMassKg: 30,
  };
}
