PRAGMA foreign_keys = ON;

CREATE TABLE videos (
  id TEXT PRIMARY KEY, bvid TEXT UNIQUE, title TEXT NOT NULL, cover_url TEXT,
  category TEXT, tags_json TEXT NOT NULL DEFAULT '[]', duration_seconds INTEGER,
  published_at TEXT NOT NULL, created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE video_snapshots (
  id INTEGER PRIMARY KEY AUTOINCREMENT, video_id TEXT NOT NULL REFERENCES videos(id),
  captured_at TEXT NOT NULL, source TEXT NOT NULL, views INTEGER, impressions INTEGER,
  cover_ctr REAL, avg_watch_seconds REAL, avg_watch_percent REAL, followers_gained INTEGER,
  metrics_json TEXT NOT NULL DEFAULT '{}', UNIQUE(video_id, captured_at, source)
);
CREATE INDEX snapshots_video_time ON video_snapshots(video_id, captured_at DESC);
CREATE TABLE acquisition_runs (
  id TEXT PRIMARY KEY, started_at TEXT NOT NULL, finished_at TEXT, status TEXT NOT NULL,
  source_version TEXT NOT NULL, coverage REAL NOT NULL DEFAULT 0, retries INTEGER NOT NULL DEFAULT 0,
  error_code TEXT, safe_error_detail TEXT
);
CREATE TABLE encrypted_secrets (
  id TEXT PRIMARY KEY, ciphertext TEXT NOT NULL, iv TEXT NOT NULL, algorithm TEXT NOT NULL DEFAULT 'AES-GCM', updated_at TEXT NOT NULL
);
CREATE TABLE devices (
  id TEXT PRIMARY KEY, token_hash TEXT UNIQUE NOT NULL, label TEXT NOT NULL, created_at TEXT NOT NULL,
  last_seen_at TEXT NOT NULL, expires_at TEXT, revoked_at TEXT
);
CREATE TABLE settings (key TEXT PRIMARY KEY, value_json TEXT NOT NULL, updated_at TEXT NOT NULL);
CREATE TABLE backup_runs (
  id TEXT PRIMARY KEY, kind TEXT NOT NULL, status TEXT NOT NULL, started_at TEXT NOT NULL, finished_at TEXT,
  drive_file_id TEXT, bytes INTEGER, sha256 TEXT, manifest_json TEXT, safe_error_detail TEXT
);
CREATE TABLE ai_cache (
  snapshot_key TEXT PRIMARY KEY, model TEXT NOT NULL, prompt_version TEXT NOT NULL,
  response_json TEXT NOT NULL, cost_cny REAL NOT NULL DEFAULT 0, created_at TEXT NOT NULL
);
CREATE TABLE imports (
  id TEXT PRIMARY KEY, file_hash TEXT UNIQUE NOT NULL, file_name TEXT NOT NULL, status TEXT NOT NULL,
  row_count INTEGER NOT NULL DEFAULT 0, mapping_json TEXT NOT NULL DEFAULT '{}', created_at TEXT NOT NULL
);
CREATE TABLE audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT, occurred_at TEXT NOT NULL, action TEXT NOT NULL,
  result TEXT NOT NULL, safe_detail_json TEXT NOT NULL DEFAULT '{}'
);

