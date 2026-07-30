import type { CandidateInput, CandidateMedia } from "../service";
import { candidateReviewState, candidateTitle, findProductReferences } from "../service";

type VkPhoto = { id: number; owner_id: number; sizes?: Array<{ url: string; width: number; height: number }> };
type VkVideo = { id: number; owner_id: number; title?: string; duration?: number; image?: Array<{ url: string; width: number; height: number }> };
type VkAttachment = {
  type: string;
  photo?: VkPhoto;
  video?: VkVideo;
  link?: { url?: string; title?: string; description?: string; photo?: VkPhoto };
  doc?: { id: number; owner_id: number; title?: string; url?: string; ext?: string; size?: number };
};
type VkPost = {
  id: number;
  owner_id: number;
  date: number;
  text?: string;
  attachments?: VkAttachment[];
  copy_history?: Array<{ text?: string }>;
  marked_as_ads?: number;
};
type VkWallResponse = {
  response?: { count: number; items: VkPost[] };
  error?: { error_code?: number; error_msg?: string };
};

const VK_API_URL = "https://api.vk.com/method/wall.get";
const DEFAULT_SOURCE_ID = "SRC-VK-PUSYBEAUTY";
const DEFAULT_DOMAIN = "pusybeauty";

function syncLimit() {
  const value = Number.parseInt(process.env.VK_CONTENT_LIMIT ?? process.env.CONTENT_SYNC_LIMIT ?? "20", 10);
  return Number.isFinite(value) ? Math.min(100, Math.max(1, value)) : 20;
}

export function getVkConnectorStatus() {
  const accessToken = Boolean(process.env.VK_CONTENT_ACCESS_TOKEN?.trim());
  const account = Boolean(process.env.VK_CONTENT_OWNER_ID?.trim() || (process.env.VK_CONTENT_DOMAIN ?? DEFAULT_DOMAIN).trim());
  const missing = [!accessToken && "VK_CONTENT_ACCESS_TOKEN", !account && "VK_CONTENT_OWNER_ID"].filter(Boolean);
  return {
    configured: accessToken && account,
    reason: missing.length ? `未配置 ${missing.join("、")}` : undefined,
  };
}

function largestImage(images: Array<{ url: string; width: number; height: number }> | undefined) {
  return images?.toSorted((left, right) => (right.width * right.height) - (left.width * left.height))[0];
}

function mapVkMedia(attachments: VkAttachment[] = []) {
  const media: CandidateMedia[] = [];
  for (const attachment of attachments) {
    if (attachment.type === "photo" && attachment.photo) {
      const image = largestImage(attachment.photo.sizes);
      media.push({
        type: "image",
        url: `https://vk.com/photo${attachment.photo.owner_id}_${attachment.photo.id}`,
        previewUrl: image?.url,
        width: image?.width,
        height: image?.height,
      });
    } else if (attachment.type === "video" && attachment.video) {
      const preview = largestImage(attachment.video.image);
      media.push({
        type: "video",
        url: `https://vk.com/video${attachment.video.owner_id}_${attachment.video.id}`,
        previewUrl: preview?.url,
        width: preview?.width,
        height: preview?.height,
        duration: attachment.video.duration,
        title: attachment.video.title,
      });
    } else if (attachment.type === "link" && attachment.link?.url) {
      const preview = largestImage(attachment.link.photo?.sizes);
      media.push({
        type: "link",
        url: attachment.link.url,
        previewUrl: preview?.url,
        width: preview?.width,
        height: preview?.height,
        title: attachment.link.title,
      });
    } else if (attachment.type === "doc" && attachment.doc) {
      media.push({
        type: "document",
        url: attachment.doc.url,
        fileName: attachment.doc.title,
        mimeType: attachment.doc.ext ? `application/${attachment.doc.ext}` : undefined,
      });
    }
  }
  return media;
}

function postText(post: VkPost) {
  const own = String(post.text ?? "").trim();
  const repost = post.copy_history?.map((item) => String(item.text ?? "").trim()).filter(Boolean).join("\n\n") ?? "";
  return [own, repost].filter(Boolean).join("\n\n");
}

function mapVkPost(post: VkPost): CandidateInput | null {
  const text = postText(post);
  const media = mapVkMedia(post.attachments);
  if (!text && !media.length) return null;
  const fallbackTitle = media.find((item) => item.title)?.title || "VK 动态";
  const reviewState = candidateReviewState(text);
  const sourceUrl = `https://vk.com/wall${post.owner_id}_${post.id}`;
  return {
    sourceId: process.env.VK_CONTENT_SOURCE_ID?.trim() || DEFAULT_SOURCE_ID,
    externalId: `${post.owner_id}_${post.id}`,
    sourceUrl,
    sourceType: media.some((item) => item.type === "video") ? "video" : "social_post",
    originalTitle: candidateTitle(text, fallbackTitle),
    originalText: text,
    media,
    rights: {
      originPlatform: "vk",
      sourceAccount: process.env.VK_CONTENT_DOMAIN?.trim() || DEFAULT_DOMAIN,
      receivedVia: "vk_official_wall_api",
      sourcePublishedAt: new Date(post.date * 1000).toISOString(),
      isRepost: Boolean(post.copy_history?.length),
      attributionRequired: true,
      reuseReviewRequired: true,
      autoPublishAllowed: false,
    },
    productRefs: findProductReferences(text),
    complianceFlags: [
      "external_source",
      "copyright_review_required",
      "china_cosmetics_claims_review_required",
      ...(post.marked_as_ads ? ["platform_marked_ad"] : []),
    ],
    ...reviewState,
  };
}

export async function syncVkCandidates(): Promise<CandidateInput[]> {
  const configuration = getVkConnectorStatus();
  if (!configuration.configured) return [];

  const parameters = new URLSearchParams({
    access_token: process.env.VK_CONTENT_ACCESS_TOKEN!.trim(),
    v: process.env.VK_CONTENT_API_VERSION?.trim() || "5.199",
    count: String(syncLimit()),
    filter: "owner",
  });
  const ownerId = process.env.VK_CONTENT_OWNER_ID?.trim();
  if (ownerId) parameters.set("owner_id", ownerId);
  else parameters.set("domain", (process.env.VK_CONTENT_DOMAIN ?? DEFAULT_DOMAIN).trim());

  const response = await fetch(VK_API_URL, {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: parameters,
    cache: "no-store",
    signal: AbortSignal.timeout(15_000),
  });
  if (!response.ok) throw new Error(`VK API 返回 HTTP ${response.status}`);
  const payload = await response.json() as VkWallResponse;
  if (payload.error) throw new Error(`VK API 错误 ${payload.error.error_code ?? "unknown"}: ${payload.error.error_msg ?? "未知错误"}`);
  if (!payload.response?.items) throw new Error("VK API 返回格式无效");
  return payload.response.items.map(mapVkPost).filter((candidate): candidate is CandidateInput => candidate !== null);
}
