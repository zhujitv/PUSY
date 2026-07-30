CREATE TABLE IF NOT EXISTS member_notifications (
  id TEXT PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  event_key TEXT NOT NULL,
  notification_type TEXT NOT NULL DEFAULT 'system',
  title TEXT NOT NULL,
  body TEXT NOT NULL,
  link TEXT NOT NULL DEFAULT '',
  read_at TEXT,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::TEXT),
  UNIQUE (member_id, event_key)
);

CREATE INDEX IF NOT EXISTS member_notifications_member_idx ON member_notifications (member_id, read_at, created_at DESC);
