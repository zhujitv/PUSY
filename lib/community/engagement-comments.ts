import { getStoreDb } from "../../db/store";
import { ensureCommunityProfile } from "./posts";
import { publicId } from "./engagement-shared";
import type { CommunityComment } from "./engagement-types";

function normalizeCommentBody(value: string) {
  const body = value.trim().replace(/\r\n?/g, "\n");
  if (body.length < 2) throw new Error("评论至少需要 2 个字");
  if (body.length > 500) throw new Error("评论最多 500 个字");
  return body;
}

async function readComment(id: string, viewerMemberId: number) {
  const db = await getStoreDb();
  const row = await db.prepare(`
    SELECT c.id, c.post_id, c.parent_comment_id, c.body, c.created_at,
      cp.public_id AS author_public_id, cp.display_name AS author_name,
      (c.member_id = ?) AS viewer_is_author
    FROM community_comments c
    JOIN community_posts p ON p.id = c.post_id AND p.status = 'approved'
    JOIN members m ON m.id = c.member_id AND m.status != 'blocked'
    JOIN community_profiles cp ON cp.member_id = c.member_id AND cp.status = 'active'
    WHERE c.id = ? AND c.status = 'visible'
    LIMIT 1
  `).bind(viewerMemberId, id).first<CommunityComment>();
  return row ? { ...row, viewer_is_author: Boolean(row.viewer_is_author) } : null;
}

export async function listCommunityComments(postId: string, viewerMemberId?: number) {
  const db = await getStoreDb();
  const rows = await db.prepare(`
    SELECT c.id, c.post_id, c.parent_comment_id, c.body, c.created_at,
      cp.public_id AS author_public_id, cp.display_name AS author_name,
      (c.member_id = ?) AS viewer_is_author
    FROM community_comments c
    JOIN community_posts p ON p.id = c.post_id AND p.status = 'approved'
    JOIN members m ON m.id = c.member_id AND m.status != 'blocked'
    JOIN community_profiles cp ON cp.member_id = c.member_id AND cp.status = 'active'
    WHERE c.post_id = ? AND c.status = 'visible'
    ORDER BY c.created_at::timestamp ASC
    LIMIT 300
  `).bind(viewerMemberId ?? 0, postId).all<CommunityComment>();
  const visible = rows.results.map((row) => ({ ...row, viewer_is_author: Boolean(row.viewer_is_author) }));
  const visibleIds = new Set(visible.map((comment) => comment.id));
  return visible.map((comment) => comment.parent_comment_id && !visibleIds.has(comment.parent_comment_id)
    ? { ...comment, parent_comment_id: null }
    : comment);
}

export async function setCommunityPostInteraction(input: { postId: string; memberId: number; kind: "like" | "bookmark"; enabled: boolean }) {
  const db = await getStoreDb();
  const post = await db.prepare("SELECT id, member_id FROM community_posts WHERE id = ? AND status = 'approved' LIMIT 1")
    .bind(input.postId).first<{ id: string; member_id: number }>();
  if (!post) throw new Error("社区内容不存在或尚未公开");
  if (input.kind === "like" && Number(post.member_id) === input.memberId) throw new Error("不能给自己的分享点赞");
  const table = input.kind === "like" ? "community_post_likes" : "community_post_bookmarks";
  if (input.enabled) {
    await db.prepare(`INSERT INTO ${table} (post_id, member_id) VALUES (?, ?) ON CONFLICT DO NOTHING`).bind(input.postId, input.memberId).run();
  } else {
    await db.prepare(`DELETE FROM ${table} WHERE post_id = ? AND member_id = ?`).bind(input.postId, input.memberId).run();
  }
  const state = await db.prepare(`
    SELECT
      (SELECT COUNT(*) FROM community_post_likes WHERE post_id = ?)::INTEGER AS like_count,
      (SELECT COUNT(*) FROM community_post_bookmarks WHERE post_id = ?)::INTEGER AS bookmark_count,
      EXISTS(SELECT 1 FROM community_post_likes WHERE post_id = ? AND member_id = ?) AS viewer_has_liked,
      EXISTS(SELECT 1 FROM community_post_bookmarks WHERE post_id = ? AND member_id = ?) AS viewer_has_bookmarked
  `).bind(input.postId, input.postId, input.postId, input.memberId, input.postId, input.memberId).first<{
    like_count: number; bookmark_count: number; viewer_has_liked: boolean; viewer_has_bookmarked: boolean;
  }>();
  return {
    likeCount: Number(state?.like_count ?? 0),
    bookmarkCount: Number(state?.bookmark_count ?? 0),
    liked: Boolean(state?.viewer_has_liked),
    bookmarked: Boolean(state?.viewer_has_bookmarked),
  };
}

export async function createCommunityComment(input: { postId: string; memberId: number; displayName: string; body: string; parentCommentId?: string }) {
  const db = await getStoreDb();
  const body = normalizeCommentBody(input.body);
  const post = await db.prepare("SELECT id, member_id FROM community_posts WHERE id = ? AND status = 'approved' LIMIT 1")
    .bind(input.postId).first<{ id: string; member_id: number }>();
  if (!post) throw new Error("社区内容不存在或尚未公开");
  await ensureCommunityProfile(input.memberId, input.displayName.slice(0, 30));

  let parentId: string | null = null;
  let parentAuthorId: number | null = null;
  if (input.parentCommentId) {
    const parent = await db.prepare(`
      SELECT id, member_id, parent_comment_id FROM community_comments
      WHERE id = ? AND post_id = ? AND status = 'visible' LIMIT 1
    `).bind(input.parentCommentId, input.postId).first<{ id: string; member_id: number; parent_comment_id: string | null }>();
    if (!parent) throw new Error("要回复的评论不存在");
    parentId = parent.parent_comment_id ?? parent.id;
    parentAuthorId = Number(parent.member_id);
  }

  const id = publicId("CMT");
  await db.prepare("INSERT INTO community_comments (id, post_id, member_id, parent_comment_id, body) VALUES (?, ?, ?, ?, ?)")
    .bind(id, input.postId, input.memberId, parentId, body).run();

  const recipient = parentAuthorId && parentAuthorId !== input.memberId
    ? parentAuthorId
    : Number(post.member_id) !== input.memberId ? Number(post.member_id) : null;
  if (recipient) {
    await db.prepare(`
      INSERT INTO community_notifications
        (id, recipient_member_id, event_key, event_type, actor_member_id, entity_type, entity_id, post_id)
      VALUES (?, ?, ?, ?, ?, 'comment', ?, ?)
      ON CONFLICT (recipient_member_id, event_key) DO NOTHING
    `).bind(
      `NTF-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`,
      recipient,
      `comment:${id}`,
      parentAuthorId ? "comment_reply" : "post_comment",
      input.memberId,
      id,
      input.postId,
    ).run();
  }
  return readComment(id, input.memberId);
}

export async function deleteCommunityComment(input: { id: string; memberId: number }) {
  const db = await getStoreDb();
  const owned = await db.prepare("SELECT id FROM community_comments WHERE id = ? AND member_id = ? AND status = 'visible' LIMIT 1")
    .bind(input.id, input.memberId).first<{ id: string }>();
  if (!owned) throw new Error("评论不存在或无权删除");
  await db.batch([
    db.prepare("UPDATE community_comments SET parent_comment_id = NULL, updated_at = CURRENT_TIMESTAMP WHERE parent_comment_id = ?").bind(input.id),
    db.prepare("UPDATE community_comments SET status = 'deleted', body = '', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND member_id = ?").bind(input.id, input.memberId),
  ]);
}
