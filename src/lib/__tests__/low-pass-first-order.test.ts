import { LowPassFirstOrder } from '@/lib/low-pass-first-order';

function measureGain(args: {
  cutoffHz: number;
  signalHz: number;
  sampleRateHz: number;
  durationSeconds: number;
  settleSeconds: number;
}): number {
  const { cutoffHz, signalHz, sampleRateHz, durationSeconds, settleSeconds } =
    args;
  const dt = 1 / sampleRateHz;
  const filter = new LowPassFirstOrder(cutoffHz, dt);
  const totalSamples = Math.floor(durationSeconds * sampleRateHz);
  const settleSamples = Math.floor(settleSeconds * sampleRateHz);

  const input: number[] = [];
  const output: number[] = [];

  for (let index = 0; index < totalSamples; index += 1) {
    const time = index * dt;
    const sample = Math.sin(2 * Math.PI * signalHz * time);
    const filtered = filter.add(sample);

    if (index >= settleSamples) {
      input.push(sample);
      output.push(filtered);
    }
  }

  const rms = (values: number[]) =>
    Math.sqrt(
      values.reduce((sum, value) => sum + value * value, 0) / values.length
    );

  return rms(output) / rms(input);
}

describe('LowPassFirstOrder', () => {
  it('computes alpha from cutoff frequency and sample period', () => {
    const cutoffHz = 5;
    const dt = 0.02;
    const rc = 1 / (2 * Math.PI * cutoffHz);
    const expectedAlpha = dt / (rc + dt);

    const filter = new LowPassFirstOrder(cutoffHz, dt);

    expect(filter.add(1)).toBeCloseTo(expectedAlpha, 10);
  });

  it('passes DC input through to the steady-state output', () => {
    const filter = new LowPassFirstOrder(10, 0.01);
    let output = 0;

    for (let index = 0; index < 500; index += 1) {
      output = filter.add(3.5);
    }

    expect(output).toBeCloseTo(3.5, 4);
  });

  it('attenuates signals below cutoff by less than 3 dB', () => {
    const gain = measureGain({
      cutoffHz: 5,
      signalHz: 1,
      sampleRateHz: 500,
      durationSeconds: 8,
      settleSeconds: 2,
    });

    expect(gain).toBeGreaterThan(1 / Math.sqrt(2));
  });

  it('attenuates signals above cutoff by more than 3 dB', () => {
    const gain = measureGain({
      cutoffHz: 5,
      signalHz: 20,
      sampleRateHz: 500,
      durationSeconds: 8,
      settleSeconds: 2,
    });

    expect(gain).toBeLessThan(1 / Math.sqrt(2));
  });
});
