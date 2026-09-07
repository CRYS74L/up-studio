export type SummaryValues = Record<string, number | null | undefined>;

/** Same local date/time one month ago; clamp month-end dates without rolling forward. */
export function monthAgoReference(capturedAt: string) {
  const offset = 8 * 60 * 60 * 1000;
  const local = new Date(Date.parse(capturedAt) + offset);
  const year = local.getUTCFullYear();
  const month = local.getUTCMonth();
  const day = Math.min(local.getUTCDate(), new Date(Date.UTC(year, month, 0)).getUTCDate());
  const previous = new Date(Date.UTC(year, month - 1, day));
  const target = new Date(Date.UTC(year, month - 1, day, local.getUTCHours(), local.getUTCMinutes(), local.getUTCSeconds(), local.getUTCMilliseconds()));
  return {
    start: new Date(previous.getTime() - offset).toISOString(),
    end: new Date(target.getTime() - offset).toISOString(),
    label: `${previous.getUTCFullYear()}年${previous.getUTCMonth() + 1}月${day}日`,
  };
}

export type SummaryComparisonValue = {
  current: number;
  previous: number;
  delta: number;
  changePercent: number | null;
  direction: 'up' | 'down' | 'flat';
  deltaKind: 'percent' | 'pp';
};

const percentagePointMetrics = new Set([
  'cover_ctr',
  'avg_watch_percent',
  'interaction_rate',
]);

export function buildSummaryComparison(
  current: SummaryValues,
  previous: SummaryValues,
) {
  const result: Record<string, SummaryComparisonValue | null> = {};
  for (const key of new Set([...Object.keys(current), ...Object.keys(previous)])) {
    const currentValue = current[key];
    const previousValue = previous[key];
    if (currentValue == null || previousValue == null || !Number.isFinite(currentValue) || !Number.isFinite(previousValue)) {
      result[key] = null;
      continue;
    }
    const delta = Number((currentValue - previousValue).toFixed(6));
    const deltaKind = percentagePointMetrics.has(key) ? 'pp' : 'percent';
    result[key] = {
      current: currentValue,
      previous: previousValue,
      delta,
      changePercent: deltaKind === 'percent' && previousValue !== 0
        ? Number((delta / Math.abs(previousValue) * 100).toFixed(6))
        : null,
      direction: delta > 0 ? 'up' : delta < 0 ? 'down' : 'flat',
      deltaKind,
    };
  }
  return result;
}

export function hasSharedOverviewBaseline(candidate:Record<string,SummaryComparisonValue|null>){return ['account_followers','views','avg_views','avg_interactions'].every(key=>candidate[key]!=null);}
