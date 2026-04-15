import { computeTimeWindow } from '@/lib/chart-time';

describe('chart-time.computeTimeWindow', () => {
  test('empty timestamps yields default 10s window', () => {
    const res = computeTimeWindow([]);
    expect(res.firstTimestamp).toBe(0);
    expect(res.lastTimestamp).toBe(10);
    expect(res.elapsedSeconds).toBeCloseTo(10, 6);
    expect(res.xDomainStart).toBeCloseTo(0, 6);
    expect(res.xDomainEnd).toBeCloseTo(10, 6);
  });

  test('timestamps ~10ms apart produce elapsed 0.01s and x-domain anchored to latest', () => {
    const res = computeTimeWindow([1, 1.01]);
    expect(res.firstTimestamp).toBe(1);
    expect(res.lastTimestamp).toBe(1.01);
    expect(res.elapsedSeconds).toBeCloseTo(0.01, 6);
    expect(res.xDomainEnd).toBeCloseTo(10, 6);
    expect(res.xDomainStart).toBeCloseTo(0, 6);
  });
});

describe('chart-time.calculateXDomain', () => {
  test('x-domain never starts negative', () => {
    const res = computeTimeWindow([5], 10);
    expect(res.xDomainStart).toBe(0);
    expect(res.xDomainEnd).toBe(10);
  });

  test('x-domain is anchored to last timestamp when last > window', () => {
    const res = computeTimeWindow([20], 10);
    expect(res.xDomainStart).toBe(10);
    expect(res.xDomainEnd).toBe(20);
  });

  test('x-domain is the last ten seconds when the timestamps are longer than the window', () => {
    const res = computeTimeWindow([50, 60, 70, 80, 90, 100], 10);
    expect(res.xDomainStart).toBe(90);
    expect(res.xDomainEnd).toBe(100);
  });
});
