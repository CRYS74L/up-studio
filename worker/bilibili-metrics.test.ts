import { describe, expect, it } from 'vitest';
import { bilibiliDataUrl, deriveBilibiliMetrics } from './bilibili-metrics';

describe('Bilibili metric reconciliation', () => {
  it('matches Creator Center cache-busting semantics while preserving query parameters', () => {
    expect(bilibiliDataUrl('/x/web/data/archive_diagnose/compare?size=10', 1787641323448)).toBe(
      'https://member.bilibili.com/x/web/data/archive_diagnose/compare?size=10&tmid=&t=1787641323448',
    );
  });

  it('uses the creator-center comparison window instead of a volatile diagnose sample', () => {
    const result = deriveBilibiliMetrics({
      durationSeconds: 94,
      compare: {
        play: 8316,
        tm_rate: 136,
        tm_rate_med: 101,
        tm_star: 29,
        full_play_ratio: 4487,
        play_fan_rate: 533,
        play_viewer_rate: 9393,
        crash_rate: 3402,
        interact_rate: 1584,
        play_trans_fan_rate: 42,
      },
      diagnose: {
        tm_rate: 57,
        crash_rate: 3402,
        interact_rate: 1584,
        play_trans_fan_rate: 42,
      },
      overview: {
        stat: { play: 8316, play_avg_duration: 0, total_duration: 0 },
        audience_proportion: { fans: 505, guest: 7803 },
      },
    });

    expect(result.coverCtr).toBeNull();
    expect(result.coverAttractionScore).toBe(2.9);
    expect(result.coverAttractionIndex).toBeCloseTo(1.3465, 4);
    expect(result.avgWatchPercent).toBe(44.87);
    expect(result.avgWatchSeconds).toBeCloseTo(42.1778, 4);
    expect(result.fanAudiencePercent).toBe(5.33);
    expect(result.guestAudiencePercent).toBe(93.93);
    expect(result.metrics.coverCtrObfuscatedSample).toBe(1.36);
    expect(result.metrics.coverCtrDiagnoseObfuscatedSample).toBe(0.57);
    expect(result.metrics.audienceCountFanShare).toBeCloseTo(6.0785, 4);
  });

  it('keeps missing creator-center ratios missing instead of substituting another denominator', () => {
    const result = deriveBilibiliMetrics({
      durationSeconds: 120,
      compare: { play: 10, full_play_ratio: 5000 },
      diagnose: {},
      overview: {
        stat: { play: 10, play_avg_duration: 0, total_duration: 0 },
        audience_proportion: { fans: 2, guest: 8 },
      },
    });

    expect(result.coverCtr).toBeNull();
    expect(result.fanAudiencePercent).toBeNull();
    expect(result.guestAudiencePercent).toBeNull();
  });
});
