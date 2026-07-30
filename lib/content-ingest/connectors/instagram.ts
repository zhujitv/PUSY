import type { CandidateInput, CandidateMedia } from "../service";
import { candidateReviewState, candidateTitle, findProductReferences } from "../service";

type InstagramMediaNode = {
  id: string;
  caption?: string;
  media_type: "IMAGE" | "VIDEO" | "CAROUSEL_ALBUM";
  media_url?: string;
  permalink?: string;
  thumbnail_url?: string;
  timestamp?: string;
  children?: { data?: InstagramMediaNode[] };
};
type InstagramMediaResponse = {
  data?: InstagramMediaNode[];
  error?: { code?: number; message?: string; type?: string };
};

const INSTAGRAM_GRAPH_ORIGIN = "https://graph.instagram.com";
const DEFAULT_SOURCE_ID = "SRC-INSTAGRAM-PUSY-BEAUTY";
const DEFAULT_ACCOUNT = "pusy.beauty";

function apiVersion() {
  const value = process.env.INSTAGRAM_CONTENT_API_VERSION?.trim() || "v23.0";
  if (!/^v\d+\.\d+$/u.test(value)) throw new Error("Instagram API 版本配置无效");
  return value;
}

function syncLimit() {
  const value = Number.parseInt(process.env.INSTAGRAM_CONTENT_LIMIT ?? process.env.CONTENT_SYNC_LIMIT ?? "20", 10);
  return Number.isFinite(value) ? Math.min(100, Math.max(1, value)) : 20;
}

export function getInstagramConnectorStatus() {
  const configured = Boolean(process.env.INSTAGRAM_CONTENT_ACCESS_TOKEN?.trim());
  return {
    configured,
    reason: configured ? undefined : "未配置 INSTAGRAM_CONTENT_ACCESS_TOKEN",
  };
}

function mapMediaNode(item: InstagramMediaNode): CandidateMedia {
  if (item.media_type === "VIDEO") {
    return {
      type: "video",
      url: item.media_url,
      previewUrl: item.thumbnail_url,
    };
  }
  return { type: "image", url: item.media_url };
}

function mapInstagramMedia(item: InstagramMediaNode) {
  if (item.media_type === "CAROUSEL_ALBUM" && item.children?.data?.length) return item.children.data.map(mapMediaNode);
  return [mapMediaNode(item)];
}

function mapInstagramPost(item: InstagramMediaNode): CandidateInput | null {
  const text = String(item.caption ?? "").trim();
  const media = mapInstagramMedia(item).filter((entry) => Boolean(entry.url || entry.previewUrl));
  if (!text && !media.length) return null;
  const reviewState = candidateReviewState(text);
  return {
    sourceId: process.env.INSTAGRAM_CONTENT_SOURCE_ID?.trim() || DEFAULT_SOURCE_ID,
    externalId: item.id,
    sourceUrl: item.permalink || `https://www.instagram.com/${DEFAULT_ACCOUNT}/`,
    sourceType: media.some((entry) => entry.type === "video") ? "video" : "social_post",
    originalTitle: candidateTitle(text, item.media_type === "VIDEO" ? "Instagram 视频" : "Instagram 动态"),
    originalText: text,
    media,
    rights: {
      originPlatform: "instagram",
      sourceAccount: `@${process.env.INSTAGRAM_CONTENT_ACCOUNT?.trim() || DEFAULT_ACCOUNT}`,
      receivedVia: "instagram_official_graph_api",
      sourcePublishedAt: item.timestamp ?? null,
      attributionRequired: true,
      reuseReviewRequired: true,
      autoPublishAllowed: false,
      mediaUrlsMayExpire: true,
    },
    productRefs: findProductReferences(text),
    complianceFlags: ["external_source", "copyright_review_required", "china_cosmetics_claims_review_required"],
    ...reviewState,
  };
}

export async function syncInstagramCandidates(): Promise<CandidateInput[]> {
  const configuration = getInstagramConnectorStatus();
  if (!configuration.configured) return [];

  const userId = process.env.INSTAGRAM_CONTENT_USER_ID?.trim() || "me";
  const endpoint = new URL(`/${apiVersion()}/${encodeURIComponent(userId)}/media`, INSTAGRAM_GRAPH_ORIGIN);
  endpoint.searchParams.set("fields", "id,caption,media_type,media_url,permalink,thumbnail_url,timestamp,children{id,media_type,media_url,permalink,thumbnail_url,timestamp}");
  endpoint.searchParams.set("limit", String(syncLimit()));

  const response = await fetch(endpoint, {
    headers: { authorization: `Bearer ${process.env.INSTAGRAM_CONTENT_ACCESS_TOKEN!.trim()}` },
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  const payload = await response.json().catch(() => null) as InstagramMediaResponse | null;
  if (!response.ok) throw new Error(`Instagram Graph API 返回 HTTP ${response.status}`);
  if (payload?.error) throw new Error(`Instagram API 错误 ${payload.error.code ?? "unknown"}: ${payload.error.message ?? "未知错误"}`);
  if (!payload?.data) throw new Error("Instagram API 返回格式无效");
  return payload.data.map(mapInstagramPost).filter((candidate): candidate is CandidateInput => candidate !== null);
}
