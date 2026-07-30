BEGIN;

ALTER TABLE admin_audit_logs ADD COLUMN IF NOT EXISTS outcome TEXT NOT NULL DEFAULT 'attempted';
ALTER TABLE admin_audit_logs ADD COLUMN IF NOT EXISTS error_text TEXT NOT NULL DEFAULT '';
ALTER TABLE admin_audit_logs ADD COLUMN IF NOT EXISTS completed_at TEXT;

UPDATE admin_audit_logs
SET outcome = 'succeeded', completed_at = COALESCE(completed_at, created_at)
WHERE outcome = 'attempted';

COMMIT;
