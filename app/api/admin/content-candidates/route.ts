import { getStoreDb } from "../../../../db/store";
import {
  applyCandidateTranslation,
  approveContentCandidate,
  publishContentCandidate,
  rejectContentCandidate,
  scheduleContentCandidate,
  updateContentCandidateDraft,
  withdrawContentCandidate,
} from "../../../../db/content-ingest";
import { getAdminIdentity, type AdminIdentity } from "../../../../lib/admin-auth";
import { completeAdminAudit, recordAdminAudit } from "../../../../lib/admin-governance";
import { roleCan } from "../../../../lib/admin-permissions";
import { assertNoBlockingComplianceFlags, isSafePublicHttpsUrl, scanContentCompliance } from "../../../../lib/content-ingest/compliance";
import { contentTranslationState, translateContentCandidate } from "../../../../lib/content-ingest/translation";
import type { BlogPostInput } from "../../../../lib/content-ingest/types";
import { hasTrustedOrigin, safeServerError } from "../../../../lib/request-security";

const actions = [
  "update-candidate",
  "translate-candidate",
  "approve-candidate",
  "reject-candidate",
  "schedule-candidate",
  "publish-candidate",
  "withdraw-candidate",
] as const;

type CandidateAction = typeof actions[number];
type StoreDb = Awaited<ReturnType<typeof getStoreDb>>;

type CandidateRow = {
  id: string;
  source_id: string;
  external_id: string;
  source_url: string;
  source_type: string;
  original_title: string;
  original_text: string;
  translated_title: string;
  translated_text: string;
  media_json: string;
  rights_json: string;
  product_refs_json: string;
  compliance_flags_json: string;
  translation_status: string;
  status: string;
  publish_at: string | null;
  published_at: string | null;
  rejected_reason: string | null;
  reviewed_by: string | null;
  reviewed_at: string | null;
  created_at: string;
  updated_at: string;
  source_name: string;
  source_platform: string;
  source_status: string;
  source_is_trusted: boolean | number;
  source_rights_status: string;
};

class ContentCandidateError extends Error {
  constructor(message: string, readonly status: number) {
    super(message);
  }
}

const candidateSelect = `SELECT
  c.id, c.source_id, c.external_id, c.source_url, c.source_type,
  c.original_title, c.original_text, c.translated_title, c.translated_text,
  c.media_json, c.rights_json, c.product_refs_json, c.compliance_flags_json,
  c.translation_status, c.status, c.publish_at, c.published_at,
  c.rejected_reason, c.reviewed_by, c.reviewed_at, c.created_at, c.updated_at,
  s.name AS source_name, s.platform AS source_platform, s.status AS source_status,
  s.is_trusted AS source_is_trusted, s.rights_status AS source_rights_status
FROM content_candidates c
JOIN content_sources s ON s.id = c.source_id`;

function positiveInteger(value: string | null, fallback: number, maximum: number) {
  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? Math.min(parsed, maximum) : fallback;
}

function isTrusted(candidate: CandidateRow) {
  return candidate.source_is_trusted === true || Number(candidate.source_is_trusted) === 1;
}

function candidateId(value: unknown) {
  const id = String(value ?? "").trim().slice(0, 160);
  if (!id || !/^[A-Za-z0-9_-]+$/.test(id)) throw new ContentCandidateError("内容候选编号无效", 400);
  return id;
}

function productReferences(value: unknown) {
  if (value === undefined) return undefined;
  const items = Array.isArray(value) ? value : typeof value === "string" ? value.split(/[,，\n]/u) : null;
  if (!items) throw new ContentCandidateError("关联商品格式无效", 400);
  return [...new Set(items.map((item) => String(item ?? "").trim()).filter(Boolean))]
    .slice(0, 50)
    .map((item) => item.slice(0, 160));
}

function safeCoverImage(mediaJson: string) {
  const candidates: string[] = [];
  const visit = (value: unknown, depth = 0) => {
    if (depth > 3 || candidates.length >= 20) return;
    if (typeof value === "string") {
      candidates.push(value.trim());
      return;
    }
    if (Array.isArray(value)) {
      value.forEach((item) => visit(item, depth + 1));
      return;
    }
    if (!value || typeof value !== "object") return;
    const record = value as Record<string, unknown>;
    ["url", "src", "image", "image_url", "preview_url", "thumbnail_url"].forEach((key) => visit(record[key], depth + 1));
  };
  try {
    visit(JSON.parse(mediaJson || "[]") as unknown);
  } catch {
    return "";
  }
  return candidates.find((value) => isSafePublicHttpsUrl(value)
    || (/^\/(?!\/)/.test(value) && !value.includes("..") && !value.includes("\\"))) ?? "";
}

function splitBlogSections(text: string): BlogPostInput["sections"] {
  const remaining = text.trim();
  const sections: BlogPostInput["sections"] = [];
  let offset = 0;
  while (offset < remaining.length && sections.length < 20) {
    const maximumEnd = Math.min(offset + 7_800, remaining.length);
    let end = maximumEnd;
    if (maximumEnd < remaining.length) {
      const window = remaining.slice(offset, maximumEnd);
      const boundaries = [window.lastIndexOf("\n"), window.lastIndexOf("。"), window.lastIndexOf("！"), window.lastIndexOf("？")];
      const boundary = Math.max(...boundaries);
      if (boundary >= 2_000) end = offset + boundary + 1;
    }
    const copy = remaining.slice(offset, end).trim();
    if (copy) sections.push([sections.length ? `内容 ${sections.length + 1}` : "正文", copy]);
    offset = end;
  }
  if (!sections.length) throw new ContentCandidateError("中文正文不能为空", 409);
  return sections;
}

function candidateBlogPost(candidate: CandidateRow): BlogPostInput {
  const title = String(candidate.translated_title ?? "").trim().slice(0, 180);
  const text = String(candidate.translated_text ?? "").trim();
  if (!title || !text) throw new ContentCandidateError("请先完成中文标题和正文", 409);
  const firstParagraph = text.split(/\n+/u).map((item) => item.trim()).find(Boolean) ?? text;
  const stableSlug = `brand-news-${candidate.id}`.toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 100);
  return {
    slug: stableSlug,
    title,
    tag: "品牌动态",
    coverImageUrl: safeCoverImage(candidate.media_json),
    intro: firstParagraph.slice(0, 1_000),
    sections: splitBlogSections(text),
    seoDescription: firstParagraph.slice(0, 300),
  };
}

async function contentMutation<T>(operation: () => Promise<T>) {
  try {
    return await operation();
  } catch (error) {
    if (error instanceof ContentCandidateError) throw error;
    const message = error instanceof Error ? error.message : "内容状态已变化，请刷新后重试";
    if (/[\u3400-\u9fff]/u.test(message)) throw new ContentCandidateError(message, 409);
    throw error;
  }
}

function publicationReady(candidate: CandidateRow) {
  if (!isTrusted(candidate) || candidate.source_status !== "active") {
    throw new ContentCandidateError("该内容不来自已启用的可信来源，不能批准或发布", 409);
  }
  if (candidate.source_rights_status !== "authorized") {
    throw new ContentCandidateError("该来源尚未完成中国站转载授权确认", 409);
  }
  if (!["translated", "review_required"].includes(candidate.translation_status)
    || !String(candidate.translated_title ?? "").trim()
    || !String(candidate.translated_text ?? "").trim()) {
    throw new ContentCandidateError("请先完成中文翻译并检查标题和正文", 409);
  }
}

async function getCandidate(db: StoreDb, id: string) {
  const candidate = await db.prepare(`${candidateSelect} WHERE c.id = ? LIMIT 1`).bind(id).first<CandidateRow>();
  if (!candidate) throw new ContentCandidateError("内容候选不存在", 404);
  return candidate;
}

async function refreshCompliance(db: StoreDb, candidate: CandidateRow) {
  const flags = scanContentCompliance({
    sourceUrl: candidate.source_url,
    originalText: candidate.original_text,
    translatedTitle: candidate.translated_title,
    translatedText: candidate.translated_text,
    isTrusted: isTrusted(candidate) && candidate.source_status === "active",
    rightsStatus: candidate.source_rights_status === "authorized" ? "authorized" : candidate.source_rights_status === "revoked" ? "revoked" : "pending",
  });
  let existing: unknown[] = [];
  try {
    const parsed = JSON.parse(candidate.compliance_flags_json || "[]") as unknown;
    if (Array.isArray(parsed)) existing = parsed;
  } catch {
    existing = [];
  }
  const reviewReminders = existing.filter((flag) => typeof flag === "string");
  await db.prepare("UPDATE content_candidates SET compliance_flags_json = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?")
    .bind(JSON.stringify([...new Set(reviewReminders), ...flags]), candidate.id)
    .run();
  return flags;
}

function requireComplianceApproval(flags: ReturnType<typeof scanContentCompliance>) {
  try {
    assertNoBlockingComplianceFlags(flags);
  } catch (error) {
    throw new ContentCandidateError(error instanceof Error ? error.message : "内容仍有未解决的合规阻断项", 409);
  }
}

async function requireContentManager() {
  const actor = await getAdminIdentity();
  if (!actor) throw new ContentCandidateError("请先登录管理后台", 401);
  if (!roleCan(actor.role, "content.manage")) throw new ContentCandidateError("当前账号没有管理内容的权限", 403);
  return actor;
}

function actionSummary(action: CandidateAction, payload: Record<string, unknown>) {
  if (action === "update-candidate") return "编辑候选内容中文标题、正文和关联商品";
  if (action === "translate-candidate") return "请求翻译候选内容";
  if (action === "approve-candidate") return "批准候选内容";
  if (action === "reject-candidate") return `拒绝候选内容：${String(payload.reason ?? "").trim()}`;
  if (action === "schedule-candidate") return `排期发布：${String(payload.publishAt ?? payload.publish_at ?? "")}`;
  if (action === "publish-candidate") return "立即发布候选内容";
  return "撤回候选内容";
}

async function auditAction(request: Request, actor: AdminIdentity, action: CandidateAction, id: string, payload: Record<string, unknown>) {
  return recordAdminAudit({ request, actor, action, entityId: id, summary: actionSummary(action, payload).slice(0, 500) });
}

export async function GET(request: Request) {
  try {
    await requireContentManager();
    const url = new URL(request.url);
    const status = (url.searchParams.get("status") ?? "").trim().slice(0, 40);
    const sourceId = (url.searchParams.get("sourceId") ?? "").trim().slice(0, 160);
    const query = (url.searchParams.get("q") ?? "").trim().slice(0, 200);
    const limit = positiveInteger(url.searchParams.get("limit"), 100, 300);
    const page = positiveInteger(url.searchParams.get("page"), 1, 10_000);
    const offset = (page - 1) * limit;
    const db = await getStoreDb();

    const [sources, candidates, summary] = await Promise.all([
      db.prepare(`SELECT id, name, platform, account_url, feed_url, source_type, status,
        is_trusted, ingest_enabled, rights_status, rights_metadata_json,
        last_synced_at, error_text, created_at, updated_at
        FROM content_sources ORDER BY is_trusted DESC, name ASC`).all(),
      db.prepare(`${candidateSelect}
        WHERE (? = '' OR c.status = ?)
          AND (? = '' OR c.source_id = ?)
          AND (? = '' OR c.original_title ILIKE '%' || ? || '%' OR c.translated_title ILIKE '%' || ? || '%' OR c.original_text ILIKE '%' || ? || '%' OR c.translated_text ILIKE '%' || ? || '%')
        ORDER BY CASE c.status WHEN 'fetched' THEN 1 WHEN 'pending_review' THEN 2 WHEN 'approved' THEN 3 WHEN 'scheduled' THEN 4 ELSE 5 END,
          COALESCE(c.publish_at, c.created_at) DESC
        LIMIT ? OFFSET ?`)
        .bind(status, status, sourceId, sourceId, query, query, query, query, query, limit, offset)
        .all<CandidateRow>(),
      db.prepare(`SELECT
        COUNT(*)::INTEGER AS total,
        COUNT(*) FILTER (WHERE translation_status = 'pending')::INTEGER AS pending_translation,
        COUNT(*) FILTER (WHERE status = 'pending_review')::INTEGER AS pending_review,
        COUNT(*) FILTER (WHERE status = 'approved')::INTEGER AS approved,
        COUNT(*) FILTER (WHERE status = 'rejected')::INTEGER AS rejected,
        COUNT(*) FILTER (WHERE status = 'scheduled')::INTEGER AS scheduled,
        COUNT(*) FILTER (WHERE status = 'published')::INTEGER AS published,
        COUNT(*) FILTER (WHERE status = 'withdrawn')::INTEGER AS withdrawn
        FROM content_candidates`).first(),
    ]);

    return Response.json({
      sources: sources.results,
      candidates: candidates.results,
      summary: summary ?? { total: 0, pending_translation: 0, pending_review: 0, approved: 0, rejected: 0, scheduled: 0, published: 0, withdrawn: 0 },
      translation: contentTranslationState(),
    }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    if (error instanceof ContentCandidateError) return Response.json({ error: error.message }, { status: error.status });
    console.error("[api/admin/content-candidates] read failed", { message: error instanceof Error ? error.message : String(error) });
    return safeServerError("读取内容审核工作台失败，请稍后再试");
  }
}

export async function POST(request: Request) {
  let auditId: number | null = null;
  let auditCompleted = false;
  try {
    const actor = await requireContentManager();
    if (!hasTrustedOrigin(request)) throw new ContentCandidateError("请求来源无效", 403);
    const payload = await request.json() as Record<string, unknown>;
    const action = String(payload.action ?? "") as CandidateAction;
    if (!actions.includes(action)) throw new ContentCandidateError("未知的内容审核操作", 400);
    const id = candidateId(payload.id);
    const db = await getStoreDb();
    auditId = await auditAction(request, actor, action, id, payload);
    let candidate = await getCandidate(db, id);

    if (action === "update-candidate") {
      if (candidate.status === "published") throw new ContentCandidateError("已发布内容请先撤回后再编辑", 409);
      const translatedTitle = String(payload.translatedTitle ?? payload.translated_title ?? "").trim().slice(0, 300);
      const translatedText = String(payload.translatedText ?? payload.translated_text ?? "").trim().slice(0, 50_000);
      const refs = productReferences(payload.productRefs ?? payload.product_refs);
      if (!translatedTitle || !translatedText) throw new ContentCandidateError("请完整填写中文标题和正文", 400);
      await contentMutation(() => updateContentCandidateDraft({
        candidateId: id,
        title: translatedTitle,
        text: translatedText,
        actor: actor.email,
        productRefs: refs,
      }));
    } else if (action === "translate-candidate") {
      if (candidate.status === "published") throw new ContentCandidateError("已发布内容不能直接重新翻译，请先撤回", 409);
      const translation = await translateContentCandidate({ title: candidate.original_title, text: candidate.original_text });
      const canApplyAutomaticTranslation = ["fetched", "translating", "pending_review", "failed"].includes(candidate.status);
      if (translation.status === "pending") {
        await completeAdminAudit(auditId, "succeeded");
        auditCompleted = true;
        return Response.json({ ok: true, candidate, translation });
      }
      if (translation.status === "failed") {
        if (canApplyAutomaticTranslation) {
          await contentMutation(() => applyCandidateTranslation(id, {
            status: "failed",
            actor: actor.email,
            model: translation.model,
            reason: translation.reason,
          }, actor.email));
        }
        throw new ContentCandidateError(translation.reason, 502);
      }
      if (canApplyAutomaticTranslation) {
        await contentMutation(() => applyCandidateTranslation(id, {
          title: translation.title,
          text: translation.text,
          status: "review_required",
          actor: actor.email,
          model: translation.model,
        }, actor.email));
      } else {
        await contentMutation(() => updateContentCandidateDraft({ candidateId: id, title: translation.title, text: translation.text, actor: actor.email }));
      }
      candidate = await getCandidate(db, id);
      await completeAdminAudit(auditId, "succeeded");
      auditCompleted = true;
      return Response.json({ ok: true, candidate, translation });
    } else if (action === "approve-candidate") {
      publicationReady(candidate);
      requireComplianceApproval(await refreshCompliance(db, candidate));
      if (["published", "scheduled"].includes(candidate.status)) throw new ContentCandidateError("该内容当前状态不能重复批准", 409);
      await contentMutation(() => approveContentCandidate({ candidateId: id, actor: actor.email }));
    } else if (action === "reject-candidate") {
      if (candidate.status === "published") throw new ContentCandidateError("已发布内容请先撤回，不能直接拒绝", 409);
      const reason = String(payload.reason ?? "").trim().slice(0, 1000);
      if (!reason) throw new ContentCandidateError("请填写拒绝原因", 400);
      await contentMutation(() => rejectContentCandidate({ candidateId: id, actor: actor.email, reason }));
    } else if (action === "schedule-candidate") {
      publicationReady(candidate);
      requireComplianceApproval(await refreshCompliance(db, candidate));
      if (!["approved", "scheduled"].includes(candidate.status)) throw new ContentCandidateError("只有已批准内容可以排期", 409);
      const rawPublishAt = String(payload.publishAt ?? payload.publish_at ?? "").trim();
      const timestamp = Date.parse(rawPublishAt);
      if (!rawPublishAt || Number.isNaN(timestamp) || timestamp <= Date.now() + 60_000 || timestamp > Date.now() + 366 * 24 * 60 * 60 * 1000) {
        throw new ContentCandidateError("请选择未来一年内的有效发布时间", 400);
      }
      await contentMutation(() => scheduleContentCandidate({
        candidateId: id,
        actor: actor.email,
        publishAt: new Date(timestamp).toISOString(),
        post: candidateBlogPost(candidate),
      }));
    } else if (action === "publish-candidate") {
      publicationReady(candidate);
      requireComplianceApproval(await refreshCompliance(db, candidate));
      if (!["approved", "scheduled"].includes(candidate.status)) throw new ContentCandidateError("只有已批准或已排期内容可以发布", 409);
      await contentMutation(() => publishContentCandidate({
        candidateId: id,
        actor: actor.email,
        post: candidateBlogPost(candidate),
        allowEarly: true,
      }));
    } else if (action === "withdraw-candidate") {
      if (!["published", "scheduled"].includes(candidate.status)) throw new ContentCandidateError("只有已发布或已排期内容可以撤回", 409);
      const reason = String(payload.reason ?? "管理员手动从中国官网撤回").trim().slice(0, 1000) || "管理员手动从中国官网撤回";
      await contentMutation(() => withdrawContentCandidate({ candidateId: id, actor: actor.email, reason }));
    }

    candidate = await getCandidate(db, id);
    await completeAdminAudit(auditId, "succeeded");
    auditCompleted = true;
    return Response.json({ ok: true, candidate, translation: contentTranslationState() });
  } catch (error) {
    if (auditId && !auditCompleted) {
      await completeAdminAudit(auditId, "failed", error instanceof Error ? error.message : String(error)).catch(() => undefined);
      auditCompleted = true;
    }
    if (error instanceof ContentCandidateError) return Response.json({ error: error.message }, { status: error.status });
    console.error("[api/admin/content-candidates] action failed", { message: error instanceof Error ? error.message : String(error) });
    return safeServerError("内容审核操作失败，请稍后再试");
  } finally {
    if (auditId && !auditCompleted) await completeAdminAudit(auditId, "failed", "内容审核操作未完成").catch(() => undefined);
  }
}
