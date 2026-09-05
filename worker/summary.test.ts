import { describe, expect, it } from 'vitest';
import { buildSummaryComparison, monthAgoReference } from './summary';

describe('one complete month before the current snapshot', () => {
  it('uses the matching date one month ago, not calendar month end', () => {
    expect(monthAgoReference('2026-09-05T00:00:00.000Z')).toEqual({ start: '2026-08-04T16:00:00.000Z', end: '2026-08-05T00:00:00.000Z', label: '2026年8月5日' });
  });
  it('handles year rollover at local midnight', () => {
    expect(monthAgoReference('2025-12-31T16:00:00.000Z')).toEqual({ start: '2025-11-30T16:00:00.000Z', end: '2025-11-30T16:00:00.000Z', label: '2025年12月1日' });
  });
  it('handles leap February', () => {
    expect(monthAgoReference('2024-03-31T02:00:00.000Z')).toEqual({ start: '2024-02-28T16:00:00.000Z', end: '2024-02-29T02:00:00.000Z', label: '2024年2月29日' });
  });
});

describe('summary comparison', () => {
  it('reports honest value, percent, and percentage-point deltas', () => {
    const result = buildSummaryComparison(
      {
        views: 120,
        followers: 24,
        cover_ctr: 3.2,
        avg_watch_percent: 42,
        avg_watch_seconds: 75,
        interaction_rate: 12,
      },
      {
        views: 100,
        followers: 20,
        cover_ctr: 3,
        avg_watch_percent: 50,
        avg_watch_seconds: 60,
        interaction_rate: 10,
      },
    );

    expect(result.views).toEqual({ current: 120, previous: 100, delta: 20, changePercent: 20, direction: 'up', deltaKind: 'percent' });
    expect(result.cover_ctr).toEqual({ current: 3.2, previous: 3, delta: 0.2, changePercent: null, direction: 'up', deltaKind: 'pp' });
    expect(result.avg_watch_percent).toEqual({ current: 42, previous: 50, delta: -8, changePercent: null, direction: 'down', deltaKind: 'pp' });
    expect(result.avg_watch_seconds?.changePercent).toBe(25);
  });

  it('does not invent a comparison when the prior value is missing or zero', () => {
    const result = buildSummaryComparison(
      { views: 120, followers: 0, cover_ctr: 3.2 },
      { views: null, followers: 0, cover_ctr: null },
    );

    expect(result.views).toBeNull();
    expect(result.followers).toEqual({ current: 0, previous: 0, delta: 0, changePercent: null, direction: 'flat', deltaKind: 'percent' });
    expect(result.cover_ctr).toBeNull();
  });
});
