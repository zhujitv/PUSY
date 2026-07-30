import { applyCandidateTranslation, upsertContentCandidate } from "../../db/content-ingest";
import type { TelegramUpdate } from "./connectors/telegram";
import { translateContentCandidate } from "./translation";

export type ContentCandidateStatus = "pending_review";

export type CandidateMedia = {
  type: "image" | "video" | "animation" | "document" | "link";
  url?: string;
  previewUrl?: string;
  platformFileId?: string;
  platformPreviewFileId?: string;
  mimeType?: string;
  fileName?: string;
  width?: number;
  height?: number;
  duration?: number;
  title?: string;
};

/**
 * Normalized input accepted by the content-candidate data layer.
 * External content is always review-only: connectors must never return a
 * published status or a future site publish time.
 */
export type CandidateInput = {
  sourceId: string;
  externalId: string;
  sourceUrl: string;
  sourceType: "social_post" | "video";
  originalTitle: string;
  originalText: string;
  media: CandidateMedia[];
  rights: Record<string, unknown>;
  productRefs: string[];
  complianceFlags: string[];
  translationStatus: "pending" | "translated";
  status: ContentCandidateStatus;
};

export type ContentConnectorResult = {
  platform: "telegram" | "vk" | "instagram";
  configured: boolean;
  mode: "webhook" | "scheduled_api";
  status: "ready" | "synced" | "skipped" | "error";
  fetched: number;
  saved: number;
  reason?: string;
};

const CJK_PATTERN = /[\u3400-\u9FFF\uF900-\uFAFF]/u;
const PRODUCT_URL_PATTERN = /https?:\/\/(?:www\.)?pusy\.beauty\/products\/([^\s?#)]+)/giu;

export function candidateReviewState(text: string): Pick<CandidateInput, "status" | "translationStatus"> {
  return {
    status: "pending_review",
    translationStatus: text.trim() && !CJK_PATTERN.test(text) ? "pending" : "translated",
  };
}

export function candidateTitle(text: string, fallback: string) {
  const firstLine = text.split(/\r?\n/u).map((line) => line.trim()).find(Boolean) ?? fallback;
  return firstLine.replace(/\s+/gu, " ").slice(0, 160);
}

export function findProductReferences(text: string) {
  return [...new Set(Array.from(text.matchAll(PRODUCT_URL_PATTERN), (match) => {
    try {
      return decodeURIComponent(match[1]).slice(0, 220);
    } catch {
      return match[1].slice(0, 220);
    }
  }))];
}

function forceReviewOnly(candidate: CandidateInput): CandidateInput {
  const reviewState = candidateReviewState(`${candidate.originalTitle}\n${candidate.originalText}`);
  return {
    ...candidate,
    ...reviewState,
    rights: {
      ...candidate.rights,
      reuseReviewRequired: true,
      autoPublishAllowed: false,
    },
    complianceFlags: [...new Set([
      ...candidate.complianceFlags,
      "external_source",
      "copyright_review_required",
      "china_cosmetics_claims_review_required",
    ])],
  };
}

async function saveCandidates(candidates: CandidateInput[]) {
  let saved = 0;
  for (const candidate of candidates) {
    const reviewOnlyCandidate = forceReviewOnly(candidate);
    const { candidate: persisted } = await upsertContentCandidate(reviewOnlyCandidate);
    if (reviewOnlyCandidate.originalText.trim() && persisted.translation_status !== "translated") {
      const translation = reviewOnlyCandidate.translationStatus === "translated"
        ? {
            status: "translated" as const,
            title: persisted.original_title || reviewOnlyCandidate.originalTitle,
            text: persisted.original_text || reviewOnlyCandidate.originalText,
            model: "source:zh-CN",
          }
        : await translateContentCandidate({
            title: persisted.original_title || reviewOnlyCandidate.originalTitle,
            text: persisted.original_text || reviewOnlyCandidate.originalText,
          });
      await applyCandidateTranslation(persisted.id, { ...translation, actor: "system:content-ingest" });
    }
    saved += 1;
  }
  return saved;
}

function safeError(error: unknown) {
  return (error instanceof Error ? error.message : "同步失败").replace(/Bearer\s+\S+/giu, "Bearer [redacted]").slice(0, 300);
}

export async function ingestTelegramWebhook(update: TelegramUpdate) {
  const { getTelegramConnectorStatus, parseTelegramUpdate } = await import("./connectors/telegram");
  const status = getTelegramConnectorStatus();
  if (!status.configured) return { received: false, saved: 0, skipped: true, reason: status.reason };
  const candidate = parseTelegramUpdate(update);
  if (!candidate) return { received: true, saved: 0, skipped: true, reason: "非目标频道内容或不支持的更新类型" };
  await saveCandidates([candidate]);
  return { received: true, saved: 1, skipped: false };
}

export async function syncOfficialContentSources(): Promise<{ results: ContentConnectorResult[] }> {
  const [telegramConnector, vkConnector, instagramConnector] = await Promise.all([
    import("./connectors/telegram"),
    import("./connectors/vk"),
    import("./connectors/instagram"),
  ]);
  const { getTelegramConnectorStatus } = telegramConnector;
  const telegram = getTelegramConnectorStatus();
  const results: ContentConnectorResult[] = [{
    platform: "telegram",
    configured: telegram.configured,
    mode: "webhook",
    status: telegram.configured ? "ready" : "skipped",
    fetched: 0,
    saved: 0,
    reason: telegram.reason,
  }];

  const scheduled = [
    { platform: "vk" as const, status: vkConnector.getVkConnectorStatus, sync: vkConnector.syncVkCandidates },
    { platform: "instagram" as const, status: instagramConnector.getInstagramConnectorStatus, sync: instagramConnector.syncInstagramCandidates },
  ];

  for (const connector of scheduled) {
    const configuration = connector.status();
    if (!configuration.configured) {
      results.push({
        platform: connector.platform,
        configured: false,
        mode: "scheduled_api",
        status: "skipped",
        fetched: 0,
        saved: 0,
        reason: configuration.reason,
      });
      continue;
    }

    try {
      const candidates = await connector.sync();
      results.push({
        platform: connector.platform,
        configured: true,
        mode: "scheduled_api",
        status: "synced",
        fetched: candidates.length,
        saved: await saveCandidates(candidates),
      });
    } catch (error) {
      results.push({
        platform: connector.platform,
        configured: true,
        mode: "scheduled_api",
        status: "error",
        fetched: 0,
        saved: 0,
        reason: safeError(error),
      });
    }
  }

  return { results };
}
