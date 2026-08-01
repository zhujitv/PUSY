import { getStoreDb } from "../../db/store";
import { completeMemberTask } from "../growth/member-program";
import { resolveCommunityProducts } from "./commerce";
import { resolveCommunityTopics } from "./topics";

export type CommunityCampaign = {
  id: string;
  slug: string;
  title: string;
  description: string;
  rules: string;
  topic_slug: string;
  topic_name: string;
  product_slug: string;
  reward_points: number;
  status: "draft" | "active" | "ended";
  starts_at: string | null;
  ends_at: string | null;
  entry_count: number;
};

export async function listCommunityCampaigns(input: { includeInactive?: boolean } = {}) {
  const db = await getStoreDb();
  const where = input.includeInactive ? "" : "WHERE c.status = 'active' AND (c.starts_at IS NULL OR c.starts_at::timestamp <= CURRENT_TIMESTAMP) AND (c.ends_at IS NULL OR c.ends_at::timestamp >= CURRENT_TIMESTAMP)";
  const rows = await db.prepare(`SELECT c.id, c.slug, c.title, c.description, c.rules, c.product_slug, c.reward_points, c.status, c.starts_at, c.ends_at,
    COALESCE(t.slug, '') AS topic_slug, COALESCE(t.name, '') AS topic_name,
    (SELECT COUNT(*) FROM community_campaign_entries e WHERE e.campaign_id = c.id)::INTEGER AS entry_count
    FROM community_campaigns c LEFT JOIN community_topics t ON t.id = c.topic_id
    ${where} ORDER BY CASE c.status WHEN 'active' THEN 0 WHEN 'draft' THEN 1 ELSE 2 END, c.created_at DESC`).all<CommunityCampaign>();
  return rows.results.map((row) => ({ ...row, reward_points: Number(row.reward_points), entry_count: Number(row.entry_count) }));
}

export async function getCreatorDashboard(memberId: number) {
  const db = await getStoreDb();
  const [profile, posts, stats, points, versions] = await Promise.all([
    db.prepare("SELECT public_id, display_name, account_type, official_label, creator_status, reward_blocked_at FROM community_profiles WHERE member_id = ? LIMIT 1").bind(memberId).first<Record<string, string | null>>(),
    db.prepare(`SELECT p.id, p.title, p.body, p.status, p.moderation_note, p.published_at, p.created_at, p.updated_at,
      COALESCE((SELECT json_agg(cm.id ORDER BY cm.position) FROM community_post_media cm WHERE cm.post_id = p.id), '[]'::json) AS media_ids,
      COALESCE((SELECT c.title FROM community_campaigns c WHERE c.id = p.campaign_id), '') AS campaign_title,
      COALESCE((SELECT e.status FROM community_campaign_entries e WHERE e.post_id = p.id), '') AS campaign_status
      FROM community_posts p WHERE p.member_id = ? ORDER BY p.updated_at::timestamp DESC LIMIT 100`).bind(memberId).all<Record<string, unknown>>(),
    db.prepare(`SELECT COUNT(*)::INTEGER AS total_posts,
      COUNT(*) FILTER (WHERE p.status = 'approved')::INTEGER AS approved_posts,
      COUNT(*) FILTER (WHERE p.status = 'draft')::INTEGER AS draft_posts,
      COALESCE((SELECT COUNT(*) FROM community_content_events e JOIN community_posts owned ON owned.id = e.post_id WHERE owned.member_id = ? AND e.event_type = 'post_impression'), 0)::INTEGER AS impressions,
      COALESCE((SELECT COUNT(*) FROM community_post_likes l JOIN community_posts owned ON owned.id = l.post_id WHERE owned.member_id = ?), 0)::INTEGER AS likes,
      COALESCE((SELECT COUNT(*) FROM community_comments c JOIN community_posts owned ON owned.id = c.post_id WHERE owned.member_id = ? AND c.status = 'visible'), 0)::INTEGER AS comments,
      COALESCE((SELECT COUNT(*) FROM community_content_events e JOIN community_posts owned ON owned.id = e.post_id WHERE owned.member_id = ? AND e.event_type = 'product_click'), 0)::INTEGER AS product_clicks,
      COALESCE((SELECT COUNT(*) FROM community_content_events e JOIN community_posts owned ON owned.id = e.post_id WHERE owned.member_id = ? AND e.event_type = 'add_to_cart'), 0)::INTEGER AS add_to_carts
      FROM community_posts p WHERE p.member_id = ?`).bind(memberId, memberId, memberId, memberId, memberId, memberId).first<Record<string, number>>(),
    db.prepare("SELECT points_balance, lifetime_points, tier FROM members WHERE id = ? LIMIT 1").bind(memberId).first<{ points_balance: number; lifetime_points: number; tier: string }>(),
    db.prepare("SELECT post_id, COUNT(*)::INTEGER AS version_count FROM community_post_versions WHERE post_id IN (SELECT id FROM community_posts WHERE member_id = ?) GROUP BY post_id").bind(memberId).all<{ post_id: string; version_count: number }>(),
  ]);
  const versionCounts = new Map(versions.results.map((row) => [row.post_id, Number(row.version_count)]));
  return {
    profile,
    points: points ?? { points_balance: 0, lifetime_points: 0, tier: "bronze" },
    stats: Object.fromEntries(Object.entries(stats ?? {}).map(([key, value]) => [key, Number(value)])),
    posts: posts.results.map((post) => ({ ...post, media_ids: Array.isArray(post.media_ids) ? post.media_ids.map(String) : [], version_count: versionCounts.get(String(post.id)) ?? 0 })),
  };
}

function normalizeEditable(input: { title: string; body: string }) {
  const title = input.title.trim().replace(/\s+/g, " ").slice(0, 80);
  const body = input.body.trim().slice(0, 1_500);
  return { title, body };
}

async function fingerprint(title: string, body: string) {
  const normalized = `${title}\n${body}`.toLowerCase().replace(/\s+/g, " ").replace(/[^\p{L}\p{N} ]/gu, "").trim();
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(normalized));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

export async function updateCreatorPost(input: { memberId: number; postId: string; title: string; body: string; topicSlugs: string[]; productSlugs: string[]; intent: "draft" | "submit"; expectedUpdatedAt: string }) {
  const db = await getStoreDb();
  const post = await db.prepare(`SELECT p.id, p.status, p.updated_at, cp.creator_status, cp.restricted_until
    FROM community_posts p JOIN community_profiles cp ON cp.member_id = p.member_id
    WHERE p.id = ? AND p.member_id = ? LIMIT 1`).bind(input.postId, input.memberId).first<{ id: string; status: string; updated_at: string; creator_status: string; restricted_until: string | null }>();
  if (!post) throw new Error("分享不存在或不属于当前会员");
  if (post.status === "hidden") throw new Error("已隐藏内容请先恢复后再编辑");
  if (input.expectedUpdatedAt && post.updated_at !== input.expectedUpdatedAt) throw new Error("这篇分享刚刚在其他页面被修改，请刷新后重试");
  if (input.intent === "submit" && post.creator_status === "restricted" && (!post.restricted_until || new Date(post.restricted_until).getTime() > Date.now())) throw new Error("该创作者账号暂时无法提交内容");
  const content = normalizeEditable(input);
  const media = await db.prepare("SELECT COUNT(*)::INTEGER AS count FROM community_post_media WHERE post_id = ?").bind(post.id).first<{ count: number }>();
  if (input.intent === "submit" && content.body.length < 10) throw new Error("正文至少需要 10 个字");
  if (input.intent === "submit" && !Number(media?.count)) throw new Error("提交审核前请至少上传 1 张图片");
  const [topics, products] = await Promise.all([resolveCommunityTopics(input.topicSlugs), resolveCommunityProducts(input.productSlugs)]);
  if (input.intent === "submit" && !topics.length) throw new Error("请至少选择 1 个社区话题");
  const nextStatus = input.intent === "draft" ? "draft" : "pending";
  const hash = content.body ? await fingerprint(content.title, content.body) : "";
  if (nextStatus === "pending" && hash) {
    const duplicate = await db.prepare("SELECT id FROM community_posts WHERE member_id = ? AND id != ? AND content_fingerprint = ? AND status != 'draft' AND created_at::timestamp >= CURRENT_TIMESTAMP - INTERVAL '30 days' LIMIT 1").bind(input.memberId, post.id, hash).first();
    if (duplicate) throw new Error("这篇内容与近 30 天内的投稿重复，请补充新的体验后再提交");
  }
  const result = await db.prepare("UPDATE community_posts SET title = ?, body = ?, status = ?, content_fingerprint = ?, moderation_note = '', moderated_by = NULL, moderated_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND member_id = ? AND updated_at = ? RETURNING updated_at").bind(content.title, content.body, nextStatus, hash, post.id, input.memberId, post.updated_at).first<{ updated_at: string }>();
  if (!result) throw new Error("内容已变化，请刷新后重试");
  await db.batch([
    db.prepare("DELETE FROM community_post_topics WHERE post_id = ?").bind(post.id),
    db.prepare("DELETE FROM community_post_products WHERE post_id = ?").bind(post.id),
    ...topics.map((topic) => db.prepare("INSERT INTO community_post_topics (post_id, topic_id) VALUES (?, ?)").bind(post.id, topic.id)),
    ...products.map((product, position) => db.prepare("INSERT INTO community_post_products (post_id, product_slug, position) VALUES (?, ?, ?)").bind(post.id, product.slug, position)),
    db.prepare(`INSERT INTO community_post_versions (post_id, version, title, body, status, topic_slugs_json, product_slugs_json, media_ids_json, change_type, actor_type, actor_id)
      SELECT p.id, COALESCE((SELECT MAX(v.version) + 1 FROM community_post_versions v WHERE v.post_id = p.id), 1), p.title, p.body, p.status,
        ?, ?, COALESCE((SELECT json_agg(m.id ORDER BY m.position)::TEXT FROM community_post_media m WHERE m.post_id = p.id), '[]'), ?, 'member', ?
      FROM community_posts p WHERE p.id = ?`)
      .bind(JSON.stringify(topics.map((topic) => topic.slug)), JSON.stringify(products.map((product) => product.slug)), nextStatus === "draft" ? "draft_saved" : "edited", String(input.memberId), post.id),
  ]);
  return { status: nextStatus, updatedAt: result.updated_at };
}

export async function setCreatorPostHidden(input: { memberId: number; postId: string; hidden: boolean }) {
  const db = await getStoreDb();
  const status = input.hidden ? "hidden" : "pending";
  const result = await db.prepare("UPDATE community_posts SET status = ?, moderation_note = '', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND member_id = ? AND (? OR status = 'hidden') RETURNING id").bind(status, input.postId, input.memberId, input.hidden).first<{ id: string }>();
  if (!result) throw new Error("分享不存在，或当前状态不能执行此操作");
  await db.prepare(`INSERT INTO community_post_versions (post_id, version, title, body, status, topic_slugs_json, product_slugs_json, media_ids_json, change_type, actor_type, actor_id)
    SELECT p.id, COALESCE((SELECT MAX(v.version) + 1 FROM community_post_versions v WHERE v.post_id = p.id), 1), p.title, p.body, p.status,
      COALESCE((SELECT json_agg(t.slug)::TEXT FROM community_post_topics pt JOIN community_topics t ON t.id = pt.topic_id WHERE pt.post_id = p.id), '[]'),
      COALESCE((SELECT json_agg(pp.product_slug ORDER BY pp.position)::TEXT FROM community_post_products pp WHERE pp.post_id = p.id), '[]'),
      COALESCE((SELECT json_agg(m.id ORDER BY m.position)::TEXT FROM community_post_media m WHERE m.post_id = p.id), '[]'), ?, 'member', ?
    FROM community_posts p WHERE p.id = ?`).bind(input.hidden ? "hidden" : "restored", String(input.memberId), input.postId).run();
  return status;
}

export async function rewardApprovedCommunityPost(postId: string) {
  const db = await getStoreDb();
  const post = await db.prepare(`SELECT p.member_id, p.body, cp.account_type, cp.reward_blocked_at,
    EXISTS(SELECT 1 FROM community_post_media m WHERE m.post_id = p.id) AS has_media,
    EXISTS(SELECT 1 FROM community_post_products pp JOIN orders o ON o.member_id = p.member_id JOIN order_items oi ON oi.order_id = o.id AND oi.product_slug = pp.product_slug WHERE pp.post_id = p.id AND o.status NOT IN ('待付款','支付失败','已取消','已退款')) AS verified_purchase
    FROM community_posts p JOIN community_profiles cp ON cp.member_id = p.member_id WHERE p.id = ? AND p.status = 'approved' LIMIT 1`).bind(postId).first<{ member_id: number; body: string; account_type: string; reward_blocked_at: string | null; has_media: boolean; verified_purchase: boolean }>();
  if (!post || post.account_type === "official" || post.reward_blocked_at || !post.has_media || post.body.length < 40) return [];
  const awards = [
    { key: "community_post_approved", points: 30, reason: "社区优质分享审核通过奖励" },
    ...(post.verified_purchase ? [{ key: "community_verified_purchase", points: 20, reason: "社区真实已购分享奖励" }] : []),
  ];
  const granted = [];
  for (const award of awards) {
    const referenceId = `community:${award.key}:${postId}`;
    const result = await completeMemberTask({ memberId: Number(post.member_id), taskKey: award.key, periodKey: postId, points: award.points, reason: award.reason, referenceId, metadata: { postId } });
    if (result) {
      await db.prepare("INSERT INTO community_reward_grants (member_id, post_id, reward_key, points, reference_id) VALUES (?, ?, ?, ?, ?) ON CONFLICT DO NOTHING").bind(post.member_id, postId, award.key, award.points, referenceId).run();
      granted.push({ ...award, balanceAfter: Number(result.balance_after) });
    }
  }
  return granted;
}

export async function createCommunityCampaign(input: { title: string; slug: string; description: string; rules: string; topicSlug?: string; productSlug?: string; rewardPoints: number; status: "draft" | "active" | "ended"; startsAt?: string; endsAt?: string; actorEmail: string }) {
  const db = await getStoreDb();
  const topic = input.topicSlug ? await db.prepare("SELECT id FROM community_topics WHERE slug = ? LIMIT 1").bind(input.topicSlug).first<{ id: string }>() : null;
  if (input.topicSlug && !topic) throw new Error("社区话题不存在");
  if (input.productSlug) {
    const product = await db.prepare("SELECT slug FROM products WHERE slug = ? AND status = 'active' LIMIT 1").bind(input.productSlug).first();
    if (!product) throw new Error("关联商品不存在或未启用");
  }
  const id = `CMP-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
  await db.prepare("INSERT INTO community_campaigns (id, slug, title, description, rules, topic_id, product_slug, reward_points, status, starts_at, ends_at, created_by) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)")
    .bind(id, input.slug, input.title, input.description, input.rules, topic?.id ?? null, input.productSlug || null, input.rewardPoints, input.status, input.startsAt || null, input.endsAt || null, input.actorEmail).run();
  return id;
}

export async function updateCreatorGovernance(input: { memberId: number; accountType: "member" | "official"; officialLabel: string; creatorStatus: "active" | "restricted" }) {
  const db = await getStoreDb();
  const result = await db.prepare("UPDATE community_profiles SET account_type = ?, official_label = ?, creator_status = ?, reward_blocked_at = CASE WHEN ? = 'restricted' THEN COALESCE(reward_blocked_at, CURRENT_TIMESTAMP::TEXT) ELSE NULL END, updated_at = CURRENT_TIMESTAMP WHERE member_id = ? RETURNING public_id").bind(input.accountType, input.accountType === "official" ? input.officialLabel : "", input.creatorStatus, input.creatorStatus, input.memberId).first<{ public_id: string }>();
  if (!result) throw new Error("创作者资料不存在");
  return result.public_id;
}

export async function qualifyCampaignEntry(input: { postId: string; qualified: boolean; note: string; actorEmail: string }) {
  const db = await getStoreDb();
  const entry = await db.prepare(`UPDATE community_campaign_entries e SET status = ?, reward_points = CASE WHEN ? THEN c.reward_points ELSE 0 END,
    review_note = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
    FROM community_campaigns c, community_posts p
    WHERE e.post_id = ? AND c.id = e.campaign_id AND p.id = e.post_id AND p.status = 'approved'
    RETURNING e.member_id, e.campaign_id, c.reward_points`).bind(input.qualified ? "qualified" : "rejected", input.qualified, input.note, input.actorEmail, input.postId).first<{ member_id: number; campaign_id: string; reward_points: number }>();
  if (!entry) throw new Error("活动投稿不存在，或内容尚未审核通过");
  if (input.qualified && Number(entry.reward_points) > 0) {
    const referenceId = `community:campaign:${entry.campaign_id}:${input.postId}`;
    const award = await completeMemberTask({ memberId: Number(entry.member_id), taskKey: "community_campaign", periodKey: `${entry.campaign_id}:${input.postId}`, points: Number(entry.reward_points), reason: "社区主题活动优质内容奖励", referenceId, metadata: { postId: input.postId, campaignId: entry.campaign_id } });
    if (award) await db.prepare("INSERT INTO community_reward_grants (member_id, post_id, reward_key, points, reference_id) VALUES (?, ?, 'campaign', ?, ?) ON CONFLICT DO NOTHING").bind(entry.member_id, input.postId, entry.reward_points, referenceId).run();
  }
  return true;
}
