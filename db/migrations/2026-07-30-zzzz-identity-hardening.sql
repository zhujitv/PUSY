BEGIN;

ALTER TABLE admin_users ADD COLUMN IF NOT EXISTS session_version INTEGER NOT NULL DEFAULT 0;

ALTER TABLE members ADD COLUMN IF NOT EXISTS email_verified INTEGER NOT NULL DEFAULT 0;
ALTER TABLE members ADD COLUMN IF NOT EXISTS phone_verified INTEGER NOT NULL DEFAULT 0;

-- 历史注册流程已验证邮箱，但从未验证手机号。
UPDATE members SET email_verified = 1 WHERE email <> '' AND email_verified = 0;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1
    FROM members
    WHERE phone <> ''
    GROUP BY regexp_replace(phone, '[[:space:]-]', '', 'g')
    HAVING COUNT(*) > 1
  ) THEN
    RAISE EXCEPTION 'members 表存在重复手机号，请先人工确认并清理后再迁移';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS members_phone_unique_idx
  ON members ((regexp_replace(phone, '[[:space:]-]', '', 'g')))
  WHERE phone <> '';

COMMIT;
