export const CHANNELS = {
  // Sensor channels
  ACCEL_X: 'accx',
  ACCEL_Y: 'accy',
  ACCEL_Z: 'accz',
  ACCEL_X_GRAV: 'accx_grav',
  ACCEL_Y_GRAV: 'accy_grav',
  ACCEL_Z_GRAV: 'accz_grav',
  GYRO_X: 'gyrox',
  GYRO_Y: 'gyroy',
  GYRO_Z: 'gyroz',
  MAG_X: 'magx',
  MAG_Y: 'magy',
  MAG_Z: 'magz',
  ROTATION_A: 'rota', // alpha
  ROTATION_B: 'rotb', // beta
  ROTATION_G: 'rotg', // gamma
  BAROMETER: 'barometer',
  ORIENTATION: 'orientation', // Screen orientation in degrees

  // Calculated channels
  ACCEL_MAGNITUDE: 'acc_mag',
  ACCEL_MAGNITUDE_FILTERED: 'acc_mag_filt',
  GYRO_MAGNITUDE: 'gyroscopeMagnitude',

  // Rotated acceleration (device to world coordinates)
  ACCEL_X_ROTATED: 'accx_rotated',
  ACCEL_Y_ROTATED: 'accy_rotated',
  ACCEL_Z_ROTATED: 'accz_rotated',

  // ZUPT (Zero-velocity Update) rest state: 1 = at rest, 0 = moving
  ZUPT_STATUS: 'zupt_status',

  // Per-axis bias estimate (EMA updated during ZUPT rest periods)
  ACCEL_X_BIAS: 'accx_bias',
  ACCEL_Y_BIAS: 'accy_bias',
  ACCEL_Z_BIAS: 'accz_bias',

  // Output acceleration: rotated, bias-optionally-removed (no filtering)
  ACCEL_X_OUTPUT: 'accx_output',
  ACCEL_Y_OUTPUT: 'accy_output',
  ACCEL_Z_OUTPUT: 'accz_output',
  ACCEL_MAGNITUDE_OUTPUT: 'acc_mag_output',

  // Filtered output acceleration: smoother + HPF applied to output
  ACCEL_X_OUTPUT_FILTERED: 'accx_output_filt',
  ACCEL_Y_OUTPUT_FILTERED: 'accy_output_filt',
  ACCEL_Z_OUTPUT_FILTERED: 'accz_output_filt',
  ACCEL_MAGNITUDE_OUTPUT_FILTERED: 'acc_mag_output_filt',

  // Low-pass filtered output acceleration: 17.5 Hz branch for drive features
  ACCEL_X_LP: 'accx_lp',
  ACCEL_Y_LP: 'accy_lp',
  ACCEL_Z_LP: 'accz_lp',
  ACCEL_MAGNITUDE_LP: 'acc_mag_lp',

  // Low-pass filtered output acceleration: 3 Hz branch for velocity integration only
  ACCEL_X_VEL_LP: 'accx_vel_lp',
  ACCEL_Y_VEL_LP: 'accy_vel_lp',
  ACCEL_Z_VEL_LP: 'accz_vel_lp',
  ACCEL_MAGNITUDE_VEL_LP: 'acc_mag_vel_lp',

  VELOCITY_X: 'velocity_x',
  VELOCITY_Y: 'velocity_y',
  VELOCITY_Z: 'velocity_z',
  VELOCITY_MAGNITUDE: 'velocity_magnitude',
  // FSM state for velocity: 0 = NotMoving, 1 = Moving
  VELOCITY_STATE: 'velocity_state',

  POWER_X: 'power_x',
  POWER_Y: 'power_y',
  POWER_Z: 'power_z',
  POWER_MAGNITUDE: 'power_magnitude',
  POWER_INSTANTANEOUS: 'power_instantaneous',
  POWER_AVERAGE: 'power_average',

  // Timestamps
  DT: 'dt',
  TIME: 'time',
  TIMESTAMP: 'timestamp',
  TIMESTAMP_ACCEL: 'timestamp_accel',
  TIMESTAMP_GYRO: 'timestamp_gyro',
  TIMESTAMP_ROTATION: 'timestamp_rotation',
} as const;

export type ChannelKey = keyof typeof CHANNELS;
export type ChannelValue = (typeof CHANNELS)[ChannelKey];

// Helper for type-safe channel access
export function getChannelValue(key: ChannelKey): ChannelValue {
  return CHANNELS[key];
}
