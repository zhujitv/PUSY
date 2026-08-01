import type { AdminIdentity } from "../admin-auth";
import { getStoreDb } from "../../db/store";
import type { CommunityPostStatus } from "./posts";

export type CommunityModerationPost = {
  id: string;
  member_id: number;
  author_public_id: string;
  author_name: string;
  title: string;
  body: string;
  status: CommunityPostStatus;
  moderation_note: string;
  moderated_by: string | null;
  moderated_at: string | null;
  published_at: string | null;
  created_at: string;
  media_ids: string[];
};

function mediaIds(value: unknown) {
  if (Array.isArray(value)) return value.map(String).filter(Boolean).slice(0, 4);
  if (typeof value !== "string") return [];
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.map(String).filter(Boolean).slice(0, 4) : []; }
  catch { return []; }
}

export async function listCommunityModerationPosts(limit = 300) {
  const db = await getStoreDb();
  const rows = await db.prepare(`
    SELECT p.id, p.member_id, cp.public_id AS author_public_id, cp.display_name AS author_name,
      p.title, p.body, p.status, p.moderation_note, p.moderated_by, p.moderated_at, p.published_at, p.created_at,
      COALESCE(json_agg(cm.id ORDER BY cm.position) FILTER (WHERE cm.id IS NOT NULL), '[]'::json) AS media_ids
    FROM community_posts p
    JOIN community_profiles cp ON cp.member_id = p.member_id
    LEFT JOIN community_post_media cm ON cm.post_id = p.id
    GROUP BY p.id, p.member_id, cp.public_id, cp.display_name, p.title, p.body, p.status, p.moderation_note,
      p.moderated_by, p.moderated_at, p.published_at, p.created_at
    ORDER BY CASE p.status WHEN 'pending' THEN 0 ELSE 1 END, p.created_at::timestamp DESC
    LIMIT ?
  `).bind(Math.min(500, Math.max(1, limit))).all<Omit<CommunityModerationPost, "media_ids"> & { media_ids: unknown }>();
  return rows.results.map((row) => ({ ...row, member_id: Number(row.member_id), media_ids: mediaIds(row.media_ids) }));
}

export async function moderateCommunityPost(input: { postId: string; status: CommunityPostStatus; reason: string; actor: AdminIdentity }) {
  const { postId, status, actor } = input;
  const reason = input.reason.trim().slice(0, 500);
  if (!/^PST-[A-Z0-9]{12}$/.test(postId)) throw new Error("社区内容标识无效");
  if (!(["pending", "approved", "rejected", "hidden"] as string[]).includes(status)) throw new Error("社区审核状态无效");
  if (status === "rejected" && reason.length < 2) throw new Error("拒绝公开时请填写审核说明");
  const db = await getStoreDb();
  const event = await db.prepare(`
    WITH previous AS MATERIALIZED (
      SELECT id, status FROM community_posts WHERE id = ? FOR UPDATE
    ), updated AS (
      UPDATE community_posts p SET
        status = ?, moderation_note = ?, moderated_by = ?, moderated_at = CURRENT_TIMESTAMP,
        published_at = CASE WHEN ? = 'approved' THEN COALESCE(p.published_at, CURRENT_TIMESTAMP::TEXT) ELSE p.published_at END,
        updated_at = CURRENT_TIMESTAMP
      FROM previous WHERE p.id = previous.id
      RETURNING p.id, previous.status AS from_status, p.status AS to_status
    )
    INSERT INTO community_moderation_events (post_id, from_status, to_status, reason, admin_id, actor_email)
    SELECT id, from_status, to_status, ?, ?, ? FROM updated
    RETURNING post_id
  `).bind(postId, status, reason, actor.email, status, reason, actor.id, actor.email).first<{ post_id: string }>();
  if (!event) throw new Error("社区内容不存在");
  return event.post_id;
}
