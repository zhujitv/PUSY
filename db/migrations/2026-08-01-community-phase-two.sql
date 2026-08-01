BEGIN;

INSERT INTO community_topics (id, slug, name, description, status)
VALUES
  ('TPC-DAILYMAKEUP01', 'daily-makeup', '今日妆容', '记录今天的色彩、光泽与妆容灵感。', 'active'),
  ('TPC-LIPDIARY0001', 'lip-diary', '唇色日记', '分享真实唇色、质地和使用场景。', 'active'),
  ('TPC-EMPTIES00001', 'real-empties', '真实空瓶', '用完之后再说感受，让选择更有依据。', 'active'),
  ('TPC-BODYCARE0001', 'body-care', '身体护理', '身体护理、香气与日常仪式。', 'active'),
  ('TPC-HAIRIDEAS001', 'hair-inspiration', '发丝灵感', '发型、护理与发丝状态记录。', 'active')
ON CONFLICT (slug) DO UPDATE SET
  name = EXCLUDED.name,
  description = EXCLUDED.description,
  status = 'active',
  updated_at = CURRENT_TIMESTAMP::TEXT;

CREATE INDEX IF NOT EXISTS community_post_topics_topic_idx
  ON community_post_topics (topic_id, created_at DESC);

COMMIT;
