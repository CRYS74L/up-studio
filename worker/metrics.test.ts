import { describe, expect, it } from 'vitest';
import { derivedMetrics, safeRatio } from './metrics';

describe('derived metrics', () => {
  it('does not turn missing or zero denominators into zero', () => {
    expect(safeRatio(2, 0)).toBeNull();
    expect(safeRatio(null, 10)).toBeNull();
  });
  it('calculates interaction, conversion and watch hours', () => {
    expect(derivedMetrics({ views: 100, likes: 5, coins: 2, favorites: 1, comments: 1, shares: 1, followers: 2, avgWatchSeconds: 36 }))
      .toEqual({ interactionRate: 0.1, followerConversion: 0.02, watchHours: 1 });
  });
});
