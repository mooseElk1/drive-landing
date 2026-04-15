import { MovingAverage } from '@/lib';

describe('MovingAverage', () => {
  test('returns correct averages while filling the window', () => {
    const ma = new MovingAverage(3);
    expect(ma.add(2)).toBeCloseTo(2);
    expect(ma.add(4)).toBeCloseTo((2 + 4) / 2);
    // third add should produce average 3
    expect(ma.add(3)).toBeCloseTo((2 + 4 + 3) / 3);
  });

  test('maintains correct average when window is full (circular buffer)', () => {
    const ma = new MovingAverage(3);
    expect(ma.add(1)).toBeCloseTo(1);
    expect(ma.add(2)).toBeCloseTo((1 + 2) / 2);
    expect(ma.add(3)).toBeCloseTo((1 + 2 + 3) / 3); // window full -> average 2

    // Replace oldest (1) with 6 -> window now [6,2,3] average = 11/3
    expect(ma.add(6)).toBeCloseTo((6 + 2 + 3) / 3);
  });

  test('recreating instance acts like reset', () => {
    const ma1 = new MovingAverage(2);
    expect(ma1.add(10)).toBeCloseTo(10);
    expect(ma1.add(20)).toBeCloseTo((10 + 20) / 2);

    const ma2 = new MovingAverage(2);
    // new instance should start fresh
    expect(ma2.add(5)).toBeCloseTo(5);
  });

  test('throws on invalid constructor parameter', () => {
    // @ts-ignore - intentionally passing bad args to assert runtime errors
    expect(() => new MovingAverage(0)).toThrow();
    // @ts-ignore - intentionally passing bad args to assert runtime errors
    expect(() => new MovingAverage(-1)).toThrow();
    // @ts-ignore - intentionally passing bad args to assert runtime errors
    expect(() => new MovingAverage(1.5)).toThrow();
  });

  test('throws when adding non-number', () => {
    const ma = new MovingAverage(2);
    // @ts-ignore - intentionally passing bad args to assert runtime errors
    expect(() => ma.add(NaN)).toThrow();
    // @ts-ignore - intentionally passing bad args to assert runtime errors
    expect(() => ma.add(undefined)).toThrow();
  });
});
