import { getStoreDb } from "../../db/store";
import type { CommunityMediaInput } from "./media";
import { resolveCommunityProducts } from "./commerce";
import { resolveCommunityTopics } from "./topics";
import { getCommunityProfileForMember } from "./post-queries";
import type { CommunityPostStatus } from "./post-types";

export async function ensureCommunityProfile(memberId: number, displayName: string) {
  const db = await getStoreDb();
  const existing = await getCommunityProfileForMember(memberId);
  if (existing) {
    const approved = await db.prepare("SELECT id FROM community_posts WHERE member_id = ? AND status = 'approved' LIMIT 1").bind(memberId).first();
    if (!approved && existing.display_name !== displayName) await db.prepare("UPDATE community_profiles SET display_name = ?, updated_at = CURRENT_TIMESTAMP WHERE member_id = ?").bind(displayName, memberId).run();
    return existing.public_id;
  }
  const publicId = `MBR-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
  await db.prepare("INSERT INTO community_profiles (member_id, public_id, display_name) VALUES (?, ?, ?) ON CONFLICT(member_id) DO NOTHING").bind(memberId, publicId, displayName).run();
  return (await getCommunityProfileForMember(memberId))?.public_id ?? publicId;
}

async function postFingerprint(title: string, body: string) {
  const normalized = `${title}\n${body}`.toLowerCase().replace(/\s+/g, " ").replace(/[^\p{L}\p{N} ]/gu, "").trim();
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function createCommunityPost(input: { memberId: number; displayName: string; title: string; body: string; media: CommunityMediaInput[]; topicSlugs: string[]; productSlugs: string[]; clientRequestId: string; intent?: "draft" | "submit"; campaignSlug?: string }) {
  const db = await getStoreDb();
  const member = await db.prepare("SELECT id, status FROM members WHERE id = ? LIMIT 1").bind(input.memberId).first<{ id: number; status: string }>();
  if (!member || member.status === "blocked") throw new Error("该会员账户不可发布社区内容");
  const publicId = await ensureCommunityProfile(input.memberId, input.displayName);
  const profile = await getCommunityProfileForMember(input.memberId);
  if (input.intent !== "draft" && profile?.creator_status === "restricted") throw new Error("该创作者账号暂时无法提交新内容");
  const existing = await db.prepare("SELECT id FROM community_posts WHERE member_id = ? AND client_request_id = ? LIMIT 1").bind(input.memberId, input.clientRequestId).first<{ id: string }>();
  if (existing) return { id: existing.id, publicId, duplicate: true };
  const [topics, linkedProducts] = await Promise.all([
    resolveCommunityTopics(input.topicSlugs),
    resolveCommunityProducts(input.productSlugs),
  ]);
  const fingerprint = input.body ? await postFingerprint(input.title, input.body) : "";
  if (input.intent !== "draft" && fingerprint) {
    const duplicate = await db.prepare("SELECT id FROM community_posts WHERE member_id = ? AND content_fingerprint = ? AND status != 'draft' AND created_at::timestamp >= CURRENT_TIMESTAMP - INTERVAL '30 days' LIMIT 1").bind(input.memberId, fingerprint).first<{ id: string }>();
    if (duplicate) throw new Error("这篇内容与近 30 天内的投稿重复，请补充新的体验后再提交");
  }
  const campaign = input.campaignSlug ? await db.prepare("SELECT id FROM community_campaigns WHERE slug = ? AND status = 'active' AND (starts_at IS NULL OR starts_at::timestamp <= CURRENT_TIMESTAMP) AND (ends_at IS NULL OR ends_at::timestamp >= CURRENT_TIMESTAMP) LIMIT 1").bind(input.campaignSlug).first<{ id: string }>() : null;
  if (input.campaignSlug && !campaign) throw new Error("所选主题活动当前不可参与");
  const id = `PST-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
  const status = input.intent === "draft" ? "draft" : "pending";
  const mediaRecords = input.media.map((item, position) => ({ ...item, position, id: `MED-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}` }));
  try {
    await db.batch([
      db.prepare("INSERT INTO community_posts (id, member_id, client_request_id, title, body, status, content_fingerprint, campaign_id) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(id, input.memberId, input.clientRequestId, input.title, input.body, status, fingerprint, campaign?.id ?? null),
      ...mediaRecords.map((item) => db.prepare("INSERT INTO community_post_media (id, post_id, position, mime_type, byte_size, bytes) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(item.id, id, item.position, item.mimeType, item.bytes.length, item.bytes)),
      ...topics.map((topic) => db.prepare("INSERT INTO community_post_topics (post_id, topic_id) VALUES (?, ?)").bind(id, topic.id)),
      ...linkedProducts.map((product, position) => db.prepare("INSERT INTO community_post_products (post_id, product_slug, position) VALUES (?, ?, ?)").bind(id, product.slug, position)),
      db.prepare(`INSERT INTO community_post_versions (post_id, version, title, body, status, topic_slugs_json, product_slugs_json, media_ids_json, change_type, actor_type, actor_id)
        VALUES (?, 1, ?, ?, ?, ?, ?, ?, ?, 'member', ?)`)
        .bind(id, input.title, input.body, status, JSON.stringify(topics.map((topic) => topic.slug)), JSON.stringify(linkedProducts.map((product) => product.slug)), JSON.stringify(mediaRecords.map((item) => item.id)), status === "draft" ? "draft_saved" : "submitted", String(input.memberId)),
      ...(campaign ? [db.prepare("INSERT INTO community_campaign_entries (campaign_id, post_id, member_id) VALUES (?, ?, ?)").bind(campaign.id, id, input.memberId)] : []),
    ]);
  } catch (error) {
    if (typeof error === "object" && error && "code" in error && error.code === "23505") {
      const retried = await db.prepare("SELECT id FROM community_posts WHERE member_id = ? AND client_request_id = ? LIMIT 1").bind(input.memberId, input.clientRequestId).first<{ id: string }>();
      if (retried) return { id: retried.id, publicId, duplicate: true };
    }
    throw error;
  }
  return { id, publicId, duplicate: false };
}

export async function getCommunityMedia(id: string) {
  const db = await getStoreDb();
  return db.prepare(`
    SELECT cm.bytes, cm.mime_type, cm.byte_size, p.member_id, p.status
    FROM community_post_media cm JOIN community_posts p ON p.id = cm.post_id
    WHERE cm.id = ? LIMIT 1
  `).bind(id).first<{ bytes: Buffer; mime_type: string; byte_size: number; member_id: number; status: CommunityPostStatus }>();
}
