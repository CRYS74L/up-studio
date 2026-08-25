import { describe, expect, it } from 'vitest';
import {
  analysisMetricGroups,
  median,
  normalizeMetricValues,
  quadrantLabels,
} from './dashboard-model';

describe('dashboard visual model', () => {
  it('keeps nulls missing while normalizing real values onto one comparable scale', () => {
    expect(normalizeMetricValues([10, null, 20, 30])).toEqual([0, null, 50, 100]);
    expect(normalizeMetricValues([4, 4, null])).toEqual([50, 50, null]);
  });

  it('uses a stable median for even and odd sets', () => {
    expect(median([9, 1, 5])).toBe(5);
    expect(median([8, 2, 4, 6])).toBe(5);
  });

  it('defines all four matrix outcomes and a broad selectable metric catalog', () => {
    expect(quadrantLabels).toEqual([
      '低吸引力 · 高深度｜包装待优化',
      '高吸引力 · 高深度｜优质内容',
      '低吸引力 · 低深度｜整体待诊断',
      '高吸引力 · 低深度｜内容承接待优化',
    ]);
    expect(analysisMetricGroups.flatMap((group) => group.metrics).map((metric) => metric.id)).toEqual(expect.arrayContaining([
      'views',
      'cover_ctr',
      'avg_watch_seconds',
      'avg_watch_percent',
      'interactionRate',
      'playToFollowRate',
      'followers_gained',
    ]));
  });
});
