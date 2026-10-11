CREATE INDEX IF NOT EXISTS snapshots_time_source ON video_snapshots(captured_at DESC,source);
CREATE INDEX IF NOT EXISTS account_snapshots_time ON account_snapshots(captured_at DESC);
CREATE INDEX IF NOT EXISTS acquisition_runs_started ON acquisition_runs(started_at DESC);
