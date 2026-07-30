import type { CandidateInput, CandidateMedia } from "../service";
import { candidateReviewState, candidateTitle, findProductReferences } from "../service";

type TelegramPhotoSize = { file_id: string; width?: number; height?: number; file_size?: number };
type TelegramFile = {
  file_id: string;
  file_name?: string;
  mime_type?: string;
  width?: number;
  height?: number;
  duration?: number;
  thumbnail?: TelegramPhotoSize;
};

type TelegramChannelPost = {
  message_id: number;
  date: number;
  edit_date?: number;
  media_group_id?: string;
  chat: { id: number; type: string; title?: string; username?: string };
  text?: string;
  caption?: string;
  photo?: TelegramPhotoSize[];
  video?: TelegramFile;
  animation?: TelegramFile;
  document?: TelegramFile;
};

export type TelegramUpdate = {
  update_id?: number;
  channel_post?: TelegramChannelPost;
  edited_channel_post?: TelegramChannelPost;
};

const DEFAULT_CHANNEL_USERNAME = "pusybeautyy";
const DEFAULT_SOURCE_ID = "SRC-TELEGRAM-PUSYBEAUTYY";

function configuredChannelUsername() {
  return (process.env.TELEGRAM_CONTENT_CHANNEL_USERNAME ?? DEFAULT_CHANNEL_USERNAME).trim().replace(/^@/u, "").toLowerCase();
}

export function getTelegramConnectorStatus() {
  const secret = Boolean(process.env.TELEGRAM_CONTENT_WEBHOOK_SECRET?.trim());
  const channel = Boolean(process.env.TELEGRAM_CONTENT_CHANNEL_ID?.trim() || configuredChannelUsername());
  const missing = [!secret && "TELEGRAM_CONTENT_WEBHOOK_SECRET", !channel && "TELEGRAM_CONTENT_CHANNEL_ID"].filter(Boolean);
  return {
    configured: secret && channel,
    reason: missing.length ? `未配置 ${missing.join("、")}` : undefined,
  };
}

function belongsToConfiguredChannel(post: TelegramChannelPost) {
  const expectedId = process.env.TELEGRAM_CONTENT_CHANNEL_ID?.trim();
  if (expectedId && String(post.chat.id) !== expectedId) return false;
  const expectedUsername = configuredChannelUsername();
  if (!expectedId && expectedUsername && post.chat.username?.toLowerCase() !== expectedUsername) return false;
  return post.chat.type === "channel";
}

function telegramMedia(post: TelegramChannelPost): CandidateMedia[] {
  const media: CandidateMedia[] = [];
  const photo = post.photo?.at(-1);
  if (photo) {
    media.push({
      type: "image",
      platformFileId: photo.file_id,
      width: photo.width,
      height: photo.height,
    });
  }
  if (post.video) {
    media.push({
      type: "video",
      platformFileId: post.video.file_id,
      mimeType: post.video.mime_type,
      fileName: post.video.file_name,
      width: post.video.width,
      height: post.video.height,
      duration: post.video.duration,
      platformPreviewFileId: post.video.thumbnail?.file_id,
    });
  }
  if (post.animation) {
    media.push({
      type: "animation",
      platformFileId: post.animation.file_id,
      mimeType: post.animation.mime_type,
      fileName: post.animation.file_name,
      width: post.animation.width,
      height: post.animation.height,
      duration: post.animation.duration,
      platformPreviewFileId: post.animation.thumbnail?.file_id,
    });
  }
  if (post.document) {
    media.push({
      type: "document",
      platformFileId: post.document.file_id,
      mimeType: post.document.mime_type,
      fileName: post.document.file_name,
      platformPreviewFileId: post.document.thumbnail?.file_id,
    });
  }
  return media;
}

export function parseTelegramUpdate(update: TelegramUpdate): CandidateInput | null {
  const post = update.channel_post ?? update.edited_channel_post;
  if (!post || !belongsToConfiguredChannel(post)) return null;

  const text = String(post.text ?? post.caption ?? "").trim();
  const username = post.chat.username?.trim().replace(/^@/u, "") || configuredChannelUsername();
  const media = telegramMedia(post);
  if (!text && !media.length) return null;
  const reviewState = candidateReviewState(text);

  return {
    sourceId: process.env.TELEGRAM_CONTENT_SOURCE_ID?.trim() || DEFAULT_SOURCE_ID,
    externalId: `${post.chat.id}:${post.message_id}`,
    sourceUrl: username ? `https://t.me/${encodeURIComponent(username)}/${post.message_id}` : "https://t.me/",
    sourceType: media.some((item) => item.type === "video" || item.type === "animation") ? "video" : "social_post",
    originalTitle: candidateTitle(text, post.chat.title || "Telegram 频道内容"),
    originalText: text,
    media,
    rights: {
      originPlatform: "telegram",
      sourceAccount: username ? `@${username}` : String(post.chat.id),
      receivedVia: "telegram_bot_api_webhook",
      sourcePublishedAt: new Date(post.date * 1000).toISOString(),
      sourceEditedAt: post.edit_date ? new Date(post.edit_date * 1000).toISOString() : null,
      mediaGroupId: post.media_group_id ?? null,
      attributionRequired: true,
      reuseReviewRequired: true,
      autoPublishAllowed: false,
    },
    productRefs: findProductReferences(text),
    complianceFlags: ["external_source", "copyright_review_required", "china_cosmetics_claims_review_required"],
    ...reviewState,
  };
}
