BEGIN;

CREATE TABLE IF NOT EXISTS support_threads (
  id TEXT PRIMARY KEY,
  mailbox TEXT NOT NULL DEFAULT 'service',
  subject TEXT NOT NULL,
  customer_email TEXT NOT NULL,
  customer_name TEXT NOT NULL DEFAULT '',
  member_id INTEGER REFERENCES members(id) ON DELETE SET NULL,
  order_id TEXT REFERENCES orders(id) ON DELETE SET NULL,
  return_id TEXT REFERENCES returns(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'unread',
  priority TEXT NOT NULL DEFAULT 'normal',
  assigned_to TEXT,
  last_message_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::TEXT),
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::TEXT),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::TEXT)
);

CREATE INDEX IF NOT EXISTS support_threads_status_idx ON support_threads (status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS support_threads_customer_idx ON support_threads (customer_email, last_message_at DESC);
CREATE INDEX IF NOT EXISTS support_threads_order_idx ON support_threads (order_id);

CREATE TABLE IF NOT EXISTS support_messages (
  id TEXT PRIMARY KEY,
  thread_id TEXT NOT NULL REFERENCES support_threads(id) ON DELETE CASCADE,
  direction TEXT NOT NULL,
  source TEXT NOT NULL DEFAULT 'email',
  provider_email_id TEXT UNIQUE,
  provider_message_id TEXT,
  from_email TEXT NOT NULL,
  to_email TEXT NOT NULL,
  subject TEXT NOT NULL DEFAULT '',
  text_body TEXT NOT NULL DEFAULT '',
  html_body TEXT NOT NULL DEFAULT '',
  headers_json TEXT NOT NULL DEFAULT '{}',
  attachments_json TEXT NOT NULL DEFAULT '[]',
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::TEXT)
);

CREATE INDEX IF NOT EXISTS support_messages_thread_idx ON support_messages (thread_id, created_at);

ALTER TABLE returns ADD COLUMN IF NOT EXISTS support_thread_id TEXT REFERENCES support_threads(id) ON DELETE SET NULL;
ALTER TABLE returns ADD COLUMN IF NOT EXISTS attachments_json TEXT NOT NULL DEFAULT '[]';

CREATE TABLE IF NOT EXISTS return_events (
  id TEXT PRIMARY KEY,
  return_id TEXT NOT NULL REFERENCES returns(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  note TEXT NOT NULL DEFAULT '',
  actor TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::TEXT)
);

CREATE INDEX IF NOT EXISTS return_events_return_idx ON return_events (return_id, created_at);

COMMIT;
