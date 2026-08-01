import test from "node:test";
import assert from "node:assert/strict";
import { needsContentDiscardWarning, resolveContentSubmitIntent } from "../lib/content-studio-safety.js";
import { readSource as read } from "./helpers/read-source.mjs";

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
  assert.match(studio, /快速预览/);
  assert.match(studio, /恢复此版本/);
});

test("内容链接只允许站内安全路径", async () => {
  const service = await read("db/commerce-features.ts");
  assert.match(service, /\^\\\/\(\?!\\\/\)/);
  assert.match(service, /key\.endsWith\("_url"\)/);
});

test("内容工作台提供持续可见的保存状态和防丢失保护", async () => {
  const [studio, admin, styles] = await Promise.all([
    read("app/admin/CommerceFeaturesAdmin.tsx"),
    read("app/admin/AdminClient.tsx"),
    read("app/globals.css"),
  ]);
  assert.match(studio, /保存并立即发布/);
  assert.match(studio, /content-save-state/);
  assert.match(studio, /Ctrl\+S/);
  assert.match(studio, /beforeunload/);
  assert.match(studio, /有未保存修改/);
  assert.match(admin, /silent: true, preserveMessage: true/);
  assert.match(admin, /当前内容还有未保存修改/);
  assert.match(styles, /\.content-release-bar \{ position: sticky/);
  assert.match(styles, /\.content-mobile-actions \{ position: fixed/);
});

test("内容版本可以搜索筛选并载入继续编辑", async () => {
  const [studio, service] = await Promise.all([
    read("app/admin/CommerceFeaturesAdmin.tsx"),
    read("db/commerce-features.ts"),
  ]);
  assert.match(service, /SELECT id, title, snapshot_json, status/);
  assert.match(studio, /载入编辑/);
  assert.match(studio, /parseRevisionSnapshot/);
  assert.match(studio, /搜索版本/);
  assert.match(studio, /名称、编号或创建人/);
  assert.match(studio, /确定\$\{verb\}/);
});

test("内容发布只接受明确的保存按钮意图", () => {
  assert.equal(resolveContentSubmitIntent("draft"), "draft");
  assert.equal(resolveContentSubmitIntent("schedule"), "schedule");
  assert.equal(resolveContentSubmitIntent("publish"), "publish");
  assert.equal(resolveContentSubmitIntent(undefined), null);
  assert.equal(resolveContentSubmitIntent(""), null);
  assert.equal(resolveContentSubmitIntent("search"), null);
});

test("会覆盖编辑器的版本操作必须保护未保存内容", () => {
  assert.equal(needsContentDiscardWarning(true, "load"), true);
  assert.equal(needsContentDiscardWarning(true, "publish"), true);
  assert.equal(needsContentDiscardWarning(false, "load"), false);
  assert.equal(needsContentDiscardWarning(false, "publish"), false);
});

test("内容搜索回车不会隐式提交发布", async () => {
  const studio = await read("app/admin/CommerceFeaturesAdmin.tsx");
  assert.match(studio, /event\.key === "Enter"/);
  assert.match(studio, /event\.preventDefault\(\)/);
  assert.doesNotMatch(studio, /submitter\?\.value \|\| "publish"/);
});
