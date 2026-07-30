import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";

const root = new URL("../", import.meta.url);
const read = (path) => readFile(new URL(path, root), "utf8");

test("内容采集只使用官方 API 和 Telegram webhook，不抓取社媒 HTML", async () => {
  const [telegram, vk, instagram] = await Promise.all([
    read("lib/content-ingest/connectors/telegram.ts"),
    read("lib/content-ingest/connectors/vk.ts"),
    read("lib/content-ingest/connectors/instagram.ts"),
  ]);
  assert.match(telegram, /telegram_bot_api_webhook/);
  assert.match(vk, /https:\/\/api\.vk\.com\/method\/wall\.get/);
  assert.match(instagram, /https:\/\/graph\.instagram\.com/);
  for (const source of [telegram, vk, instagram]) {
    assert.doesNotMatch(source, /fetch\([^)]*(?:t\.me|vk\.com|www\.instagram\.com)/s);
    assert.doesNotMatch(source, /t\.me\/s\//);
  }
});

test("缺少平台凭据时安全跳过并返回配置状态", async () => {
  const [service, telegram, vk, instagram] = await Promise.all([
    read("lib/content-ingest/service.ts"),
    read("lib/content-ingest/connectors/telegram.ts"),
    read("lib/content-ingest/connectors/vk.ts"),
    read("lib/content-ingest/connectors/instagram.ts"),
  ]);
  assert.match(service, /configured: false/);
  assert.match(service, /status: "skipped"/);
  assert.match(telegram, /TELEGRAM_CONTENT_WEBHOOK_SECRET/);
  assert.match(vk, /VK_CONTENT_ACCESS_TOKEN/);
  assert.match(instagram, /INSTAGRAM_CONTENT_ACCESS_TOKEN/);
});

test("Telegram webhook 和 Vercel Cron 均校验服务端密钥", async () => {
  const [webhook, cron, vercel] = await Promise.all([
    read("app/api/webhooks/telegram/content/route.ts"),
    read("app/api/cron/content-sync/route.ts"),
    read("vercel.json"),
  ]);
  assert.match(webhook, /x-telegram-bot-api-secret-token/);
  assert.match(webhook, /TELEGRAM_CONTENT_WEBHOOK_SECRET/);
  assert.match(webhook, /timingSafeEqual/);
  assert.match(cron, /CRON_SECRET/);
  assert.match(cron, /authorization\.startsWith\("Bearer "\)/);
  assert.match(cron, /timingSafeEqual/);
  assert.deepEqual(JSON.parse(vercel).crons, [{ path: "/api/cron/content-sync", schedule: "15 1 * * *" }]);
});

test("所有外部内容只入候选草稿，不可自动发布", async () => {
  const [service, telegram, vk, instagram] = await Promise.all([
    read("lib/content-ingest/service.ts"),
    read("lib/content-ingest/connectors/telegram.ts"),
    read("lib/content-ingest/connectors/vk.ts"),
    read("lib/content-ingest/connectors/instagram.ts"),
  ]);
  assert.match(service, /export type CandidateInput/);
  assert.match(service, /upsertContentCandidate\(reviewOnlyCandidate\)/);
  assert.match(service, /translateContentCandidate/);
  assert.match(service, /applyCandidateTranslation/);
  assert.match(service, /export type ContentCandidateStatus = "pending_review"/);
  assert.match(service, /autoPublishAllowed: false/);
  for (const source of [service, telegram, vk, instagram]) {
    assert.doesNotMatch(source, /status:\s*["']published["']/);
  }
});

test("定时任务只发布已人工批准且到期的候选内容", async () => {
  const cron = await read("app/api/cron/content-sync/route.ts");
  assert.match(cron, /publishDueContentCandidates\("system:cron"\)/);
  assert.match(cron, /published/);
});
