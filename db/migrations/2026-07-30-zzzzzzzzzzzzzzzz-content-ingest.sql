BEGIN;

CREATE TABLE IF NOT EXISTS content_sources (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  platform TEXT NOT NULL,
  account_url TEXT NOT NULL,
  feed_url TEXT NOT NULL DEFAULT '',
  source_type TEXT NOT NULL DEFAULT 'official_social',
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'paused', 'revoked')),
  is_trusted BOOLEAN NOT NULL DEFAULT FALSE,
  ingest_enabled BOOLEAN NOT NULL DEFAULT FALSE,
  rights_status TEXT NOT NULL DEFAULT 'pending' CHECK (rights_status IN ('pending', 'authorized', 'revoked')),
  rights_metadata_json TEXT NOT NULL DEFAULT '{}',
  last_synced_at TEXT,
  error_text TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::TEXT),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::TEXT),
  UNIQUE (platform, account_url)
);

CREATE INDEX IF NOT EXISTS content_sources_ingest_idx
  ON content_sources (ingest_enabled, status, platform);

CREATE TABLE IF NOT EXISTS content_ingest_runs (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES content_sources(id) ON DELETE RESTRICT,
  run_key TEXT NOT NULL UNIQUE,
  triggered_by TEXT NOT NULL DEFAULT 'scheduler',
  status TEXT NOT NULL DEFAULT 'running' CHECK (status IN ('running', 'succeeded', 'partial', 'failed')),
  discovered_count INTEGER NOT NULL DEFAULT 0 CHECK (discovered_count >= 0),
  imported_count INTEGER NOT NULL DEFAULT 0 CHECK (imported_count >= 0),
  updated_count INTEGER NOT NULL DEFAULT 0 CHECK (updated_count >= 0),
  failed_count INTEGER NOT NULL DEFAULT 0 CHECK (failed_count >= 0),
  error_text TEXT NOT NULL DEFAULT '',
  started_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::TEXT),
  finished_at TEXT,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::TEXT),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::TEXT)
);

CREATE INDEX IF NOT EXISTS content_ingest_runs_source_idx
  ON content_ingest_runs (source_id, started_at DESC);

CREATE TABLE IF NOT EXISTS content_candidates (
  id TEXT PRIMARY KEY,
  source_id TEXT NOT NULL REFERENCES content_sources(id) ON DELETE RESTRICT,
  external_id TEXT NOT NULL,
  source_url TEXT NOT NULL,
  source_type TEXT NOT NULL DEFAULT 'official_social',
  original_title TEXT NOT NULL DEFAULT '',
  original_text TEXT NOT NULL DEFAULT '',
  translated_title TEXT NOT NULL DEFAULT '',
  translated_text TEXT NOT NULL DEFAULT '',
  media_json TEXT NOT NULL DEFAULT '[]',
  rights_json TEXT NOT NULL DEFAULT '{}',
  product_refs_json TEXT NOT NULL DEFAULT '[]',
  compliance_flags_json TEXT NOT NULL DEFAULT '[]',
  translation_status TEXT NOT NULL DEFAULT 'pending' CHECK (translation_status IN ('pending', 'translated', 'review_required', 'failed')),
  status TEXT NOT NULL DEFAULT 'fetched' CHECK (status IN ('fetched', 'translating', 'pending_review', 'approved', 'scheduled', 'rejected', 'published', 'withdrawn', 'failed')),
  publish_at TEXT,
  published_at TEXT,
  rejected_reason TEXT NOT NULL DEFAULT '',
  reviewed_by TEXT NOT NULL DEFAULT '',
  reviewed_at TEXT,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::TEXT),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::TEXT),
  UNIQUE (source_id, external_id)
);

CREATE INDEX IF NOT EXISTS content_candidates_review_idx
  ON content_candidates (status, created_at DESC);
CREATE INDEX IF NOT EXISTS content_candidates_schedule_idx
  ON content_candidates (status, publish_at);
CREATE INDEX IF NOT EXISTS content_candidates_source_idx
  ON content_candidates (source_id, created_at DESC);

CREATE TABLE IF NOT EXISTS content_candidate_events (
  id BIGSERIAL PRIMARY KEY,
  candidate_id TEXT NOT NULL REFERENCES content_candidates(id) ON DELETE RESTRICT,
  event_type TEXT NOT NULL,
  from_status TEXT,
  to_status TEXT,
  actor TEXT NOT NULL DEFAULT 'system',
  details_json TEXT NOT NULL DEFAULT '{}',
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::TEXT)
);

CREATE INDEX IF NOT EXISTS content_candidate_events_candidate_idx
  ON content_candidate_events (candidate_id, created_at, id);

CREATE TABLE IF NOT EXISTS blog_posts (
  id TEXT PRIMARY KEY,
  slug TEXT NOT NULL UNIQUE,
  title TEXT NOT NULL,
  tag TEXT NOT NULL DEFAULT '美丽灵感',
  cover_image_url TEXT NOT NULL DEFAULT '',
  intro TEXT NOT NULL DEFAULT '',
  sections_json TEXT NOT NULL DEFAULT '[]',
  status TEXT NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published', 'withdrawn')),
  publish_at TEXT,
  published_at TEXT,
  source_candidate_id TEXT NOT NULL UNIQUE REFERENCES content_candidates(id) ON DELETE RESTRICT,
  seo_description TEXT NOT NULL DEFAULT '',
  withdrawn_at TEXT,
  withdrawn_by TEXT NOT NULL DEFAULT '',
  withdrawal_reason TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::TEXT),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::TEXT)
);

CREATE INDEX IF NOT EXISTS blog_posts_public_idx
  ON blog_posts (status, published_at DESC);
CREATE INDEX IF NOT EXISTS blog_posts_schedule_idx
  ON blog_posts (status, publish_at);

CREATE TABLE IF NOT EXISTS blog_post_revisions (
  id BIGSERIAL PRIMARY KEY,
  blog_post_id TEXT NOT NULL REFERENCES blog_posts(id) ON DELETE RESTRICT,
  revision_number INTEGER NOT NULL CHECK (revision_number > 0),
  event_type TEXT NOT NULL CHECK (event_type IN ('scheduled', 'published', 'withdrawn')),
  snapshot_json TEXT NOT NULL,
  actor TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::TEXT),
  UNIQUE (blog_post_id, revision_number)
);

CREATE INDEX IF NOT EXISTS blog_post_revisions_post_idx
  ON blog_post_revisions (blog_post_id, revision_number DESC);

INSERT INTO content_sources (
  id, name, platform, account_url, feed_url, source_type, status,
  is_trusted, ingest_enabled, rights_status, rights_metadata_json
) VALUES
  (
    'SRC-TELEGRAM-PUSYBEAUTYY', 'PÚSY 官方 Telegram', 'telegram',
    'https://t.me/pusybeautyy', 'https://t.me/s/pusybeautyy', 'official_social', 'active',
    TRUE, TRUE, 'authorized',
    '{"confirmed_by":"site_owner","scope":"china_official_website","confirmed_at":"2026-07-30"}'
  ),
  (
    'SRC-VK-PUSYBEAUTY', 'PÚSY 官方 VK', 'vk',
    'https://vk.com/pusybeauty', 'https://vk.com/pusybeauty', 'official_social', 'active',
    TRUE, TRUE, 'authorized',
    '{"confirmed_by":"site_owner","scope":"china_official_website","confirmed_at":"2026-07-30"}'
  ),
  (
    'SRC-INSTAGRAM-PUSY-BEAUTY', 'PÚSY 官方 Instagram', 'instagram',
    'https://www.instagram.com/pusy.beauty', 'https://www.instagram.com/pusy.beauty', 'official_social', 'active',
    TRUE, TRUE, 'authorized',
    '{"confirmed_by":"site_owner","scope":"china_official_website","confirmed_at":"2026-07-30"}'
  )
ON CONFLICT (id) DO UPDATE SET
  name = EXCLUDED.name,
  platform = EXCLUDED.platform,
  account_url = EXCLUDED.account_url,
  feed_url = EXCLUDED.feed_url,
  source_type = EXCLUDED.source_type,
  status = 'active',
  is_trusted = TRUE,
  ingest_enabled = TRUE,
  rights_status = 'authorized',
  rights_metadata_json = EXCLUDED.rights_metadata_json,
  error_text = '',
  updated_at = CURRENT_TIMESTAMP;

COMMIT;
