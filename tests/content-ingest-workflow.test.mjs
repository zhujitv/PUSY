import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { isSafePublicHttpsUrl, scanContentCompliance } from "../lib/content-ingest/compliance.ts";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("内容采集迁移保留来源、候选、事件、文章和版本历史", async () => {
  const migration = await read("db/migrations/2026-07-30-zzzzzzzzzzzzzzzz-content-ingest.sql");
  for (const table of ["content_sources", "content_ingest_runs", "content_candidates", "content_candidate_events", "blog_posts", "blog_post_revisions"]) {
    assert.match(migration, new RegExp(`CREATE TABLE IF NOT EXISTS ${table}`));
  }
  assert.match(migration, /UNIQUE \(source_id, external_id\)/);
  assert.match(migration, /SRC-TELEGRAM-PUSYBEAUTYY/);
  assert.match(migration, /SRC-VK-PUSYBEAUTY/);
  assert.match(migration, /SRC-INSTAGRAM-PUSY-BEAUTY/);
  assert.match(migration, /"scope":"china_official_website"/);
});

test("数据层采用幂等写入、事务锁、人工批准和可追溯撤回", async () => {
  const data = await read("db/content-ingest.ts");
  assert.match(data, /ON CONFLICT \(source_id, external_id\) DO NOTHING/);
  assert.match(data, /pg_advisory_xact_lock/);
  assert.match(data, /assertNoBlockingComplianceFlags/);
  assert.match(data, /未经人工批准的候选稿不能发布/);
  assert.match(data, /export async function publishDueContentCandidates/);
  assert.match(data, /export async function withdrawContentCandidate/);
  assert.match(data, /INSERT INTO blog_post_revisions/);
  assert.match(data, /status = 'withdrawn'/);
});

test("后台审核接口需要登录、内容权限、可信来源和实时合规检查", async () => {
  const api = await read("app/api/admin/content-candidates/route.ts");
  assert.match(api, /getAdminIdentity/);
  assert.match(api, /roleCan\(actor\.role, "content\.manage"\)/);
  assert.match(api, /hasTrustedOrigin/);
  assert.match(api, /scanContentCompliance/);
  assert.match(api, /assertNoBlockingComplianceFlags/);
  assert.match(api, /approveContentCandidate/);
  assert.match(api, /scheduleContentCandidate/);
  assert.match(api, /publishContentCandidate/);
  assert.match(api, /withdrawContentCandidate/);
});

test("后台工作台明确要求先翻译、人工审核再发布", async () => {
  const [ui, admin, publicBlog] = await Promise.all([
    read("app/admin/ContentCandidatesAdmin.tsx"),
    read("app/admin/AdminClient.tsx"),
    read("app/data/public-blog.ts"),
  ]);
  assert.match(ui, /平台内容只会生成候选草稿/);
  assert.match(ui, /人工批准/);
  assert.match(ui, /定时发布/);
  assert.match(ui, /从官网撤回/);
  assert.match(admin, /ContentCandidatesAdmin/);
  assert.match(publicBlog, /getPublishedBlogPosts/);
  assert.match(publicBlog, /blogPosts/);
});

test("内容合规扫描阻断私网来源、缺少授权和高风险宣传词", () => {
  assert.equal(isSafePublicHttpsUrl("http://example.com/post"), false);
  assert.equal(isSafePublicHttpsUrl("https://127.0.0.1/post"), false);
  assert.equal(isSafePublicHttpsUrl("https://10.0.0.8/post"), false);
  assert.equal(isSafePublicHttpsUrl("https://t.me/pusybeautyy/1"), true);

  const flags = scanContentCompliance({
    sourceUrl: "https://t.me/pusybeautyy/1",
    originalText: "original",
    translatedTitle: "全网第一，永久有效",
    translatedText: "能够治疗问题并保证 100% 有效。",
    isTrusted: false,
    rightsStatus: "pending",
  });
  const blockingCodes = flags.filter((flag) => flag.severity === "blocking").map((flag) => flag.code);
  assert.ok(blockingCodes.includes("untrusted_source"));
  assert.ok(blockingCodes.includes("missing_rights"));
  assert.ok(blockingCodes.includes("absolute_claim"));
  assert.ok(blockingCodes.includes("medical_claim"));
});
