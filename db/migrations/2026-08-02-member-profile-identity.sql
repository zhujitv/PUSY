ALTER TABLE member_profiles ADD COLUMN IF NOT EXISTS avatar_url TEXT NOT NULL DEFAULT '';
ALTER TABLE member_profiles ADD COLUMN IF NOT EXISTS nickname_updated_at TEXT;
