ALTER TABLE acquisition_runs ADD COLUMN timings_json TEXT NOT NULL DEFAULT '{}';
ALTER TABLE acquisition_runs ADD COLUMN request_count INTEGER NOT NULL DEFAULT 0;
CREATE INDEX IF NOT EXISTS acquisition_runs_status_started ON acquisition_runs(status, started_at DESC);
