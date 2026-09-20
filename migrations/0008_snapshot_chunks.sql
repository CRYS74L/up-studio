CREATE TABLE IF NOT EXISTS snapshot_chunks (
 hash TEXT PRIMARY KEY,
 codec TEXT NOT NULL CHECK(codec IN ('raw','gzip')),
 raw_bytes INTEGER NOT NULL,
 body BLOB NOT NULL
);
