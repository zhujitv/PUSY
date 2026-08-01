import type { AdminIdentity } from "../admin-auth";
import { getStoreDb } from "../../db/store";
import { publicId, reportReasons } from "./engagement-shared";
import type { CommunityReport } from "./engagement-types";

export async function createCommunityReport(input: { memberId: number; entityType: "post" | "comment"; entityId: string; reason: string; detail: string }) {
  if (!reportReasons.includes(input.reason as typeof reportReasons[number])) throw new Error("请选择有效的举报原因");
  const detail = input.detail.trim().slice(0, 500);
  if (input.reason === "other" && detail.length < 4) throw new Error("选择其他原因时请填写至少 4 个字的说明");
  const db = await getStoreDb();
  let postId = input.entityId;
  let commentId: string | null = null;
  let targetMemberId: number;
  if (input.entityType === "post") {
    const post = await db.prepare("SELECT id, member_id FROM community_posts WHERE id = ? AND status = 'approved' LIMIT 1")
      .bind(input.entityId).first<{ id: string; member_id: number }>();
    if (!post) throw new Error("要举报的分享不存在");
    targetMemberId = Number(post.member_id);
  } else {
    const comment = await db.prepare(`
      SELECT c.id, c.post_id, c.member_id FROM community_comments c
      JOIN community_posts p ON p.id = c.post_id AND p.status = 'approved'
      WHERE c.id = ? AND c.status = 'visible' LIMIT 1
    `).bind(input.entityId).first<{ id: string; post_id: string; member_id: number }>();
    if (!comment) throw new Error("要举报的评论不存在");
    postId = comment.post_id;
    commentId = comment.id;
    targetMemberId = Number(comment.member_id);
  }
  if (targetMemberId === input.memberId) throw new Error("不能举报自己的内容");
  const id = publicId("RPT");
  const result = await db.prepare(`
    INSERT INTO community_reports
      (id, reporter_member_id, entity_type, entity_id, post_id, comment_id, reason, detail)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT (reporter_member_id, entity_type, entity_id) DO NOTHING
  `).bind(id, input.memberId, input.entityType, input.entityId, postId, commentId, input.reason, detail).run();
  if (!result.meta.changes) throw new Error("你已经举报过这条内容");
  return { id, status: "pending" as const };
}

export async function listCommunityReports(limit = 300) {
  const db = await getStoreDb();
  const rows = await db.prepare(`
    SELECT r.id, r.entity_type, r.entity_id, r.post_id, r.comment_id, r.reason, r.detail, r.status,
      r.resolution_note, reporter.name AS reporter_name,
      COALESCE(comment_author.display_name, post_author.display_name, '未知会员') AS target_author_name,
      CASE WHEN r.entity_type = 'comment' THEN COALESCE(c.body, '') ELSE COALESCE(p.title || ' ' || p.body, '') END AS target_excerpt,
      r.reviewed_by, r.reviewed_at, r.created_at
    FROM community_reports r
    JOIN members reporter ON reporter.id = r.reporter_member_id
    JOIN community_posts p ON p.id = r.post_id
    LEFT JOIN community_profiles post_author ON post_author.member_id = p.member_id
    LEFT JOIN community_comments c ON c.id = r.comment_id
    LEFT JOIN community_profiles comment_author ON comment_author.member_id = c.member_id
    ORDER BY CASE r.status WHEN 'pending' THEN 0 ELSE 1 END, r.created_at::timestamp DESC
    LIMIT ?
  `).bind(Math.min(500, Math.max(1, limit))).all<CommunityReport>();
  return rows.results.map((row) => ({ ...row, target_excerpt: row.target_excerpt.trim().slice(0, 280) }));
}

export async function moderateCommunityReport(input: { id: string; action: "resolve" | "dismiss"; note: string; actor: AdminIdentity }) {
  if (!/^RPT-[A-Z0-9]{12}$/.test(input.id)) throw new Error("举报标识无效");
  if (!(["resolve", "dismiss"] as const).includes(input.action)) throw new Error("举报处理动作无效");
  const note = input.note.trim().slice(0, 500);
  if (input.action === "resolve" && note.length < 2) throw new Error("处理违规内容时请填写说明");
  const status = input.action === "resolve" ? "resolved" : "dismissed";
  const db = await getStoreDb();
  const event = await db.prepare(`
    WITH previous AS MATERIALIZED (
      SELECT id, status, entity_type, post_id, comment_id
      FROM community_reports WHERE id = ? AND status = 'pending' FOR UPDATE
    ), updated AS (
      UPDATE community_reports r SET status = ?, resolution_note = ?, reviewed_by = ?,
        reviewed_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      FROM previous WHERE r.id = previous.id
      RETURNING r.id, previous.status AS from_status, r.status AS to_status
    ), hidden_post AS (
      UPDATE community_posts SET status = 'hidden', moderation_note = ?, moderated_by = ?,
        moderated_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE ? = 'resolve' AND id = (SELECT post_id FROM previous WHERE entity_type = 'post')
    ), detached_replies AS (
      UPDATE community_comments SET parent_comment_id = NULL, updated_at = CURRENT_TIMESTAMP
      WHERE ? = 'resolve' AND parent_comment_id = (SELECT comment_id FROM previous WHERE entity_type = 'comment')
    ), hidden_comment AS (
      UPDATE community_comments SET status = 'hidden', updated_at = CURRENT_TIMESTAMP
      WHERE ? = 'resolve' AND id = (SELECT comment_id FROM previous WHERE entity_type = 'comment')
    )
    INSERT INTO community_report_events (report_id, from_status, to_status, action, note, admin_id, actor_email)
    SELECT id, from_status, to_status, ?, ?, ?, ? FROM updated
    RETURNING report_id
  `).bind(
    input.id, status, note, input.actor.email,
    note, input.actor.email, input.action, input.action, input.action,
    input.action, note, input.actor.id, input.actor.email,
  ).first<{ report_id: string }>();
  if (!event) throw new Error("举报记录不存在");
  return event.report_id;
}
