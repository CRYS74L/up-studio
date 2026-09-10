CREATE TABLE IF NOT EXISTS ai_conversations (
  id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  title TEXT NOT NULL,
  messages_json TEXT NOT NULL DEFAULT '[]',
  video_ids_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  busy_until INTEGER NOT NULL DEFAULT 0
);
CREATE INDEX IF NOT EXISTS ai_conversations_account_time ON ai_conversations(account_id, updated_at DESC);
