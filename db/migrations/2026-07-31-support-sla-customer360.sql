BEGIN;

ALTER TABLE support_threads ADD COLUMN IF NOT EXISTS assigned_admin_id TEXT;
ALTER TABLE support_threads ADD COLUMN IF NOT EXISTS first_response_due_at TEXT;
ALTER TABLE support_threads ADD COLUMN IF NOT EXISTS resolution_due_at TEXT;
ALTER TABLE support_threads ADD COLUMN IF NOT EXISTS first_responded_at TEXT;
ALTER TABLE support_threads ADD COLUMN IF NOT EXISTS resolved_at TEXT;
ALTER TABLE support_threads ADD COLUMN IF NOT EXISTS reopened_count INTEGER NOT NULL DEFAULT 0;

UPDATE support_threads
SET first_response_due_at = (created_at::timestamp + CASE priority
      WHEN 'urgent' THEN INTERVAL '1 hour'
      WHEN 'high' THEN INTERVAL '4 hours'
      WHEN 'low' THEN INTERVAL '24 hours'
      ELSE INTERVAL '8 hours'
    END)::TEXT
WHERE first_response_due_at IS NULL;

UPDATE support_threads
SET resolution_due_at = (created_at::timestamp + CASE priority
      WHEN 'urgent' THEN INTERVAL '4 hours'
      WHEN 'high' THEN INTERVAL '24 hours'
      WHEN 'low' THEN INTERVAL '72 hours'
      ELSE INTERVAL '48 hours'
    END)::TEXT
WHERE resolution_due_at IS NULL;

UPDATE support_threads st
SET first_responded_at = response.first_responded_at
FROM (
  SELECT thread_id, MIN(created_at) AS first_responded_at
  FROM support_messages
  WHERE direction = 'outbound'
  GROUP BY thread_id
) response
WHERE st.id = response.thread_id AND st.first_responded_at IS NULL;

UPDATE support_threads
SET resolved_at = COALESCE(resolved_at, updated_at)
WHERE status = 'resolved';

CREATE INDEX IF NOT EXISTS support_threads_assignee_idx ON support_threads (assigned_admin_id, status, last_message_at DESC);
CREATE INDEX IF NOT EXISTS support_threads_first_response_sla_idx ON support_threads (first_response_due_at, status);
CREATE INDEX IF NOT EXISTS support_threads_resolution_sla_idx ON support_threads (resolution_due_at, status);

COMMIT;
