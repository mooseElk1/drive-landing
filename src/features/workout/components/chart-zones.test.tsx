import { render } from '@testing-library/react-native';
import React from 'react';

import { ChartZones } from './chart-zones';

// Mock react-native-svg
jest.mock('react-native-svg', () => ({
  G: 'G',
  Line: 'Line',
  Text: 'Text',
}));

describe('ChartZones', () => {
  const mockProps = {
    innerWidth: 300,
    yScale: (value: number) => 200 - value * 2, // Simple mock scale
    peakValue: 10,
    showPeakLine: true,
    mode: 'velocity' as const,
  };

  it('renders nothing when showPeakLine is false', () => {
    const { toJSON } = render(
      <ChartZones {...mockProps} showPeakLine={false} />
    );
    expect(toJSON()).toBeNull();
  });

  it('renders nothing when peakValue is 0', () => {
    const { toJSON } = render(<ChartZones {...mockProps} peakValue={0} />);
    expect(toJSON()).toBeNull();
  });

  it('renders peak line and zones for velocity mode', () => {
    const { getByText } = render(<ChartZones {...mockProps} />);

    // Should show peak line label
    expect(getByText('Peak 10.00')).toBeTruthy();
  });

  it('renders peak line and zones for power mode', () => {
    const { getByText } = render(
      <ChartZones {...mockProps} mode="power" peakValue={150} />
    );

    // Should show max line label
    expect(getByText('Max 150.0')).toBeTruthy();
  });

  it('uses custom zone percentages', () => {
    const customPercentages = [95, 85, 75];
    const { toJSON } = render(
      <ChartZones {...mockProps} zonePercentages={customPercentages} />
    );

    // Should render something
    expect(toJSON()).not.toBeNull();
  });

  it('uses custom colors', () => {
    const customColors = {
      peakLineColor: 'red',
      zoneLineColor: 'blue',
      zoneTextColor: 'green',
    };

    const { toJSON } = render(<ChartZones {...mockProps} {...customColors} />);

    expect(toJSON()).not.toBeNull();
  });
});
