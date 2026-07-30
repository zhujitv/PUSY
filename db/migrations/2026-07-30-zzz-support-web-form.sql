BEGIN;

ALTER TABLE support_threads ADD COLUMN IF NOT EXISTS customer_phone TEXT NOT NULL DEFAULT '';
ALTER TABLE support_threads ADD COLUMN IF NOT EXISTS customer_wechat TEXT NOT NULL DEFAULT '';

CREATE INDEX IF NOT EXISTS support_threads_phone_idx ON support_threads (customer_phone, last_message_at DESC);

COMMIT;
