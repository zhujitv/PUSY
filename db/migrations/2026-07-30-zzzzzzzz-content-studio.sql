BEGIN;

CREATE TABLE IF NOT EXISTS content_revisions (
  id TEXT PRIMARY KEY,
  title TEXT NOT NULL,
  snapshot_json TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',
  publish_at TEXT,
  published_at TEXT,
  created_by TEXT NOT NULL DEFAULT 'system',
  created_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::TEXT),
  updated_at TEXT NOT NULL DEFAULT (CURRENT_TIMESTAMP::TEXT)
);

CREATE INDEX IF NOT EXISTS content_revisions_status_idx ON content_revisions (status, publish_at, created_at DESC);

INSERT INTO site_content (key, value) VALUES
  ('show_announcement', '1'),
  ('hero_cta_label', '立即探索'),
  ('hero_cta_url', '/catalog/products'),
  ('hero2_eyebrow', 'PÚSY 神秘礼盒'),
  ('hero2_title', '装下这个夏天\n需要的一切'),
  ('hero2_cta_label', '了解更多'),
  ('hero2_cta_url', '/catalog/sekretnye-boksy'),
  ('show_featured', '1'),
  ('featured_subtitle', '从当季新品开始，找到你的下一件日常心动。'),
  ('featured_cta_label', '查看全部'),
  ('show_categories', '1'),
  ('categories_title', '按心情探索'),
  ('category_1_label', '彩妆'),
  ('category_1_url', '/catalog/makiyazh'),
  ('category_2_label', '护肤'),
  ('category_2_url', '/catalog/uhod'),
  ('category_3_label', '家居'),
  ('category_3_url', '/catalog/dlya-doma'),
  ('show_reels', '1'),
  ('reels_title', '你与 PÚSY'),
  ('reels_subtitle', '真实灵感、使用方式与热门单品。'),
  ('show_newsletter', '1'),
  ('newsletter_title', '订阅邮件，立享 9 折'),
  ('newsletter_success', '订阅成功，欢迎加入 PÚSY CLUB。')
ON CONFLICT (key) DO NOTHING;

COMMIT;
