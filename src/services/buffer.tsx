import { Subject } from 'rxjs';

import { type CalculationService } from '@/features/workout/services/calculation-service';
import { ProcessedSensorData } from '@/types/processed-sensor-data';

export class BufferService {
  private buffer: ProcessedSensorData = new ProcessedSensorData();
  private bufferSize: number;
  private flushSubject: Subject<ProcessedSensorData> = new Subject();

  constructor(calcService: CalculationService, bufferSize: number) {
    this.bufferSize = bufferSize;
    calcService.subscribe((data) => this.add(data));
  }

  add(data: ProcessedSensorData): void {
    this.buffer.addData(data);

    this.flush();
  }

  private flush(): void {
    if (
      Object.values(this.buffer.channels).some(
        (channelBuffer) => channelBuffer.length >= this.bufferSize
      )
    ) {
      this.flushSubject.next(this.buffer);
      this.buffer = new ProcessedSensorData();
    }
  }

  getFlushedData(): Subject<ProcessedSensorData> {
    return this.flushSubject;
  }
}
