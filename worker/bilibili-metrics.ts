type NumericRecord = Record<string, unknown>;

type MetricInput = {
  durationSeconds: number | null | undefined;
  compare?: NumericRecord | null;
  diagnose?: NumericRecord | null;
  overview?: {
    stat?: NumericRecord | null;
    audience_proportion?: { fans?: number | null; guest?: number | null } | null;
  } | null;
};

const fromBasisPoints = (value: number | null | undefined) => value == null ? null : value / 100;
const numeric = (value: unknown) => typeof value === 'number' && Number.isFinite(value) ? value : null;

export function bilibiliDataUrl(path: string, timestamp = Date.now()) {
  const url = new URL(path, 'https://member.bilibili.com');
  if (/\/x\/web\/data\/(archive_diagnose\/compare|archive\/index)$/.test(url.pathname) && !url.searchParams.has('tmid')) url.searchParams.set('tmid', '');
  url.searchParams.set('t', String(timestamp));
  return url.toString();
}

export function deriveBilibiliMetrics(input: MetricInput) {
  const compare = input.compare ?? {};
  const diagnose = input.diagnose ?? {};
  const overview = input.overview ?? {};
  const stat = overview.stat ?? {};
  const totalDuration = Number(numeric(stat.total_duration)) > 0
    ? Number(numeric(stat.total_duration))
    : Number(input.durationSeconds) > 0 ? Number(input.durationSeconds) : null;
  const reportedAverage = Number(numeric(stat.play_avg_duration)) > 0 ? Number(numeric(stat.play_avg_duration)) : null;
  const avgWatchPercent = reportedAverage != null && totalDuration
    ? reportedAverage / totalDuration * 100
    : fromBasisPoints(numeric(compare.full_play_ratio));
  const avgWatchSeconds = reportedAverage ?? (avgWatchPercent != null && totalDuration
    ? avgWatchPercent / 100 * totalDuration
    : null);
  const fanCount = overview.audience_proportion?.fans ?? null;
  const guestCount = overview.audience_proportion?.guest ?? null;
  const countTotal = fanCount != null && guestCount != null ? fanCount + guestCount : null;
  const obfuscatedCoverRate = numeric(compare.tm_rate);
  const obfuscatedCoverMedian = numeric(compare.tm_rate_med);

  return {
    coverCtr: null,
    coverAttractionScore: numeric(compare.tm_star) == null ? null : numeric(compare.tm_star)! / 10,
    coverAttractionIndex: obfuscatedCoverRate != null && obfuscatedCoverMedian != null && obfuscatedCoverMedian > 0
      ? obfuscatedCoverRate / obfuscatedCoverMedian
      : null,
    avgWatchPercent,
    avgWatchSeconds,
    fanAudiencePercent: fromBasisPoints(numeric(compare.play_fan_rate)),
    guestAudiencePercent: fromBasisPoints(numeric(compare.play_viewer_rate)),
    metrics: {
      coverCtrObfuscatedSample: fromBasisPoints(obfuscatedCoverRate),
      coverCtrDiagnoseObfuscatedSample: fromBasisPoints(numeric(diagnose.tm_rate)),
      audienceCountFanShare: countTotal ? fanCount! / countTotal * 100 : null,
      audienceCountGuestShare: countTotal ? guestCount! / countTotal * 100 : null,
    },
  };
}
