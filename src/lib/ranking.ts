/**
 * Ranking Utility Functions
 *
 * Utilities for ranking and comparing multiple entities (campaigns, ad groups, etc).
 * Supports sorting, percentile calculation, and top/bottom identification.
 */

export interface RankableEntity {
  id: string;
  name: string;
  metrics: Record<string, number>;
}

export interface RankedEntity extends RankableEntity {
  rank: number;
  percentile: number;
}

export interface MetricStats {
  min: number;
  max: number;
  mean: number;
  median: number;
  stdDev: number;
}

/**
 * Rank entities by a specific metric
 */
export function rankByMetric(
  entities: RankableEntity[],
  metricName: string,
  direction: 'asc' | 'desc' = 'desc'
): RankedEntity[] {
  const withMetric = entities.filter(
    (e) => e.metrics[metricName] !== undefined && e.metrics[metricName] !== null
  );

  const sorted = [...withMetric].sort((a, b) => {
    return direction === 'desc'
      ? b.metrics[metricName] - a.metrics[metricName]
      : a.metrics[metricName] - b.metrics[metricName];
  });

  const ranked: RankedEntity[] = [];
  let currentRank = 1;

  for (let i = 0; i < sorted.length; i++) {
    const entity = sorted[i];
    const rank = i > 0 && entity.metrics[metricName] === sorted[i - 1].metrics[metricName]
      ? ranked[i - 1].rank
      : currentRank;

    ranked.push({ ...entity, rank, percentile: 0 });
    currentRank++;
  }

  return ranked;
}

/**
 * Calculate statistical summary for a metric
 */
export function calculateMetricStats(
  entities: RankableEntity[],
  metricName: string
): MetricStats {
  const values = entities
    .filter((e) => e.metrics[metricName] !== undefined)
    .map((e) => e.metrics[metricName]);

  if (values.length === 0) {
    return { min: 0, max: 0, mean: 0, median: 0, stdDev: 0 };
  }

  const min = Math.min(...values);
  const max = Math.max(...values);
  const mean = values.reduce((a, b) => a + b, 0) / values.length;

  const sorted = [...values].sort((a, b) => a - b);
  const median = sorted.length % 2 === 0
    ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
    : sorted[Math.floor(sorted.length / 2)];

  const variance = values.reduce((acc, val) => acc + Math.pow(val - mean, 2), 0) / values.length;
  const stdDev = Math.sqrt(variance);

  return {
    min: parseFloat(min.toFixed(2)),
    max: parseFloat(max.toFixed(2)),
    mean: parseFloat(mean.toFixed(2)),
    median: parseFloat(median.toFixed(2)),
    stdDev: parseFloat(stdDev.toFixed(2)),
  };
}
