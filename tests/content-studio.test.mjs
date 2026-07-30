import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("内容工作台包含草稿、定时发布、版本历史和并发发布保护", async () => {
  const [migration, service, adminApi, permissions] = await Promise.all([
    read("db/migrations/2026-07-30-zzzzzzzz-content-studio.sql"),
    read("db/commerce-features.ts"),
    read("app/api/admin/route.ts"),
    read("lib/admin-permissions.ts"),
  ]);
  assert.match(migration, /CREATE TABLE IF NOT EXISTS content_revisions/);
  assert.match(service, /pg_advisory_xact_lock\(hashtext\('pusy-content-publish'\)\)/);
  assert.match(service, /status = 'scheduled' AND publish_at::timestamp <= CURRENT_TIMESTAMP/);
  assert.match(service, /UPDATE content_revisions SET status = 'archived'.*status = 'scheduled'/s);
  assert.match(adminApi, /action === "save-content-draft"/);
  assert.match(adminApi, /action === "schedule-site-content"/);
  assert.match(adminApi, /action === "publish-content-revision"/);
  assert.match(permissions, /"delete-content-revision": "content\.manage"/);
});

test("首页主要营销模块均可由内容工作台运营", async () => {
  const [home, studio, service] = await Promise.all([
    read("app/page.tsx"),
    read("app/admin/CommerceFeaturesAdmin.tsx"),
    read("db/commerce-features.ts"),
  ]);
  for (const key of ["show_announcement", "hero_cta_label", "hero2_title", "featured_subtitle", "categories_title", "reels_subtitle", "newsletter_title"]) {
    assert.match(home, new RegExp(`homeContent\\.${key}`));
    assert.match(service, new RegExp(`${key}:`));
  }
  assert.match(studio, /保存草稿/);
  assert.match(studio, /定时发布/);
  assert.match(studio, /立即发布/);
  assert.match(studio, /实时预览/);
  assert.match(studio, /恢复此版本/);
});

test("内容链接只允许站内安全路径", async () => {
  const service = await read("db/commerce-features.ts");
  assert.match(service, /\^\\\/\(\?!\\\/\)/);
  assert.match(service, /key\.endsWith\("_url"\)/);
});
