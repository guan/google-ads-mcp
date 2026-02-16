/**
 * Comparison Utility Functions
 *
 * Utilities for comparing metrics between two time periods.
 * Supports delta calculation, change classification, and formatting.
 */

export type ChangeDirection = 'up' | 'down' | 'unchanged';

export type ChangeClassification =
  | 'significant improvement'
  | 'minor improvement'
  | 'unchanged'
  | 'minor decline'
  | 'significant decline';

export type MetricType = 'higher-is-better' | 'lower-is-better' | 'neutral';

export interface Delta {
  absolute: number;
  percent: number;
  direction: ChangeDirection;
}

export interface MetricComparison {
  metricName: string;
  current: number;
  previous: number;
  delta: Delta;
  classification: ChangeClassification;
}

/**
 * Calculate delta between current and previous values
 */
export function calculateDelta(current: number, previous: number): Delta {
  const absolute = current - previous;

  let percent: number;
  if (previous === 0 && current === 0) {
    percent = 0;
  } else if (previous === 0) {
    percent = current > 0 ? Infinity : -Infinity;
  } else {
    percent = ((current - previous) / previous) * 100;
  }

  let direction: ChangeDirection;
  if (absolute > 0) direction = 'up';
  else if (absolute < 0) direction = 'down';
  else direction = 'unchanged';

  return { absolute, percent, direction };
}

/**
 * Get metric type for classification
 */
export function getMetricType(metricName: string): MetricType {
  const lower = metricName.toLowerCase();

  const higherIsBetter = ['ctr', 'roas', 'conversions', 'clicks', 'impressions', 'conversion_rate'];
  if (higherIsBetter.some((m) => lower.includes(m))) return 'higher-is-better';

  const lowerIsBetter = ['cpc', 'cpm', 'cost_per', 'avg_cpc', 'avg_cpm'];
  if (lowerIsBetter.some((m) => lower.includes(m))) return 'lower-is-better';

  return 'neutral';
}

/**
 * Classify change significance
 */
export function classifyChange(percentChange: number, metricType: MetricType): ChangeClassification {
  if (percentChange === Infinity) {
    return metricType === 'lower-is-better' ? 'significant decline' : 'significant improvement';
  }
  if (percentChange === -Infinity) {
    return metricType === 'lower-is-better' ? 'significant improvement' : 'significant decline';
  }

  const abs = Math.abs(percentChange);

  if (metricType === 'higher-is-better') {
    if (percentChange >= 10) return 'significant improvement';
    if (percentChange >= 5) return 'minor improvement';
    if (percentChange <= -10) return 'significant decline';
    if (percentChange <= -5) return 'minor decline';
    return 'unchanged';
  }

  if (metricType === 'lower-is-better') {
    if (percentChange <= -10) return 'significant improvement';
    if (percentChange <= -5) return 'minor improvement';
    if (percentChange >= 10) return 'significant decline';
    if (percentChange >= 5) return 'minor decline';
    return 'unchanged';
  }

  // Neutral
  if (abs >= 10) return percentChange > 0 ? 'significant improvement' : 'significant decline';
  if (abs >= 5) return percentChange > 0 ? 'minor improvement' : 'minor decline';
  return 'unchanged';
}

/**
 * Compare two metric sets
 */
export function compareMetricSets(
  current: Record<string, number>,
  previous: Record<string, number>
): MetricComparison[] {
  const comparisons: MetricComparison[] = [];
  const commonKeys = Object.keys(current).filter((key) => key in previous);

  for (const metricName of commonKeys) {
    const delta = calculateDelta(current[metricName], previous[metricName]);
    const metricType = getMetricType(metricName);
    const classification = classifyChange(delta.percent, metricType);

    comparisons.push({
      metricName,
      current: current[metricName],
      previous: previous[metricName],
      delta,
      classification,
    });
  }

  comparisons.sort((a, b) => {
    const absA = Math.abs(a.delta.percent === Infinity ? 999999 : a.delta.percent);
    const absB = Math.abs(b.delta.percent === Infinity ? 999999 : b.delta.percent);
    return absB - absA;
  });

  return comparisons;
}

/**
 * Format percent change with sign
 */
export function formatPercentChange(percentChange: number): string {
  if (percentChange === Infinity) return '+∞%';
  if (percentChange === -Infinity) return '-∞%';
  if (isNaN(percentChange)) return '0.0%';
  const sign = percentChange >= 0 ? '+' : '';
  return `${sign}${percentChange.toFixed(1)}%`;
}
