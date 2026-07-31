import { getStoreDb } from "./store";

export const siteContentDefaults = {
  announcement: "实体商品满 198.00 元 免标准快递费",
  show_announcement: "1",
  hero_eyebrow: "púsy × Ü",
  hero_title: "礼物飞进\n你的订单",
  hero_subtitle: "猜猜你会收到哪一份？",
  hero_cta_label: "立即探索",
  hero_cta_url: "/catalog/products",
  hero2_eyebrow: "PÚSY 神秘礼盒",
  hero2_title: "装下这个夏天\n需要的一切",
  hero2_cta_label: "了解更多",
  hero2_cta_url: "/catalog/sekretnye-boksy",
  show_featured: "1",
  featured_title: "新品",
  featured_subtitle: "从当季新品开始，找到你的下一件日常心动。",
  featured_cta_label: "查看全部",
  show_categories: "1",
  categories_title: "按心情探索",
  category_1_label: "彩妆",
  category_1_url: "/catalog/makiyazh",
  category_2_label: "护肤",
  category_2_url: "/catalog/uhod",
  category_3_label: "家居",
  category_3_url: "/catalog/dlya-doma",
  show_reels: "1",
  reels_title: "你与 PÚSY",
  reels_subtitle: "真实灵感、使用方式与热门单品。",
  show_newsletter: "1",
  newsletter_title: "订阅邮件，立享 9 折",
  newsletter_success: "订阅成功，欢迎加入 PÚSY CLUB。",
} as const;

export type SiteContentKey = keyof typeof siteContentDefaults;
export type SiteContentSnapshot = Record<SiteContentKey, string>;

let schemaPromise: Promise<void> | null = null;

export async function ensureCommerceFeatureSchema() {
  schemaPromise ??= (async () => {
    const db = await getStoreDb();
    await db.batch(Object.entries(siteContentDefaults).map(([key, value]) => db.prepare("INSERT INTO site_content (key, value) VALUES (?, ?) ON CONFLICT(key) DO NOTHING").bind(key, value)));
  })().catch((error) => {
    schemaPromise = null;
    throw error;
  });
  return schemaPromise;
}

function safeInternalUrl(value: unknown, fallback: string) {
  const url = String(value ?? "").trim().slice(0, 300);
  return /^\/(?!\/)[A-Za-z0-9_?&=#%./-]*$/.test(url) ? url : fallback;
}

export function normalizeSiteContent(input: Record<string, unknown>, current: Record<string, string> = {}) {
  return Object.fromEntries(Object.entries(siteContentDefaults).map(([key, fallback]) => {
    if (key.startsWith("show_")) return [key, input[key] === true || input[key] === "1" || input[key] === "on" ? "1" : "0"];
    if (key.endsWith("_url")) return [key, safeInternalUrl(input[key], current[key] ?? fallback)];
    const value = String(input[key] ?? current[key] ?? fallback).trim().slice(0, key.includes("title") ? 180 : 300);
    return [key, value];
  })) as SiteContentSnapshot;
}

async function contentRows() {
  const db = await getStoreDb();
  const rows = await db.prepare("SELECT key, value FROM site_content ORDER BY key").all<{ key: string; value: string }>();
  return { ...siteContentDefaults, ...Object.fromEntries(rows.results.map((row) => [row.key, row.value])) } as SiteContentSnapshot;
}

async function applyRevision(revision: { id: string; snapshot_json: string }, actor: string) {
  const db = await getStoreDb();
  const snapshot = normalizeSiteContent(JSON.parse(revision.snapshot_json) as Record<string, unknown>);
  await db.batch([
    db.prepare("SELECT pg_advisory_xact_lock(hashtext('pusy-content-publish'))"),
    db.prepare("UPDATE content_revisions SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE status = 'published' AND id != ?").bind(revision.id),
    db.prepare("UPDATE content_revisions SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE status = 'scheduled' AND id != ? AND publish_at::timestamp <= CURRENT_TIMESTAMP").bind(revision.id),
    db.prepare("UPDATE content_revisions SET status = 'published', published_at = CURRENT_TIMESTAMP, created_by = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status != 'published'").bind(actor, revision.id).requireChanges("该内容版本已经发布"),
    ...Object.entries(snapshot).map(([key, value]) => db.prepare("INSERT INTO site_content (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP").bind(key, value)),
  ]);
  return snapshot;
}

export async function publishDueContent() {
  await ensureCommerceFeatureSchema();
  const db = await getStoreDb();
  const revision = await db.prepare("SELECT id, snapshot_json FROM content_revisions WHERE status = 'scheduled' AND publish_at::timestamp <= CURRENT_TIMESTAMP ORDER BY publish_at DESC LIMIT 1").first<{ id: string; snapshot_json: string }>();
  if (!revision) return false;
  await applyRevision(revision, "scheduler").catch((error) => {
    if (!(error instanceof Error) || !/已经发布/.test(error.message)) throw error;
  });
  return true;
}

export async function getSiteContent() {
  await ensureCommerceFeatureSchema();
  await publishDueContent();
  return contentRows();
}

export async function getContentWorkspace() {
  const db = await getStoreDb();
  const current = await getSiteContent();
  const revisions = await db.prepare("SELECT id, title, snapshot_json, status, publish_at, published_at, created_by, created_at, updated_at FROM content_revisions WHERE status = 'published' OR id IN (SELECT id FROM content_revisions ORDER BY created_at DESC LIMIT 100) ORDER BY created_at DESC").all();
  return { current, revisions: revisions.results };
}

export async function saveContentRevision(input: { title: string; content: Record<string, unknown>; status: "draft" | "scheduled" | "published"; publishAt?: string; actor: string }) {
  await ensureCommerceFeatureSchema();
  const current = await contentRows();
  const snapshot = normalizeSiteContent(input.content, current);
  const title = input.title.trim().slice(0, 100) || `首页内容 ${new Date().toLocaleString("zh-CN", { timeZone: "Asia/Shanghai" })}`;
  const publishAt = input.publishAt?.trim() || null;
  if (input.status === "scheduled" && (!publishAt || Number.isNaN(Date.parse(publishAt)) || new Date(publishAt).getTime() <= Date.now())) throw new Error("定时发布时间必须晚于当前时间");
  const id = `CNT-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
  const db = await getStoreDb();
  await db.prepare("INSERT INTO content_revisions (id, title, snapshot_json, status, publish_at, created_by) VALUES (?, ?, ?, ?, ?, ?)").bind(id, title, JSON.stringify(snapshot), input.status === "published" ? "draft" : input.status, publishAt, input.actor).run();
  if (input.status === "published") await applyRevision({ id, snapshot_json: JSON.stringify(snapshot) }, input.actor);
  return id;
}

export async function publishContentRevision(id: string, actor: string) {
  const db = await getStoreDb();
  const revision = await db.prepare("SELECT id, snapshot_json FROM content_revisions WHERE id = ? LIMIT 1").bind(id).first<{ id: string; snapshot_json: string }>();
  if (!revision) throw new Error("内容版本不存在");
  return applyRevision(revision, actor);
}

export async function deleteContentRevision(id: string) {
  const db = await getStoreDb();
  const result = await db.prepare("DELETE FROM content_revisions WHERE id = ? AND status IN ('draft','scheduled')").bind(id).run();
  if (!result.meta.changes) throw new Error("只能删除草稿或待发布版本");
}
