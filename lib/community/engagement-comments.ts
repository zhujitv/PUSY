import { getStoreDb } from "../../db/store";
import { ensureCommunityProfile } from "./posts";
import { publicId } from "./engagement-shared";
import type { CommunityComment } from "./engagement-types";
import { recordCommunityActivity } from "./activity";

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
      (c.member_id = ?) AS viewer_is_author,
      (SELECT COUNT(*) FROM community_comment_likes cl WHERE cl.comment_id = c.id)::INTEGER AS like_count,
      EXISTS(SELECT 1 FROM community_comment_likes cl WHERE cl.comment_id = c.id AND cl.member_id = ?) AS viewer_has_liked
    FROM community_comments c
    JOIN community_posts p ON p.id = c.post_id AND p.status = 'approved'
    JOIN members m ON m.id = c.member_id AND m.status != 'blocked'
    JOIN community_profiles cp ON cp.member_id = c.member_id AND cp.status = 'active'
    WHERE c.id = ? AND c.status = 'visible'
    LIMIT 1
  `).bind(viewerMemberId, viewerMemberId, id).first<CommunityComment>();
  return row ? { ...row, like_count: Number(row.like_count), viewer_is_author: Boolean(row.viewer_is_author), viewer_has_liked: Boolean(row.viewer_has_liked) } : null;
}

export async function listCommunityComments(postId: string, viewerMemberId?: number) {
  const db = await getStoreDb();
  const rows = await db.prepare(`
    SELECT c.id, c.post_id, c.parent_comment_id, c.body, c.created_at,
      cp.public_id AS author_public_id, cp.display_name AS author_name,
      (c.member_id = ?) AS viewer_is_author,
      (SELECT COUNT(*) FROM community_comment_likes cl WHERE cl.comment_id = c.id)::INTEGER AS like_count,
      EXISTS(SELECT 1 FROM community_comment_likes cl WHERE cl.comment_id = c.id AND cl.member_id = ?) AS viewer_has_liked
    FROM community_comments c
    JOIN community_posts p ON p.id = c.post_id AND p.status = 'approved'
    JOIN members m ON m.id = c.member_id AND m.status != 'blocked'
    JOIN community_profiles cp ON cp.member_id = c.member_id AND cp.status = 'active'
    WHERE c.post_id = ? AND c.status = 'visible'
    ORDER BY c.created_at::timestamp ASC
    LIMIT 300
  `).bind(viewerMemberId ?? 0, viewerMemberId ?? 0, postId).all<CommunityComment>();
  const visible = rows.results.map((row) => ({ ...row, like_count: Number(row.like_count), viewer_is_author: Boolean(row.viewer_is_author), viewer_has_liked: Boolean(row.viewer_has_liked) }));
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
    const inserted = await db.prepare(`INSERT INTO ${table} (post_id, member_id) VALUES (?, ?) ON CONFLICT DO NOTHING`).bind(input.postId, input.memberId).run();
    if (input.kind === "like" && inserted.meta.changes) {
      await db.prepare(`INSERT INTO community_notifications
        (id, recipient_member_id, event_key, event_type, actor_member_id, entity_type, entity_id, post_id, payload_json)
        SELECT ?, ?, ?, 'post_like', ?, 'post', ?, ?,
          (SELECT json_build_object('count', COUNT(*))::TEXT FROM community_post_likes WHERE post_id = ?)
        WHERE NOT EXISTS (SELECT 1 FROM community_notification_preferences pref WHERE pref.member_id = ? AND pref.reactions_enabled = 0)
        ON CONFLICT (recipient_member_id, event_key) DO UPDATE SET actor_member_id = EXCLUDED.actor_member_id,
          payload_json = EXCLUDED.payload_json, read_at = NULL, created_at = CURRENT_TIMESTAMP::TEXT`)
        .bind(`NTF-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`, post.member_id, `post-like:${input.postId}`, input.memberId, input.postId, input.postId, input.postId, post.member_id).run();
      await recordCommunityActivity({ memberId: input.memberId, type: "like", eventKey: `like:${input.postId}:${input.memberId}`, entityType: "post", entityId: input.postId });
    }
  } else {
    await db.prepare(`DELETE FROM ${table} WHERE post_id = ? AND member_id = ?`).bind(input.postId, input.memberId).run();
    if (input.kind === "like") {
      const remaining = await db.prepare("SELECT COUNT(*)::INTEGER AS count FROM community_post_likes WHERE post_id = ?").bind(input.postId).first<{ count: number }>();
      if (Number(remaining?.count ?? 0) > 0) await db.prepare("UPDATE community_notifications SET payload_json = ? WHERE recipient_member_id = ? AND event_key = ?").bind(JSON.stringify({ count: Number(remaining?.count ?? 0) }), post.member_id, `post-like:${input.postId}`).run();
      else await db.prepare("DELETE FROM community_notifications WHERE recipient_member_id = ? AND event_key = ?").bind(post.member_id, `post-like:${input.postId}`).run();
    }
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
  const profile = await db.prepare("SELECT comment_status, restricted_until FROM community_profiles WHERE member_id = ? LIMIT 1").bind(input.memberId).first<{ comment_status: string; restricted_until: string | null }>();
  if (profile?.comment_status === "restricted" && (!profile.restricted_until || new Date(profile.restricted_until).getTime() > Date.now())) throw new Error("你的社区评论权限暂时受限");

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
      SELECT ?, ?, ?, ?, ?, 'comment', ?, ?
      WHERE NOT EXISTS (SELECT 1 FROM community_notification_preferences pref WHERE pref.member_id = ? AND pref.social_enabled = 0)
      ON CONFLICT (recipient_member_id, event_key) DO NOTHING
    `).bind(
      `NTF-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`,
      recipient,
      `comment:${id}`,
      parentAuthorId ? "comment_reply" : "post_comment",
      input.memberId,
      id,
      input.postId,
      recipient,
    ).run();
  }
  const mentionedIds = [...new Set(body.match(/@MBR-[A-Z0-9]{12}/gi)?.map((token) => token.slice(1).toUpperCase()) ?? [])].slice(0, 5);
  if (mentionedIds.length) {
    const mentions = await db.prepare("SELECT member_id, public_id FROM community_profiles WHERE public_id = ANY(?::text[]) AND status = 'active'").bind(mentionedIds).all<{ member_id: number; public_id: string }>();
    await db.batch(mentions.results.filter((mention) => Number(mention.member_id) !== input.memberId && Number(mention.member_id) !== recipient).map((mention) => db.prepare(`
      INSERT INTO community_notifications (id, recipient_member_id, event_key, event_type, actor_member_id, entity_type, entity_id, post_id)
      SELECT ?, ?, ?, 'mention', ?, 'comment', ?, ?
      WHERE NOT EXISTS (SELECT 1 FROM community_notification_preferences pref WHERE pref.member_id = ? AND pref.social_enabled = 0)
      ON CONFLICT (recipient_member_id, event_key) DO NOTHING
    `).bind(`NTF-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`, mention.member_id, `mention:${id}:${mention.member_id}`, input.memberId, id, input.postId, mention.member_id)));
  }
  await recordCommunityActivity({ memberId: input.memberId, type: "comment", eventKey: `comment:${id}`, entityType: "comment", entityId: id });
  return readComment(id, input.memberId);
}

export async function setCommunityCommentLike(input: { id: string; memberId: number; enabled: boolean }) {
  const db = await getStoreDb();
  const comment = await db.prepare(`SELECT c.id, c.member_id, c.post_id FROM community_comments c
    JOIN community_posts p ON p.id = c.post_id AND p.status = 'approved' WHERE c.id = ? AND c.status = 'visible' LIMIT 1`)
    .bind(input.id).first<{ id: string; member_id: number; post_id: string }>();
  if (!comment) throw new Error("评论不存在或已隐藏");
  if (Number(comment.member_id) === input.memberId) throw new Error("不能给自己的评论点赞");
  if (input.enabled) {
    const inserted = await db.prepare("INSERT INTO community_comment_likes (comment_id, member_id) VALUES (?, ?) ON CONFLICT DO NOTHING").bind(input.id, input.memberId).run();
    if (inserted.meta.changes) {
      await db.prepare(`INSERT INTO community_notifications (id, recipient_member_id, event_key, event_type, actor_member_id, entity_type, entity_id, post_id, payload_json)
        SELECT ?, ?, ?, 'comment_like', ?, 'comment', ?, ?,
          (SELECT json_build_object('count', COUNT(*))::TEXT FROM community_comment_likes WHERE comment_id = ?)
        WHERE NOT EXISTS (SELECT 1 FROM community_notification_preferences pref WHERE pref.member_id = ? AND pref.reactions_enabled = 0)
        ON CONFLICT (recipient_member_id, event_key) DO UPDATE SET actor_member_id = EXCLUDED.actor_member_id,
          payload_json = EXCLUDED.payload_json, read_at = NULL, created_at = CURRENT_TIMESTAMP::TEXT`)
        .bind(`NTF-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`, comment.member_id, `comment-like:${input.id}`, input.memberId, input.id, comment.post_id, input.id, comment.member_id).run();
      await recordCommunityActivity({ memberId: input.memberId, type: "comment_like", eventKey: `comment-like:${input.id}:${input.memberId}`, entityType: "comment", entityId: input.id });
    }
  } else {
    await db.prepare("DELETE FROM community_comment_likes WHERE comment_id = ? AND member_id = ?").bind(input.id, input.memberId).run();
    const remaining = await db.prepare("SELECT COUNT(*)::INTEGER AS count FROM community_comment_likes WHERE comment_id = ?").bind(input.id).first<{ count: number }>();
    if (Number(remaining?.count ?? 0) > 0) await db.prepare("UPDATE community_notifications SET payload_json = ? WHERE recipient_member_id = ? AND event_key = ?").bind(JSON.stringify({ count: Number(remaining?.count ?? 0) }), comment.member_id, `comment-like:${input.id}`).run();
    else await db.prepare("DELETE FROM community_notifications WHERE recipient_member_id = ? AND event_key = ?").bind(comment.member_id, `comment-like:${input.id}`).run();
  }
  const state = await db.prepare(`SELECT COUNT(*)::INTEGER AS like_count,
    EXISTS(SELECT 1 FROM community_comment_likes WHERE comment_id = ? AND member_id = ?) AS viewer_has_liked
    FROM community_comment_likes WHERE comment_id = ?`).bind(input.id, input.memberId, input.id).first<{ like_count: number; viewer_has_liked: boolean }>();
  return { likeCount: Number(state?.like_count ?? 0), liked: Boolean(state?.viewer_has_liked) };
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
