import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const migrationUrl = new URL("../db/migrations/2026-07-30-zzzzzzzzzzzzzzzzz-remove-content-ingest.sql", import.meta.url);

test("内容采集数据库清理仅在没有业务数据时执行", async () => {
  const migration = await readFile(migrationUrl, "utf8");

  for (const table of [
    "content_ingest_runs",
    "content_candidates",
    "content_candidate_events",
    "blog_posts",
    "blog_post_revisions",
  ]) {
    assert.match(migration, new RegExp(`['\"]${table}['\"]`));
  }

  for (const sourceId of [
    "SRC-TELEGRAM-PUSYBEAUTYY",
    "SRC-VK-PUSYBEAUTY",
    "SRC-INSTAGRAM-PUSY-BEAUTY",
  ]) {
    assert.match(migration, new RegExp(sourceId));
  }

  assert.match(migration, /IF record_count > 0 THEN[\s\S]*RAISE EXCEPTION/);
  assert.match(migration, /pg_advisory_xact_lock/);
});

test("内容采集数据库对象按依赖顺序删除且不使用级联删除", async () => {
  const migration = await readFile(migrationUrl, "utf8");
  const dropOrder = [
    "blog_post_revisions",
    "blog_posts",
    "content_candidate_events",
    "content_candidates",
    "content_ingest_runs",
    "content_sources",
  ];
  let previousIndex = -1;

  for (const table of dropOrder) {
    const index = migration.indexOf(`DROP TABLE IF EXISTS public.${table}`);
    assert.ok(index > previousIndex, `${table} 应按外键依赖顺序删除`);
    previousIndex = index;
  }

  assert.doesNotMatch(migration, /\bCASCADE\b/i);
  assert.match(migration, /内容采集数据库对象未完全清理/);
});
