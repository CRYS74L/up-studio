import { z } from 'zod';

export const metricDefinitionSchema = z.object({
  id: z.string(),
  label: z.string(),
  unit: z.enum(['count', 'percent', 'seconds', 'hours', 'rate']),
  direction: z.enum(['up', 'down', 'neutral']),
  aggregation: z.enum(['sum', 'average', 'latest', 'ratio']),
  source: z.enum(['bilibili', 'derived', 'import']),
  denominator: z.string().optional(),
  available: z.boolean().default(true)
});
export type MetricDefinition = z.infer<typeof metricDefinitionSchema>;

export const videoSnapshotSchema = z.object({
  videoId: z.string(),
  capturedAt: z.string().datetime(),
  views: z.number().nonnegative().nullable(),
  impressions: z.number().nonnegative().nullable(),
  coverCtr: z.number().nullable(),
  avgWatchSeconds: z.number().nonnegative().nullable(),
  avgWatchPercent: z.number().nullable(),
  followersGained: z.number().nullable(),
  metrics: z.record(z.string(), z.number().nullable()),
  dimensions: z.record(z.string(), z.unknown()).optional().default({})
});
export type VideoSnapshot = z.infer<typeof videoSnapshotSchema>;

export const acquisitionRunSchema = z.object({
  id: z.string(), status: z.enum(['running', 'success', 'partial', 'failed']),
  startedAt: z.string().datetime(), finishedAt: z.string().datetime().nullable(),
  sourceVersion: z.string(), coverage: z.number().min(0).max(1), retries: z.number().int(),
  errorCode: z.enum(['session_expired', 'risk_control', 'schema_changed', 'network', 'unknown']).nullable()
});
export type AcquisitionRun = z.infer<typeof acquisitionRunSchema>;

export const analysisQuerySchema = z.object({
  metrics: z.array(z.string()).min(1), xAxis: z.string(), yAxis: z.string().optional(),
  groupBy: z.string().optional(), from: z.string(), to: z.string(),
  chart: z.enum(['line', 'bar', 'scatter', 'funnel', 'table'])
});
export type AnalysisQuery = z.infer<typeof analysisQuerySchema>;

export const backupManifestSchema = z.object({
  version: z.literal(1), kind: z.enum(['incremental', 'full']), createdAt: z.string().datetime(),
  from: z.string().datetime(), to: z.string().datetime(), cursor: z.string(),
  recordCount: z.number().int().nonnegative(),
  files: z.array(z.object({ path: z.string(), bytes: z.number().int(), sha256: z.string().length(64) }))
});
export type BackupManifest = z.infer<typeof backupManifestSchema>;
