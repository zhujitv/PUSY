import { createHash, randomUUID } from "node:crypto";
import { getStoreDb } from "./store";
import {
  assertNoBlockingComplianceFlags,
  isSafePublicHttpsUrl,
  scanContentCompliance,
} from "../lib/content-ingest/compliance";
import {
  contentCandidateStatuses,
  contentRightsStatuses,
  contentSourceStatuses,
  contentTranslationStatuses,
  ingestRunStatuses,
  type BlogPost,
  type BlogPostInput,
  type BlogSection,
  type ContentCandidate,
  type ContentCandidateEvent,
  type ContentCandidateInput,
  type ContentCandidateStatus,
  type ContentIngestRun,
  type ContentRightsStatus,
  type ContentSource,
  type ContentSourceStatus,
  type ContentTranslationStatus,
  type IngestRunStatus,
  type JsonRecord,
  type PublishedBlogPost,
} from "../lib/content-ingest/types";

const editableCandidateStatuses: ContentCandidateStatus[] = ["fetched", "translating", "pending_review", "failed"];
const reviewableCandidateStatuses: ContentCandidateStatus[] = ["pending_review", "approved", "scheduled"];

function id(prefix: string) {
  return `${prefix}-${randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`;
}

function deterministicCandidateId(sourceId: string, externalId: string) {
  const digest = createHash("sha256").update(`${sourceId}:${externalId}`).digest("hex").slice(0, 20).toUpperCase();
  return `CTC-${digest}`;
}

function bounded(value: unknown, maximum: number) {
  return String(value ?? "").trim().slice(0, maximum);
}

function json(value: unknown, fallback: unknown, maximum = 100_000) {
  const encoded = JSON.stringify(value ?? fallback);
  if (encoded.length > maximum) throw new Error("内容数据超过允许大小");
  return encoded;
}

function parseObject(value: string): JsonRecord {
  try {
    const parsed = JSON.parse(value) as unknown;
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed as JsonRecord : {};
  } catch {
    return {};
  }
}

function reviewReminders(value: string) {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string").slice(0, 50) : [];
  } catch {
    return [];
  }
}

function normalizeHttpsUrl(value: unknown, label: string, allowEmpty = false) {
  const url = bounded(value, 2_000);
  if (!url && allowEmpty) return "";
  if (!isSafePublicHttpsUrl(url)) throw new Error(`${label}必须是公开的 HTTPS 地址`);
  return new URL(url).toString().replace(/\/$/, "");
}

function normalizeSlug(value: unknown) {
  const slug = bounded(value, 100).toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "");
  if (!slug) throw new Error("博客 slug 无效");
  return slug;
}

function normalizeSections(value: BlogSection[]) {
  if (!Array.isArray(value) || !value.length || value.length > 20) throw new Error("博客正文需要 1 至 20 个段落");
  return value.map((section) => {
    if (!Array.isArray(section)) throw new Error("博客段落格式无效");
    const title = bounded(section[0], 180);
    const copy = bounded(section[1], 8_000);
    if (!title || !copy) throw new Error("博客段落标题和正文不能为空");
    return [title, copy] as BlogSection;
  });
}

function normalizeBlogPost(input: BlogPostInput): BlogPostInput {
  const title = bounded(input.title, 180);
  const intro = bounded(input.intro, 1_000);
  if (!title || !intro) throw new Error("博客标题和导语不能为空");
  const coverImageUrl = bounded(input.coverImageUrl, 2_000);
  if (coverImageUrl && !coverImageUrl.startsWith("/") && !isSafePublicHttpsUrl(coverImageUrl)) throw new Error("博客封面地址无效");
  return {
    slug: normalizeSlug(input.slug),
    title,
    tag: bounded(input.tag, 80) || "美丽灵感",
    coverImageUrl,
    intro,
    sections: normalizeSections(input.sections),
    seoDescription: bounded(input.seoDescription || intro, 300),
  };
}

function parseSections(value: string): BlogSection[] {
  const parsed = JSON.parse(value) as unknown;
  if (!Array.isArray(parsed)) throw new Error("博客段落数据无效");
  return parsed.filter((section): section is BlogSection => Array.isArray(section) && typeof section[0] === "string" && typeof section[1] === "string");
}

async function candidateWithSource(candidateId: string) {
  const db = await getStoreDb();
  return db.prepare(`SELECT c.*, s.is_trusted AS source_is_trusted, s.rights_status AS source_rights_status,
      s.status AS source_status, s.ingest_enabled AS source_ingest_enabled, s.rights_metadata_json AS source_rights_metadata_json
    FROM content_candidates c JOIN content_sources s ON s.id = c.source_id WHERE c.id = ? LIMIT 1`)
    .bind(candidateId)
    .first<ContentCandidate & {
      source_is_trusted: boolean;
      source_rights_status: ContentRightsStatus;
      source_status: ContentSourceStatus;
      source_ingest_enabled: boolean;
      source_rights_metadata_json: string;
    }>();
}

async function candidateEvent(input: {
  candidateId: string;
  eventType: string;
  fromStatus?: ContentCandidateStatus | null;
  toStatus?: ContentCandidateStatus | null;
  actor?: string;
  details?: unknown;
}) {
  const db = await getStoreDb();
  await db.prepare("INSERT INTO content_candidate_events (candidate_id, event_type, from_status, to_status, actor, details_json) VALUES (?, ?, ?, ?, ?, ?)")
    .bind(input.candidateId, bounded(input.eventType, 80), input.fromStatus ?? null, input.toStatus ?? null, bounded(input.actor || "system", 160), json(input.details, {}, 20_000))
    .run();
}

export async function upsertContentSource(input: {
  id?: string;
  name: string;
  platform: string;
  accountUrl: string;
  feedUrl?: string;
  sourceType?: string;
  status?: ContentSourceStatus;
  isTrusted?: boolean;
  ingestEnabled?: boolean;
  rightsStatus?: ContentRightsStatus;
  rightsMetadata?: JsonRecord;
}) {
  const sourceId = bounded(input.id || id("SRC"), 120);
  const name = bounded(input.name, 160);
  const platform = bounded(input.platform, 60).toLowerCase();
  if (!sourceId || !name || !platform) throw new Error("内容来源 ID、名称和平台不能为空");
  const status = input.status ?? "active";
  const rightsStatus = input.rightsStatus ?? "pending";
  if (!contentSourceStatuses.includes(status) || !contentRightsStatuses.includes(rightsStatus)) throw new Error("内容来源状态无效");
  const accountUrl = normalizeHttpsUrl(input.accountUrl, "账号地址");
  const feedUrl = normalizeHttpsUrl(input.feedUrl, "采集地址", true);
  const db = await getStoreDb();
  return db.prepare(`INSERT INTO content_sources
      (id, name, platform, account_url, feed_url, source_type, status, is_trusted, ingest_enabled, rights_status, rights_metadata_json)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (id) DO UPDATE SET name = excluded.name, platform = excluded.platform,
        account_url = excluded.account_url, feed_url = excluded.feed_url, source_type = excluded.source_type,
        status = excluded.status, is_trusted = excluded.is_trusted, ingest_enabled = excluded.ingest_enabled,
        rights_status = excluded.rights_status, rights_metadata_json = excluded.rights_metadata_json,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *`)
    .bind(sourceId, name, platform, accountUrl, feedUrl, bounded(input.sourceType || "official_social", 80), status, Boolean(input.isTrusted), Boolean(input.ingestEnabled), rightsStatus, json(input.rightsMetadata, {}, 20_000))
    .first<ContentSource>();
}

export async function getContentSource(sourceId: string) {
  const db = await getStoreDb();
  return db.prepare("SELECT * FROM content_sources WHERE id = ? LIMIT 1").bind(sourceId).first<ContentSource>();
}

export async function listContentSources() {
  const db = await getStoreDb();
  const rows = await db.prepare("SELECT * FROM content_sources ORDER BY platform, name").all<ContentSource>();
  return rows.results;
}

export async function beginContentIngestRun(input: { sourceId: string; runKey: string; triggeredBy?: string }) {
  const source = await getContentSource(input.sourceId);
  if (!source || source.status !== "active" || !source.ingest_enabled || !source.is_trusted || source.rights_status !== "authorized") throw new Error("该内容来源尚未启用或未取得授权");
  const runKey = bounded(input.runKey, 240);
  if (!runKey) throw new Error("采集批次键不能为空");
  const runId = id("CIR");
  const db = await getStoreDb();
  const inserted = await db.prepare(`INSERT INTO content_ingest_runs (id, source_id, run_key, triggered_by)
      VALUES (?, ?, ?, ?) ON CONFLICT (run_key) DO NOTHING RETURNING *`)
    .bind(runId, input.sourceId, runKey, bounded(input.triggeredBy || "scheduler", 160))
    .first<ContentIngestRun>();
  const run = inserted ?? await db.prepare("SELECT * FROM content_ingest_runs WHERE run_key = ? LIMIT 1").bind(runKey).first<ContentIngestRun>();
  if (!run) throw new Error("无法建立内容采集批次");
  return { run, created: Boolean(inserted) };
}

export async function completeContentIngestRun(input: {
  runId: string;
  status: Exclude<IngestRunStatus, "running">;
  discovered?: number;
  imported?: number;
  updated?: number;
  failed?: number;
  error?: string;
}) {
  if (!ingestRunStatuses.includes(input.status)) throw new Error("采集完成状态无效");
  const counts = [input.discovered, input.imported, input.updated, input.failed].map((value) => Math.max(0, Math.floor(Number(value) || 0)));
  const db = await getStoreDb();
  const current = await db.prepare("SELECT * FROM content_ingest_runs WHERE id = ? LIMIT 1").bind(input.runId).first<ContentIngestRun>();
  if (!current) throw new Error("内容采集批次不存在");
  if (current.status !== "running") return current;
  await db.batch([
    db.prepare(`UPDATE content_ingest_runs SET status = ?, discovered_count = ?, imported_count = ?, updated_count = ?,
      failed_count = ?, error_text = ?, finished_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND status = 'running'`).bind(input.status, ...counts, bounded(input.error, 2_000), input.runId).requireChanges("内容采集批次已经结束"),
    db.prepare(`UPDATE content_sources SET last_synced_at = CASE WHEN ? IN ('succeeded','partial') THEN CURRENT_TIMESTAMP ELSE last_synced_at END,
      error_text = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?`).bind(input.status, bounded(input.error, 2_000), current.source_id),
  ]);
  return db.prepare("SELECT * FROM content_ingest_runs WHERE id = ? LIMIT 1").bind(input.runId).first<ContentIngestRun>();
}

export async function upsertContentCandidateWithResult(input: ContentCandidateInput) {
  const source = await getContentSource(input.sourceId);
  if (!source || source.status !== "active" || !source.ingest_enabled || !source.is_trusted || source.rights_status !== "authorized") throw new Error("候选稿只能来自已启用且已授权的官方来源");
  const externalId = bounded(input.externalId, 240);
  if (!externalId) throw new Error("来源内容 ID 不能为空");
  const sourceUrl = normalizeHttpsUrl(input.sourceUrl, "来源内容地址");
  const originalTitle = bounded(input.originalTitle, 1_000);
  const originalText = bounded(input.originalText, 40_000);
  const media = Array.isArray(input.media) ? input.media : [];
  if (!originalTitle && !originalText && !media.length) throw new Error("候选稿没有可采集的文字或素材");
  const candidateId = deterministicCandidateId(input.sourceId, externalId);
  const rights = {
    source_id: source.id,
    account_url: source.account_url,
    rights_status: source.rights_status,
    ...parseObject(source.rights_metadata_json),
    ...(input.rights ?? {}),
  };
  const translatedAtIngest = input.translationStatus === "translated";
  const translatedTitle = translatedAtIngest ? originalTitle : "";
  const translatedText = translatedAtIngest ? originalText : "";
  const automaticFlags = scanContentCompliance({
    sourceUrl,
    originalText: `${originalTitle}\n${originalText}`,
    translatedTitle,
    translatedText,
    isTrusted: source.is_trusted,
    rightsStatus: source.rights_status,
  });
  const flags = [...(input.complianceFlags ?? []), ...automaticFlags];
  const values = {
    sourceType: bounded(input.sourceType || source.source_type, 80),
    mediaJson: json(media, [], 200_000),
    rightsJson: json(rights, {}, 40_000),
    productRefsJson: json([...new Set(input.productRefs ?? [])].slice(0, 100), [], 20_000),
    complianceFlagsJson: json(flags, [], 40_000),
    translationStatus: translatedAtIngest ? "translated" : "pending",
    candidateStatus: translatedAtIngest ? "pending_review" : "fetched",
  };
  const db = await getStoreDb();
  const inserted = await db.prepare(`INSERT INTO content_candidates
      (id, source_id, external_id, source_url, source_type, original_title, original_text,
       translated_title, translated_text, media_json, rights_json, product_refs_json,
       compliance_flags_json, translation_status, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      ON CONFLICT (source_id, external_id) DO NOTHING RETURNING *`)
    .bind(candidateId, input.sourceId, externalId, sourceUrl, values.sourceType, originalTitle, originalText,
      translatedTitle, translatedText, values.mediaJson, values.rightsJson, values.productRefsJson,
      values.complianceFlagsJson, values.translationStatus, values.candidateStatus)
    .first<ContentCandidate>();
  if (inserted) {
    await candidateEvent({ candidateId: inserted.id, eventType: "fetched", toStatus: inserted.status, actor: input.actor || "system:ingest", details: { source_url: sourceUrl, external_id: externalId } });
    return { candidate: inserted, created: true, updated: false, sourceChanged: false };
  }

  const current = await db.prepare("SELECT * FROM content_candidates WHERE source_id = ? AND external_id = ? LIMIT 1").bind(input.sourceId, externalId).first<ContentCandidate>();
  if (!current) throw new Error("无法读取已存在的候选稿");
  const changed = current.source_url !== sourceUrl || current.original_title !== originalTitle || current.original_text !== originalText || current.media_json !== values.mediaJson;
  if (!changed) return { candidate: current, created: false, updated: false, sourceChanged: false };

  if (!editableCandidateStatuses.includes(current.status)) {
    const snapshotHash = createHash("sha256").update(`${originalTitle}\n${originalText}\n${values.mediaJson}`).digest("hex");
    await candidateEvent({ candidateId: current.id, eventType: "source_change_detected", fromStatus: current.status, toStatus: current.status, actor: input.actor || "system:ingest", details: { source_url: sourceUrl, snapshot_sha256: snapshotHash } });
    return { candidate: current, created: false, updated: false, sourceChanged: true };
  }

  await db.batch([
    db.prepare(`UPDATE content_candidates SET source_url = ?, source_type = ?, original_title = ?, original_text = ?,
      translated_title = ?, translated_text = ?, media_json = ?, rights_json = ?, product_refs_json = ?,
      compliance_flags_json = ?, translation_status = ?, status = ?, publish_at = NULL,
      reviewed_by = '', reviewed_at = NULL, rejected_reason = '', updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND status IN ('fetched','translating','pending_review','failed')`)
      .bind(sourceUrl, values.sourceType, originalTitle, originalText, translatedTitle, translatedText, values.mediaJson,
        values.rightsJson, values.productRefsJson, values.complianceFlagsJson, values.translationStatus, values.candidateStatus, current.id)
      .requireChanges("候选稿状态已变化，请重新采集"),
    db.prepare("INSERT INTO content_candidate_events (candidate_id, event_type, from_status, to_status, actor, details_json) VALUES (?, 'source_refreshed', ?, ?, ?, ?)")
      .bind(current.id, current.status, values.candidateStatus, bounded(input.actor || "system:ingest", 160), json({ source_url: sourceUrl, external_id: externalId }, {})),
  ]);
  const candidate = await db.prepare("SELECT * FROM content_candidates WHERE id = ? LIMIT 1").bind(current.id).first<ContentCandidate>();
  if (!candidate) throw new Error("更新后的候选稿不存在");
  return { candidate, created: false, updated: true, sourceChanged: true };
}

export const upsertContentCandidate = upsertContentCandidateWithResult;

export async function ingestContentCandidate(input: ContentCandidateInput) {
  return (await upsertContentCandidateWithResult(input)).candidate;
}

export async function applyCandidateTranslation(candidateId: string, input: {
  title?: string;
  text?: string;
  status: ContentTranslationStatus;
  actor?: string;
  model?: string;
  reason?: string;
  productRefs?: string[];
}, actorOverride?: string) {
  if (!contentTranslationStatuses.includes(input.status)) throw new Error("翻译状态无效");
  const current = await candidateWithSource(candidateId);
  if (!current) throw new Error("候选稿不存在");
  if (!editableCandidateStatuses.includes(current.status)) throw new Error("已审核或已发布的候选稿不能被自动翻译覆盖");
  const translatedTitle = bounded(input.title, 1_000);
  const translatedText = bounded(input.text, 40_000);
  if (["translated", "review_required"].includes(input.status) && (!translatedTitle || !translatedText)) throw new Error("翻译标题和正文不能为空");
  const nextStatus: ContentCandidateStatus = input.status === "failed" ? "failed" : ["translated", "review_required"].includes(input.status) ? "pending_review" : "fetched";
  const generatedFlags = scanContentCompliance({
    sourceUrl: current.source_url,
    originalText: `${current.original_title}\n${current.original_text}`,
    translatedTitle,
    translatedText,
    isTrusted: current.source_is_trusted,
    rightsStatus: current.source_rights_status,
  });
  const flags = [...reviewReminders(current.compliance_flags_json), ...generatedFlags];
  const productRefsJson = input.productRefs ? json([...new Set(input.productRefs)].slice(0, 100), [], 20_000) : current.product_refs_json;
  const db = await getStoreDb();
  await db.batch([
    db.prepare(`UPDATE content_candidates SET translated_title = ?, translated_text = ?, translation_status = ?, status = ?,
      product_refs_json = ?, compliance_flags_json = ?, rejected_reason = ?, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND status IN ('fetched','translating','pending_review','failed')`)
      .bind(translatedTitle, translatedText, input.status, nextStatus, productRefsJson, json(flags, [], 40_000), input.status === "failed" ? bounded(input.reason || "翻译失败", 2_000) : "", candidateId)
      .requireChanges("候选稿状态已变化，翻译结果未写入"),
    db.prepare("INSERT INTO content_candidate_events (candidate_id, event_type, from_status, to_status, actor, details_json) VALUES (?, ?, ?, ?, ?, ?)")
      .bind(candidateId, input.status === "failed" ? "translation_failed" : "translation_applied", current.status, nextStatus, bounded(actorOverride || input.actor || "system:translation", 160), json({ model: bounded(input.model, 160), reason: bounded(input.reason, 2_000), translation_status: input.status }, {}, 10_000)),
  ]);
  return db.prepare("SELECT * FROM content_candidates WHERE id = ? LIMIT 1").bind(candidateId).first<ContentCandidate>();
}

export async function updateContentCandidateDraft(input: {
  candidateId: string;
  actor: string;
  title: string;
  text: string;
  productRefs?: string[];
}) {
  const current = await candidateWithSource(input.candidateId);
  if (!current) throw new Error("候选稿不存在");
  if (current.status === "published") throw new Error("已发布内容请先撤回后再编辑");
  const translatedTitle = bounded(input.title, 1_000);
  const translatedText = bounded(input.text, 40_000);
  if (!translatedTitle || !translatedText) throw new Error("中文标题和正文不能为空");
  const flags = scanContentCompliance({
    sourceUrl: current.source_url,
    originalText: `${current.original_title}\n${current.original_text}`,
    translatedTitle,
    translatedText,
    isTrusted: current.source_is_trusted && current.source_status === "active",
    rightsStatus: current.source_rights_status,
  });
  const actor = bounded(input.actor, 160);
  const refs = input.productRefs ? json([...new Set(input.productRefs)].slice(0, 100), [], 20_000) : current.product_refs_json;
  const db = await getStoreDb();
  await db.batch([
    db.prepare("SELECT pg_advisory_xact_lock(hashtext(?))").bind(`pusy-content-candidate:${input.candidateId}`),
    db.prepare(`UPDATE content_candidates SET translated_title = ?, translated_text = ?, translation_status = 'translated',
      product_refs_json = ?, compliance_flags_json = ?, status = 'pending_review', publish_at = NULL,
      rejected_reason = '', reviewed_by = '', reviewed_at = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND status <> 'published'`)
      .bind(translatedTitle, translatedText, refs, json(flags, [], 40_000), input.candidateId)
      .requireChanges("候选稿状态已变化，无法保存中文草稿"),
    db.prepare("UPDATE blog_posts SET status = 'draft', publish_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE source_candidate_id = ? AND status IN ('scheduled','withdrawn')")
      .bind(input.candidateId),
    db.prepare("INSERT INTO content_candidate_events (candidate_id, event_type, from_status, to_status, actor, details_json) VALUES (?, 'draft_edited', ?, 'pending_review', ?, ?)")
      .bind(input.candidateId, current.status, actor, json({ product_refs: input.productRefs ?? null }, {}, 20_000)),
  ]);
  return db.prepare("SELECT * FROM content_candidates WHERE id = ? LIMIT 1").bind(input.candidateId).first<ContentCandidate>();
}

export async function approveContentCandidate(input: { candidateId: string; actor: string; publishAt?: string }) {
  const current = await candidateWithSource(input.candidateId);
  if (!current) throw new Error("候选稿不存在");
  if (!reviewableCandidateStatuses.includes(current.status) || current.status === "scheduled") throw new Error("只有待审核候选稿可以批准");
  if (!["translated", "review_required"].includes(current.translation_status)) throw new Error("候选稿翻译尚未完成");
  if (!current.source_is_trusted || current.source_rights_status !== "authorized" || current.source_status !== "active") throw new Error("来源授权或可信状态已失效");
  const generatedFlags = scanContentCompliance({
    sourceUrl: current.source_url,
    originalText: `${current.original_title}\n${current.original_text}`,
    translatedTitle: current.translated_title,
    translatedText: current.translated_text,
    isTrusted: current.source_is_trusted && current.source_status === "active",
    rightsStatus: current.source_rights_status,
  });
  assertNoBlockingComplianceFlags(generatedFlags);
  const complianceFlagsJson = json([...reviewReminders(current.compliance_flags_json), ...generatedFlags], [], 40_000);
  const requestedPublishAt = bounded(input.publishAt, 80);
  const publishTime = requestedPublishAt ? Date.parse(requestedPublishAt) : Number.NaN;
  if (requestedPublishAt && Number.isNaN(publishTime)) throw new Error("发布时间无效");
  const nextStatus: ContentCandidateStatus = requestedPublishAt && publishTime > Date.now() ? "scheduled" : "approved";
  const publishAt = nextStatus === "scheduled" ? new Date(publishTime).toISOString() : null;
  const db = await getStoreDb();
  await db.batch([
    db.prepare(`UPDATE content_candidates SET status = ?, translation_status = 'translated', publish_at = ?, compliance_flags_json = ?,
      rejected_reason = '', reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND status IN ('pending_review','approved')`)
      .bind(nextStatus, publishAt, complianceFlagsJson, bounded(input.actor, 160), input.candidateId).requireChanges("候选稿状态已变化，无法批准"),
    db.prepare("INSERT INTO content_candidate_events (candidate_id, event_type, from_status, to_status, actor, details_json) VALUES (?, 'approved', ?, ?, ?, ?)")
      .bind(input.candidateId, current.status, nextStatus, bounded(input.actor, 160), json({ publish_at: publishAt }, {})),
  ]);
  return db.prepare("SELECT * FROM content_candidates WHERE id = ? LIMIT 1").bind(input.candidateId).first<ContentCandidate>();
}

export async function rejectContentCandidate(input: { candidateId: string; actor: string; reason: string }) {
  const current = await candidateWithSource(input.candidateId);
  if (!current) throw new Error("候选稿不存在");
  if (!reviewableCandidateStatuses.includes(current.status)) throw new Error("当前候选稿不能被拒绝");
  const reason = bounded(input.reason, 2_000);
  if (!reason) throw new Error("拒绝原因不能为空");
  const db = await getStoreDb();
  await db.batch([
    db.prepare(`UPDATE content_candidates SET status = 'rejected', publish_at = NULL, rejected_reason = ?,
      reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND status IN ('pending_review','approved','scheduled')`)
      .bind(reason, bounded(input.actor, 160), input.candidateId).requireChanges("候选稿状态已变化，无法拒绝"),
    db.prepare("UPDATE blog_posts SET status = 'draft', publish_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE source_candidate_id = ? AND status = 'scheduled'").bind(input.candidateId),
    db.prepare("INSERT INTO content_candidate_events (candidate_id, event_type, from_status, to_status, actor, details_json) VALUES (?, 'rejected', ?, 'rejected', ?, ?)")
      .bind(input.candidateId, current.status, bounded(input.actor, 160), json({ reason }, {})),
  ]);
  return db.prepare("SELECT * FROM content_candidates WHERE id = ? LIMIT 1").bind(input.candidateId).first<ContentCandidate>();
}

function blogValues(post: BlogPostInput) {
  const normalized = normalizeBlogPost(post);
  return { ...normalized, sectionsJson: json(normalized.sections, [], 100_000) };
}

export async function scheduleContentCandidate(input: { candidateId: string; actor: string; publishAt: string; post: BlogPostInput }) {
  const current = await candidateWithSource(input.candidateId);
  if (!current) throw new Error("候选稿不存在");
  if (!['approved', 'scheduled'].includes(current.status)) throw new Error("只有已批准候选稿可以排期");
  if (!current.source_is_trusted || current.source_rights_status !== "authorized" || current.source_status !== "active") throw new Error("来源授权或可信状态已失效");
  assertNoBlockingComplianceFlags(current.compliance_flags_json);
  const publishTime = Date.parse(input.publishAt);
  if (Number.isNaN(publishTime) || publishTime <= Date.now()) throw new Error("排期时间必须晚于当前时间");
  const publishAt = new Date(publishTime).toISOString();
  const post = blogValues(input.post);
  const postId = id("BLG");
  const snapshot = json({ ...post, status: "scheduled", publish_at: publishAt, source_candidate_id: input.candidateId }, {}, 120_000);
  const db = await getStoreDb();
  await db.batch([
    db.prepare("SELECT pg_advisory_xact_lock(hashtext(?))").bind(`pusy-content-candidate:${input.candidateId}`),
    db.prepare(`UPDATE content_candidates SET status = 'scheduled', publish_at = ?, reviewed_by = ?, reviewed_at = COALESCE(reviewed_at, CURRENT_TIMESTAMP), updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND status IN ('approved','scheduled')`).bind(publishAt, bounded(input.actor, 160), input.candidateId).requireChanges("候选稿状态已变化，无法排期"),
    db.prepare(`INSERT INTO blog_posts
      (id, slug, title, tag, cover_image_url, intro, sections_json, status, publish_at, source_candidate_id, seo_description)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?)
      ON CONFLICT (source_candidate_id) DO UPDATE SET slug = excluded.slug, title = excluded.title, tag = excluded.tag,
        cover_image_url = excluded.cover_image_url, intro = excluded.intro, sections_json = excluded.sections_json,
        status = 'scheduled', publish_at = excluded.publish_at, seo_description = excluded.seo_description,
        withdrawn_at = NULL, withdrawn_by = '', withdrawal_reason = '', updated_at = CURRENT_TIMESTAMP`)
      .bind(postId, post.slug, post.title, post.tag, post.coverImageUrl, post.intro, post.sectionsJson, publishAt, input.candidateId, post.seoDescription),
    db.prepare(`INSERT INTO blog_post_revisions (blog_post_id, revision_number, event_type, snapshot_json, actor)
      SELECT id, COALESCE((SELECT MAX(revision_number) + 1 FROM blog_post_revisions WHERE blog_post_id = blog_posts.id), 1), 'scheduled', ?, ?
      FROM blog_posts WHERE source_candidate_id = ?`).bind(snapshot, bounded(input.actor, 160), input.candidateId),
    db.prepare("INSERT INTO content_candidate_events (candidate_id, event_type, from_status, to_status, actor, details_json) VALUES (?, 'scheduled', ?, 'scheduled', ?, ?)")
      .bind(input.candidateId, current.status, bounded(input.actor, 160), json({ publish_at: publishAt, slug: post.slug }, {})),
  ]);
  return db.prepare("SELECT * FROM blog_posts WHERE source_candidate_id = ? LIMIT 1").bind(input.candidateId).first<BlogPost>();
}

export async function publishContentCandidate(input: { candidateId: string; actor: string; post?: BlogPostInput; allowEarly?: boolean }) {
  const current = await candidateWithSource(input.candidateId);
  if (!current) throw new Error("候选稿不存在");
  if (!['approved', 'scheduled'].includes(current.status)) throw new Error("未经人工批准的候选稿不能发布");
  if (current.status === "scheduled" && !input.allowEarly && (!current.publish_at || Date.parse(current.publish_at) > Date.now())) throw new Error("候选稿尚未到发布时间");
  if (!current.source_is_trusted || current.source_rights_status !== "authorized" || current.source_status !== "active") throw new Error("来源授权或可信状态已失效");
  assertNoBlockingComplianceFlags(current.compliance_flags_json);
  const existing = await (await getStoreDb()).prepare("SELECT * FROM blog_posts WHERE source_candidate_id = ? LIMIT 1").bind(input.candidateId).first<BlogPost>();
  const sourcePost = input.post ?? (existing ? {
    slug: existing.slug,
    title: existing.title,
    tag: existing.tag,
    coverImageUrl: existing.cover_image_url,
    intro: existing.intro,
    sections: parseSections(existing.sections_json),
    seoDescription: existing.seo_description,
  } : null);
  if (!sourcePost) throw new Error("发布前必须完成博客标题、封面和正文编辑");
  const post = blogValues(sourcePost);
  const postId = existing?.id ?? id("BLG");
  const actor = bounded(input.actor, 160) || "system";
  const snapshot = json({ ...post, status: "published", source_candidate_id: input.candidateId }, {}, 120_000);
  const db = await getStoreDb();
  await db.batch([
    db.prepare("SELECT pg_advisory_xact_lock(hashtext(?))").bind(`pusy-content-candidate:${input.candidateId}`),
    db.prepare(`INSERT INTO blog_posts
      (id, slug, title, tag, cover_image_url, intro, sections_json, status, publish_at, published_at, source_candidate_id, seo_description)
      SELECT ?, ?, ?, ?, ?, ?, ?, 'published', c.publish_at, CURRENT_TIMESTAMP, c.id, ?
      FROM content_candidates c
      WHERE c.id = ? AND (c.status = 'approved' OR (c.status = 'scheduled' AND (? = TRUE OR c.publish_at::timestamp <= CURRENT_TIMESTAMP)))
      ON CONFLICT (source_candidate_id) DO UPDATE SET slug = excluded.slug, title = excluded.title, tag = excluded.tag,
        cover_image_url = excluded.cover_image_url, intro = excluded.intro, sections_json = excluded.sections_json,
        status = 'published', publish_at = excluded.publish_at, published_at = CURRENT_TIMESTAMP,
        seo_description = excluded.seo_description, withdrawn_at = NULL, withdrawn_by = '', withdrawal_reason = '', updated_at = CURRENT_TIMESTAMP`)
      .bind(postId, post.slug, post.title, post.tag, post.coverImageUrl, post.intro, post.sectionsJson, post.seoDescription, input.candidateId, Boolean(input.allowEarly))
      .requireChanges("候选稿尚未审核通过或尚未到发布时间"),
    db.prepare(`UPDATE content_candidates SET status = 'published', published_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ? AND (status = 'approved' OR (status = 'scheduled' AND (? = TRUE OR publish_at::timestamp <= CURRENT_TIMESTAMP)))`)
      .bind(input.candidateId, Boolean(input.allowEarly)).requireChanges("候选稿发布状态已变化"),
    db.prepare(`INSERT INTO blog_post_revisions (blog_post_id, revision_number, event_type, snapshot_json, actor)
      SELECT id, COALESCE((SELECT MAX(revision_number) + 1 FROM blog_post_revisions WHERE blog_post_id = blog_posts.id), 1), 'published', ?, ?
      FROM blog_posts WHERE source_candidate_id = ?`).bind(snapshot, actor, input.candidateId),
    db.prepare("INSERT INTO content_candidate_events (candidate_id, event_type, from_status, to_status, actor, details_json) VALUES (?, 'published', ?, 'published', ?, ?)")
      .bind(input.candidateId, current.status, actor, json({ slug: post.slug, early_release: Boolean(input.allowEarly && current.status === "scheduled") }, {})),
  ]);
  return db.prepare("SELECT * FROM blog_posts WHERE source_candidate_id = ? LIMIT 1").bind(input.candidateId).first<BlogPost>();
}

export async function publishDueContentCandidates(actor = "system:cron") {
  const db = await getStoreDb();
  const due = await db.prepare(`SELECT c.id FROM content_candidates c JOIN blog_posts b ON b.source_candidate_id = c.id
    WHERE c.status = 'scheduled' AND c.publish_at::timestamp <= CURRENT_TIMESTAMP AND b.status = 'scheduled'
    ORDER BY c.publish_at, c.created_at LIMIT 50`).all<{ id: string }>();
  let published = 0;
  for (const candidate of due.results) {
    try {
      await publishContentCandidate({ candidateId: candidate.id, actor });
      published += 1;
    } catch (error) {
      await candidateEvent({ candidateId: candidate.id, eventType: "publish_failed", fromStatus: "scheduled", toStatus: "scheduled", actor, details: { error: error instanceof Error ? error.message : "发布失败" } }).catch(() => undefined);
    }
  }
  return published;
}

export async function withdrawContentCandidate(input: { candidateId: string; actor: string; reason: string }) {
  const reason = bounded(input.reason, 2_000);
  if (!reason) throw new Error("撤回原因不能为空");
  const candidate = await candidateWithSource(input.candidateId);
  if (!candidate || !["scheduled", "published"].includes(candidate.status)) throw new Error("只有已排期或已发布的候选稿可以撤回");
  const db = await getStoreDb();
  const post = await db.prepare("SELECT * FROM blog_posts WHERE source_candidate_id = ? LIMIT 1").bind(input.candidateId).first<BlogPost>();
  if (!post || !["scheduled", "published"].includes(post.status)) throw new Error("候选稿尚未建立可撤回的博客文章");
  const actor = bounded(input.actor, 160);
  const snapshot = json({ ...post, status: "withdrawn", withdrawal_reason: reason }, {}, 120_000);
  await db.batch([
    db.prepare("SELECT pg_advisory_xact_lock(hashtext(?))").bind(`pusy-content-candidate:${input.candidateId}`),
    db.prepare(`UPDATE blog_posts SET status = 'withdrawn', withdrawn_at = CURRENT_TIMESTAMP, withdrawn_by = ?,
      withdrawal_reason = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status IN ('scheduled','published')`)
      .bind(actor, reason, post.id).requireChanges("文章状态已变化，无法撤回"),
    db.prepare("UPDATE content_candidates SET status = 'withdrawn', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status IN ('scheduled','published')")
      .bind(input.candidateId).requireChanges("候选稿状态已变化，无法撤回"),
    db.prepare(`INSERT INTO blog_post_revisions (blog_post_id, revision_number, event_type, snapshot_json, actor)
      SELECT id, COALESCE((SELECT MAX(revision_number) + 1 FROM blog_post_revisions WHERE blog_post_id = blog_posts.id), 1), 'withdrawn', ?, ?
      FROM blog_posts WHERE id = ?`).bind(snapshot, actor, post.id),
    db.prepare("INSERT INTO content_candidate_events (candidate_id, event_type, from_status, to_status, actor, details_json) VALUES (?, 'withdrawn', ?, 'withdrawn', ?, ?)")
      .bind(input.candidateId, candidate.status, actor, json({ slug: post.slug, reason }, {})),
  ]);
  return db.prepare("SELECT * FROM blog_posts WHERE id = ? LIMIT 1").bind(post.id).first<BlogPost>();
}

export async function withdrawPublishedBlogPost(input: { slug: string; actor: string; reason: string }) {
  const slug = normalizeSlug(input.slug);
  const db = await getStoreDb();
  const post = await db.prepare("SELECT source_candidate_id FROM blog_posts WHERE slug = ? LIMIT 1").bind(slug).first<{ source_candidate_id: string }>();
  if (!post) throw new Error("博客文章不存在");
  return withdrawContentCandidate({ candidateId: post.source_candidate_id, actor: input.actor, reason: input.reason });
}

export async function getPublishedBlogPosts(limit = 100): Promise<PublishedBlogPost[]> {
  await publishDueContentCandidates();
  const db = await getStoreDb();
  const rows = await db.prepare(`SELECT * FROM blog_posts WHERE status = 'published'
    AND published_at IS NOT NULL AND published_at::timestamp <= CURRENT_TIMESTAMP
    ORDER BY published_at DESC, created_at DESC LIMIT ?`).bind(Math.min(Math.max(Math.floor(limit), 1), 200)).all<BlogPost>();
  return rows.results.map((post) => ({ ...post, sections: parseSections(post.sections_json) }));
}

export async function getPublishedBlogPost(slug: string): Promise<PublishedBlogPost | null> {
  await publishDueContentCandidates();
  const normalizedSlug = normalizeSlug(slug);
  const db = await getStoreDb();
  const post = await db.prepare(`SELECT * FROM blog_posts WHERE slug = ? AND status = 'published'
    AND published_at IS NOT NULL AND published_at::timestamp <= CURRENT_TIMESTAMP LIMIT 1`).bind(normalizedSlug).first<BlogPost>();
  return post ? { ...post, sections: parseSections(post.sections_json) } : null;
}

export async function listContentCandidates(input: { status?: ContentCandidateStatus; limit?: number } = {}) {
  if (input.status && !contentCandidateStatuses.includes(input.status)) throw new Error("候选稿状态无效");
  const db = await getStoreDb();
  const limit = Math.min(Math.max(Math.floor(input.limit ?? 100), 1), 500);
  const rows = input.status
    ? await db.prepare("SELECT * FROM content_candidates WHERE status = ? ORDER BY created_at DESC LIMIT ?").bind(input.status, limit).all<ContentCandidate>()
    : await db.prepare("SELECT * FROM content_candidates ORDER BY created_at DESC LIMIT ?").bind(limit).all<ContentCandidate>();
  return rows.results;
}

export async function getContentCandidate(candidateId: string) {
  const db = await getStoreDb();
  return db.prepare("SELECT * FROM content_candidates WHERE id = ? LIMIT 1").bind(candidateId).first<ContentCandidate>();
}

export async function getContentCandidateEvents(candidateId: string) {
  const db = await getStoreDb();
  const rows = await db.prepare("SELECT * FROM content_candidate_events WHERE candidate_id = ? ORDER BY created_at, id").bind(candidateId).all<ContentCandidateEvent>();
  return rows.results;
}
