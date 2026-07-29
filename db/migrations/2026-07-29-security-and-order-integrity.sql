BEGIN;

ALTER TABLE orders ADD COLUMN IF NOT EXISTS reservation_expires_at TEXT;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS resources_released INTEGER NOT NULL DEFAULT 0;
ALTER TABLE orders ADD COLUMN IF NOT EXISTS resources_committed INTEGER NOT NULL DEFAULT 0;

UPDATE orders
SET resources_committed = 1
WHERE status NOT IN ('待付款', '支付失败', '已取消');

UPDATE orders
SET reservation_expires_at = (CURRENT_TIMESTAMP + INTERVAL '30 minutes')::TEXT
WHERE status IN ('待付款', '支付失败')
  AND reservation_expires_at IS NULL
  AND resources_released = 0;

CREATE TABLE IF NOT EXISTS member_verification_codes (
  id TEXT PRIMARY KEY,
  target TEXT NOT NULL,
  purpose TEXT NOT NULL,
  code_hash TEXT NOT NULL,
  attempts INTEGER NOT NULL DEFAULT 0,
  expires_at TEXT NOT NULL,
  consumed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::TEXT)
);

CREATE INDEX IF NOT EXISTS member_verification_target_idx ON member_verification_codes (target, created_at);

CREATE TABLE IF NOT EXISTS member_sessions (
  token_hash TEXT PRIMARY KEY,
  member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::TEXT)
);

CREATE INDEX IF NOT EXISTS member_sessions_member_idx ON member_sessions (member_id);

CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  request_count INTEGER NOT NULL DEFAULT 0,
  window_started_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::TEXT)
);

UPDATE gift_cards
SET status = 'pending'
WHERE status = 'active'
  AND EXISTS (
    SELECT 1 FROM orders
    WHERE orders.id = gift_cards.order_id
      AND orders.status IN ('待付款', '支付失败')
  );

UPDATE members m
SET total_orders = (
      SELECT COUNT(*) FROM orders o
      WHERE o.member_id = m.id AND o.status NOT IN ('待付款', '支付失败', '已取消')
    ),
    total_spent = COALESCE((
      SELECT SUM(o.total) FROM orders o
      WHERE o.member_id = m.id AND o.status NOT IN ('待付款', '支付失败', '已取消')
    ), 0),
    updated_at = CURRENT_TIMESTAMP;

COMMIT;
