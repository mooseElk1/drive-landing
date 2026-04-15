import { type DeviceMotionMeasurement } from 'expo-sensors';

import { Constants } from '@/constants';
import { AccelerationCalculationService } from '@/features/workout/services/acceleration-calculation-service';
import { PowerCalculationService } from '@/features/workout/services/power-calculation-service';
import { VelocityCalculationService } from '@/features/workout/services/velocity-calculation-service';
import { type CalculationServiceConfig } from '@/types/calculation-configs';
import { type ICalculations } from '@/types/calculations';
import { ProcessedSensorData } from '@/types/processed-sensor-data';
import { type ISensorsService } from '@/types/sensors-service';

/**
 * Orchestrates the sensor data processing pipeline.
 *
 * Follows DIP: the pipeline is injected rather than hardcoded, making it easy
 * to swap or extend individual calculation stages without touching this class.
 *
 * Default pipeline order: Acceleration → Velocity
 * Power runs after the pipeline as a separate stage (it exposes additional
 * control methods like setMass / getMass).
 */
export class CalculationService {
  private readonly sensorsService: ISensorsService;
  private readonly pipeline: ICalculations[];
  private readonly powerService: PowerCalculationService;
  private readonly accelService: AccelerationCalculationService | null;
  private readonly velocityService: VelocityCalculationService | null;

  private config: Readonly<CalculationServiceConfig>;
  serviceData = new ProcessedSensorData();
  callback: ((data: ProcessedSensorData) => void) | undefined = undefined;

  constructor(
    sensorsService: ISensorsService,
    pipeline?: ICalculations[],
    powerService?: PowerCalculationService
  ) {
    this.config = { mass: Constants.Sled.defaultMassKg };
    this.sensorsService = sensorsService;
    this.powerService =
      powerService ?? new PowerCalculationService({ mass: this.config.mass });
    if (pipeline) {
      this.pipeline = pipeline;
      this.accelService = null;
      this.velocityService = null;
    } else {
      this.accelService = new AccelerationCalculationService();
      this.velocityService = new VelocityCalculationService();
      this.pipeline = [this.accelService, this.velocityService];
    }
    this.sensorsService.subscribe((data) => this.processData(data));
  }

  private processData(data: DeviceMotionMeasurement): void {
    this.serviceData = new ProcessedSensorData(data);
    for (const stage of this.pipeline) {
      stage.calculate(this.serviceData);
    }
    this.powerService.calculate(this.serviceData);

    this.callback?.(this.serviceData);
  }

  subscribe(callback: (data: ProcessedSensorData) => void): void {
    this.callback = callback;
  }

  /**
   * Update runtime configuration and propagate to sub-services.
   * Only the fields present in `config` are changed; others retain their current values.
   */
  updateConfig(config: Partial<CalculationServiceConfig>): void {
    this.config = { ...this.config, ...config };
    if (config.mass !== undefined) {
      this.powerService.setMass(config.mass);
    }
    if (config.acceleration !== undefined && this.accelService) {
      this.accelService.updateConfig(config.acceleration);
    }
    if (
      (config.velocity !== undefined ||
        config.integrationAccelSource !== undefined) &&
      this.velocityService
    ) {
      if (config.velocity !== undefined) {
        this.velocityService.updateConfig(config.velocity);
      }
    }
    if (config.integrationAccelSource !== undefined && this.velocityService) {
      this.velocityService.updateConfig({
        integrationAccelSource: config.integrationAccelSource,
      });
    }
  }

  /** Convenience wrapper kept for backward compatibility with existing hook usage. */
  setSledMass(mass: number): void {
    this.updateConfig({ mass });
  }

  getSledMass(): number {
    return this.config.mass;
  }
}
