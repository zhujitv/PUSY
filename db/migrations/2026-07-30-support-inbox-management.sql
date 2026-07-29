BEGIN;

ALTER TABLE support_threads ADD COLUMN IF NOT EXISTS starred SMALLINT NOT NULL DEFAULT 0;
ALTER TABLE support_threads ADD COLUMN IF NOT EXISTS archived_at TEXT;
ALTER TABLE support_threads ADD COLUMN IF NOT EXISTS deleted_at TEXT;

CREATE INDEX IF NOT EXISTS support_threads_folder_idx
  ON support_threads (deleted_at, archived_at, status, last_message_at DESC);

COMMIT;
