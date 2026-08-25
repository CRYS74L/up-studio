export type AnalysisVisual = 'bar' | 'area' | 'line' | 'dot';
export type AnalysisMetricDefinition = {
  id: string;
  label: string;
  unit: 'count' | 'percent' | 'seconds';
  defaultVisual: AnalysisVisual;
  tone: 'pink' | 'cyan' | 'rose' | 'neutral';
};

export const quadrantLabels = [
  '低点击 · 高深度｜包装待优化',
  '高点击 · 高深度｜优质内容',
  '低点击 · 低深度｜整体待诊断',
  '高点击 · 低深度｜内容承接待优化',
] as const;

export const analysisMetricGroups: Array<{ name: string; metrics: AnalysisMetricDefinition[] }> = [
  {
    name: '流量',
    metrics: [
      { id: 'views', label: '播放量', unit: 'count', defaultVisual: 'bar', tone: 'pink' },
      { id: 'cover_ctr', label: '封面点击率', unit: 'percent', defaultVisual: 'area', tone: 'pink' },
      { id: 'realtimePlay', label: '实时播放', unit: 'count', defaultVisual: 'line', tone: 'cyan' },
    ],
  },
  {
    name: '观看质量',
    metrics: [
      { id: 'avg_watch_seconds', label: '平均播放时长', unit: 'seconds', defaultVisual: 'line', tone: 'cyan' },
      { id: 'avg_watch_percent', label: '平均播放百分比', unit: 'percent', defaultVisual: 'area', tone: 'pink' },
      { id: 'threeSecondBounceRate', label: '3 秒跳出率', unit: 'percent', defaultVisual: 'line', tone: 'neutral' },
    ],
  },
  {
    name: '互动',
    metrics: [
      { id: 'interactionRate', label: '综合互动率', unit: 'percent', defaultVisual: 'line', tone: 'cyan' },
      { id: 'likes', label: '点赞', unit: 'count', defaultVisual: 'bar', tone: 'pink' },
      { id: 'coins', label: '投币', unit: 'count', defaultVisual: 'bar', tone: 'rose' },
      { id: 'favorites', label: '收藏', unit: 'count', defaultVisual: 'bar', tone: 'cyan' },
      { id: 'comments', label: '评论', unit: 'count', defaultVisual: 'line', tone: 'rose' },
      { id: 'danmaku', label: '弹幕', unit: 'count', defaultVisual: 'line', tone: 'neutral' },
      { id: 'shares', label: '分享', unit: 'count', defaultVisual: 'dot', tone: 'cyan' },
    ],
  },
  {
    name: '转化',
    metrics: [
      { id: 'followers_gained', label: '涨粉量', unit: 'count', defaultVisual: 'dot', tone: 'pink' },
      { id: 'playToFollowRate', label: '播转粉率', unit: 'percent', defaultVisual: 'line', tone: 'cyan' },
      { id: 'unfollows', label: '取关量', unit: 'count', defaultVisual: 'dot', tone: 'neutral' },
    ],
  },
];

export function median(values: number[]) {
  const sorted = values.filter(Number.isFinite).slice().sort((a, b) => a - b);
  if (!sorted.length) return 0;
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

export function normalizeMetricValues(values: Array<number | null>) {
  const available = values.filter((value): value is number => value != null && Number.isFinite(value));
  if (!available.length) return values.map(() => null);
  const min = Math.min(...available);
  const max = Math.max(...available);
  if (min === max) return values.map((value) => value == null ? null : 50);
  return values.map((value) => value == null ? null : (value - min) / (max - min) * 100);
}
