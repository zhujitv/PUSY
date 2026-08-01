import { getStoreDb } from "../../db/store";
import type { CommunityMediaInput } from "./media";

export type CommunityPostStatus = "pending" | "approved" | "rejected" | "hidden";

export type CommunityPost = {
  id: string;
  member_id: number;
  author_public_id: string;
  title: string;
  body: string;
  status: CommunityPostStatus;
  moderation_note: string;
  published_at: string | null;
  created_at: string;
  author_name: string;
  author_bio: string;
  media_ids: string[];
};

export type CommunityMember = {
  member_id: number;
  public_id: string;
  display_name: string;
  bio: string;
  joined_at: string;
  post_count: number;
};

type CommunityPostRow = Omit<CommunityPost, "media_ids"> & { media_ids: unknown };

function mediaIds(value: unknown) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean).slice(0, 4);
  if (typeof value !== "string") return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.map(String).filter(Boolean).slice(0, 4) : [];
  } catch {
    return [];
  }
}

function serializePost(row: CommunityPostRow): CommunityPost {
  return { ...row, member_id: Number(row.member_id), media_ids: mediaIds(row.media_ids) };
}

export function communityPostDto(post: CommunityPost, includeModeration = false) {
  const dto: Partial<CommunityPost> = { ...post };
  delete dto.member_id;
  if (!includeModeration) delete dto.moderation_note;
  return dto;
}

export function communityMemberDto(member: CommunityMember) {
  const dto: Partial<CommunityMember> = { ...member };
  delete dto.member_id;
  return dto;
}

const postSelect = `
  SELECT p.id, p.member_id, p.title, p.body, p.status, p.moderation_note, p.published_at, p.created_at,
    cp.public_id AS author_public_id, cp.display_name AS author_name, cp.bio AS author_bio,
    COALESCE(json_agg(cm.id ORDER BY cm.position) FILTER (WHERE cm.id IS NOT NULL), '[]'::json) AS media_ids
  FROM community_posts p
  JOIN members m ON m.id = p.member_id AND m.status != 'blocked'
  JOIN community_profiles cp ON cp.member_id = m.id AND cp.status = 'active'
  LEFT JOIN community_post_media cm ON cm.post_id = p.id
`;

const postGroup = `
  GROUP BY p.id, p.member_id, p.title, p.body, p.status, p.moderation_note, p.published_at, p.created_at,
    cp.public_id, cp.display_name, cp.bio
`;

export async function listCommunityPosts(input: { publicId?: string; viewerMemberId?: number; limit?: number } = {}) {
  const db = await getStoreDb();
  const limit = Math.min(48, Math.max(1, Math.round(input.limit ?? 24)));
  let where = "WHERE p.status = 'approved'";
  const values: unknown[] = [];
  if (input.publicId) {
    const profile = await getCommunityMember(input.publicId);
    if (!profile) return [];
    where = input.viewerMemberId === profile.member_id
      ? "WHERE cp.public_id = ? AND p.status != 'hidden'"
      : "WHERE cp.public_id = ? AND p.status = 'approved'";
    values.push(input.publicId);
  }
  values.push(limit);
  const rows = await db.prepare(`${postSelect} ${where} ${postGroup} ORDER BY COALESCE(p.published_at, p.created_at)::timestamp DESC LIMIT ?`)
    .bind(...values)
    .all<CommunityPostRow>();
  return rows.results.map(serializePost);
}

export async function getCommunityPost(id: string, viewerMemberId?: number) {
  const db = await getStoreDb();
  const row = await db.prepare(`${postSelect} WHERE p.id = ? AND (p.status = 'approved' OR p.member_id = ?) AND p.status != 'hidden' ${postGroup} LIMIT 1`)
    .bind(id, viewerMemberId ?? 0)
    .first<CommunityPostRow>();
  return row ? serializePost(row) : null;
}

export async function getCommunityMember(publicId: string): Promise<CommunityMember | null> {
  const db = await getStoreDb();
  const member = await db.prepare(`
    SELECT m.id AS member_id, cp.public_id, cp.display_name, cp.bio, m.joined_at,
      COUNT(p.id) FILTER (WHERE p.status = 'approved')::INTEGER AS post_count
    FROM community_profiles cp
    JOIN members m ON m.id = cp.member_id
    LEFT JOIN community_posts p ON p.member_id = m.id
    WHERE cp.public_id = ? AND cp.status = 'active' AND m.status != 'blocked'
    GROUP BY m.id, cp.public_id, cp.display_name, cp.bio, m.joined_at
    LIMIT 1
  `).bind(publicId).first<CommunityMember>();
  return member ? { ...member, member_id: Number(member.member_id), post_count: Number(member.post_count) } : null;
}

export async function getCommunityProfileForMember(memberId: number) {
  const db = await getStoreDb();
  return db.prepare("SELECT member_id, public_id, display_name, bio, status FROM community_profiles WHERE member_id = ? LIMIT 1")
    .bind(memberId)
    .first<{ member_id: number; public_id: string; display_name: string; bio: string; status: string }>();
}

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

export async function createCommunityPost(input: { memberId: number; displayName: string; title: string; body: string; media: CommunityMediaInput[]; clientRequestId: string }) {
  const db = await getStoreDb();
  const member = await db.prepare("SELECT id, status FROM members WHERE id = ? LIMIT 1").bind(input.memberId).first<{ id: number; status: string }>();
  if (!member || member.status === "blocked") throw new Error("该会员账户不可发布社区内容");
  const publicId = await ensureCommunityProfile(input.memberId, input.displayName);
  const existing = await db.prepare("SELECT id FROM community_posts WHERE member_id = ? AND client_request_id = ? LIMIT 1").bind(input.memberId, input.clientRequestId).first<{ id: string }>();
  if (existing) return { id: existing.id, publicId, duplicate: true };
  const id = `PST-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
  try {
    await db.batch([
      db.prepare("INSERT INTO community_posts (id, member_id, client_request_id, title, body) VALUES (?, ?, ?, ?, ?)").bind(id, input.memberId, input.clientRequestId, input.title, input.body),
      ...input.media.map((item, position) => db.prepare("INSERT INTO community_post_media (id, post_id, position, mime_type, byte_size, bytes) VALUES (?, ?, ?, ?, ?, ?)")
        .bind(`MED-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`, id, position, item.mimeType, item.bytes.length, item.bytes)),
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
