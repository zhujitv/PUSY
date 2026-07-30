BEGIN;

SELECT pg_advisory_xact_lock(hashtext('pusy-remove-content-ingest-v1'));

DO $cleanup_guard$
DECLARE
  table_name TEXT;
  record_count BIGINT;
BEGIN
  FOREACH table_name IN ARRAY ARRAY[
    'content_ingest_runs',
    'content_candidates',
    'content_candidate_events',
    'blog_posts',
    'blog_post_revisions'
  ] LOOP
    IF to_regclass(format('public.%I', table_name)) IS NOT NULL THEN
      EXECUTE format('SELECT COUNT(*) FROM public.%I', table_name) INTO record_count;
      IF record_count > 0 THEN
        RAISE EXCEPTION '停止清理：表 % 中仍有 % 条记录', table_name, record_count;
      END IF;
    END IF;
  END LOOP;

  IF to_regclass('public.content_sources') IS NOT NULL THEN
    EXECUTE $source_check$
      SELECT COUNT(*)
      FROM public.content_sources
      WHERE id NOT IN (
        'SRC-TELEGRAM-PUSYBEAUTYY',
        'SRC-VK-PUSYBEAUTY',
        'SRC-INSTAGRAM-PUSY-BEAUTY'
      )
    $source_check$ INTO record_count;

    IF record_count > 0 THEN
      RAISE EXCEPTION '停止清理：content_sources 中存在 % 条非初始化来源记录', record_count;
    END IF;
  END IF;
END;
$cleanup_guard$;

DROP TABLE IF EXISTS public.blog_post_revisions;
DROP TABLE IF EXISTS public.blog_posts;
DROP TABLE IF EXISTS public.content_candidate_events;
DROP TABLE IF EXISTS public.content_candidates;
DROP TABLE IF EXISTS public.content_ingest_runs;
DROP TABLE IF EXISTS public.content_sources;

DO $cleanup_verify$
BEGIN
  IF to_regclass('public.blog_post_revisions') IS NOT NULL
    OR to_regclass('public.blog_posts') IS NOT NULL
    OR to_regclass('public.content_candidate_events') IS NOT NULL
    OR to_regclass('public.content_candidates') IS NOT NULL
    OR to_regclass('public.content_ingest_runs') IS NOT NULL
    OR to_regclass('public.content_sources') IS NOT NULL THEN
    RAISE EXCEPTION '内容采集数据库对象未完全清理';
  END IF;
END;
$cleanup_verify$;

COMMIT;
