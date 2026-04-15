import React from 'react';

import { ChartZones } from './chart-zones';

/**
 * Example usage of the ChartZones component
 */
export function ChartZonesExample() {
  // Mock scale function
  const yScale = (value: number) => 200 - value * 2;

  return (
    <>
      {/* Velocity Chart Zones */}
      <ChartZones
        innerWidth={300}
        yScale={yScale}
        peakValue={8.5}
        showPeakLine={true}
        mode="velocity"
        zonePercentages={[90, 80, 70, 60, 50]}
        peakLineColor="orange"
        zoneLineColor="rgba(255, 165, 0, 0.7)"
        zoneTextColor="rgba(255, 165, 0, 0.8)"
      />

      {/* Power Chart Zones */}
      <ChartZones
        innerWidth={300}
        yScale={yScale}
        peakValue={250}
        showPeakLine={true}
        mode="power"
        zonePercentages={[90, 80, 70, 60, 50]}
        peakLineColor="green"
        zoneLineColor="rgba(34, 197, 94, 0.7)"
        zoneTextColor="rgba(34, 197, 94, 0.8)"
      />

      {/* Custom Zone Percentages */}
      <ChartZones
        innerWidth={300}
        yScale={yScale}
        peakValue={6.2}
        showPeakLine={true}
        mode="velocity"
        zonePercentages={[95, 85, 75, 65]}
        peakLineColor="blue"
        zoneLineColor="rgba(59, 130, 246, 0.7)"
        zoneTextColor="rgba(59, 130, 246, 0.8)"
      />
    </>
  );
}

/**
 * How the ChartZones component works:
 *
 * 1. **Reusable Design**: The same component works for both velocity and power charts
 * 2. **Mode-based Display**:
 *    - Velocity mode: Shows "Peak" label with m/s units
 *    - Power mode: Shows "Max" label with W units
 * 3. **Customizable Zones**:
 *    - Default zones: 90%, 80%, 70%, 60%, 50% of peak value
 *    - Custom percentages can be passed as props
 * 4. **Customizable Colors**:
 *    - Peak line color
 *    - Zone line colors
 *    - Zone text colors
 * 5. **Conditional Rendering**:
 *    - Only renders when showPeakLine is true
 *    - Only renders when peakValue > 0
 *
 * Integration with AccelerometerChart:
 * - The chart automatically passes the correct mode and peak value
 * - Zones are calculated as percentages of the peak value
 * - Both velocity and power charts get the same zone functionality
 */
