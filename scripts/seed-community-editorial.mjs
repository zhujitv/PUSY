import { Pool } from "pg";
import { editorialPosts, editorialProfiles, editorialSeedActor } from "./community-editorial-seed-data.mjs";
import { contentFingerprint, mediaRecord, validateEditorialSeed } from "./community-editorial-seed-validation.mjs";

const projectRoot = new URL("../", import.meta.url);
const mode = process.argv.includes("--apply") ? "apply" : process.argv.includes("--rollback") ? "rollback" : "check";
const connectionString = process.env.DATABASE_URL;

const validation = await validateEditorialSeed(projectRoot);
if (mode === "check") {
  console.log(`官方示例内容校验通过：${validation.profileCount} 个账号，${validation.postCount} 篇内容，覆盖 ${validation.topicCount} 个话题。`);
  console.log("未连接数据库；使用 --apply 才会写入，使用 --rollback --confirm 才会回滚。");
  process.exit(0);
}

if (!connectionString) throw new Error("DATABASE_URL 未配置，无法修改数据库");
if (mode === "rollback" && !process.argv.includes("--confirm")) throw new Error("回滚必须同时提供 --rollback --confirm");

const pool = new Pool({ connectionString, max: 1, connectionTimeoutMillis: 10_000 });
const client = await pool.connect();

async function assertDatabaseDependencies() {
  const topicSlugs = [...new Set(editorialPosts.map((post) => post.topicSlug))];
  const productSlugs = [...new Set(editorialPosts.map((post) => post.productSlug))];
  const topics = await client.query("SELECT slug FROM community_topics WHERE status = 'active' AND slug = ANY($1::text[])", [topicSlugs]);
  const products = await client.query("SELECT slug FROM products WHERE status = 'active' AND slug = ANY($1::text[])", [productSlugs]);
  const missingTopics = topicSlugs.filter((slug) => !topics.rows.some((row) => row.slug === slug));
  const missingProducts = productSlugs.filter((slug) => !products.rows.some((row) => row.slug === slug));
  if (missingTopics.length || missingProducts.length) {
    throw new Error(`数据库依赖不完整。缺少话题：${missingTopics.join(", ") || "无"}；缺少商品：${missingProducts.join(", ") || "无"}`);
  }
}

async function assertOwnedSeedRows() {
  const postIds = editorialPosts.map((post) => post.id);
  const profileIds = editorialProfiles.map((profile) => profile.publicId);
  const posts = await client.query("SELECT id, moderated_by FROM community_posts WHERE id = ANY($1::text[])", [postIds]);
  const profiles = await client.query("SELECT public_id, account_type, official_label FROM community_profiles WHERE public_id = ANY($1::text[])", [profileIds]);
  const foreignPost = posts.rows.find((row) => row.moderated_by !== editorialSeedActor);
  const foreignProfile = profiles.rows.find((row) => row.account_type !== "official" || row.official_label !== "官方示例");
  if (foreignPost || foreignProfile) throw new Error("检测到同名 ID 已被非种子内容占用，已停止写入");
}

async function upsertProfiles() {
  const memberIds = new Map();
  for (const profile of editorialProfiles) {
    const member = await client.query(`INSERT INTO members (name, email, phone, status, total_orders, total_spent, joined_at, updated_at)
      VALUES ($1, $2, '', 'active', 0, 0, $3, $3)
      ON CONFLICT (email) DO UPDATE SET name = EXCLUDED.name, updated_at = EXCLUDED.updated_at
      RETURNING id`, [profile.displayName, profile.email, "2026-07-22T00:00:00+08:00"]);
    memberIds.set(profile.key, member.rows[0].id);
    await client.query(`INSERT INTO community_profiles
      (member_id, public_id, display_name, bio, status, account_type, official_label, creator_status, comment_status, created_at, updated_at)
      VALUES ($1, $2, $3, $4, 'active', 'official', $5, 'active', 'active', $6, $6)
      ON CONFLICT (member_id) DO UPDATE SET public_id = EXCLUDED.public_id, display_name = EXCLUDED.display_name,
        bio = EXCLUDED.bio, status = 'active', account_type = 'official', official_label = EXCLUDED.official_label,
        creator_status = 'active', comment_status = 'active', updated_at = EXCLUDED.updated_at`,
    [member.rows[0].id, profile.publicId, profile.displayName, profile.bio, profile.officialLabel, "2026-07-22T00:00:00+08:00"]);
  }
  return memberIds;
}

async function upsertPost(post, memberId) {
  const fingerprint = contentFingerprint(post);
  await client.query(`INSERT INTO community_posts
    (id, member_id, client_request_id, title, body, status, moderation_note, moderated_by, moderated_at, published_at,
      content_fingerprint, campaign_id, experience_skin_type, experience_usage_period, experience_scene, experience_rating,
      experience_highlights_json, experience_cautions, created_at, updated_at)
    VALUES ($1, $2, $3, $4, $5, 'approved', '官方示例内容', $6, $7, $7, $8, NULL, $9, $10, $11, $12, $13, $14, $7, $7)
    ON CONFLICT (id) DO UPDATE SET member_id = EXCLUDED.member_id, title = EXCLUDED.title, body = EXCLUDED.body,
      status = 'approved', moderation_note = EXCLUDED.moderation_note, moderated_by = EXCLUDED.moderated_by,
      moderated_at = EXCLUDED.moderated_at, published_at = EXCLUDED.published_at, content_fingerprint = EXCLUDED.content_fingerprint,
      campaign_id = NULL, experience_skin_type = EXCLUDED.experience_skin_type,
      experience_usage_period = EXCLUDED.experience_usage_period, experience_scene = EXCLUDED.experience_scene,
      experience_rating = EXCLUDED.experience_rating, experience_highlights_json = EXCLUDED.experience_highlights_json,
      experience_cautions = EXCLUDED.experience_cautions, updated_at = EXCLUDED.updated_at`,
  [post.id, memberId, post.clientRequestId, post.title, post.body, editorialSeedActor, post.publishedAt, fingerprint,
    post.skinType, post.usagePeriod, post.scene, post.rating, JSON.stringify(post.highlights), post.cautions]);

  const media = await mediaRecord(projectRoot, post);
  await client.query("DELETE FROM community_post_media WHERE post_id = $1", [post.id]);
  await client.query(`INSERT INTO community_post_media (id, post_id, position, mime_type, byte_size, bytes, created_at)
    VALUES ($1, $2, 0, $3, $4, $5, $6)`, [post.mediaId, post.id, media.mimeType, media.byteSize, media.bytes, post.publishedAt]);

  await client.query("DELETE FROM community_post_topics WHERE post_id = $1", [post.id]);
  await client.query(`INSERT INTO community_post_topics (post_id, topic_id, created_at)
    SELECT $1, id, $3 FROM community_topics WHERE slug = $2`, [post.id, post.topicSlug, post.publishedAt]);
  await client.query("DELETE FROM community_post_products WHERE post_id = $1", [post.id]);
  await client.query(`INSERT INTO community_post_products (post_id, product_slug, position, created_at)
    VALUES ($1, $2, 0, $3)`, [post.id, post.productSlug, post.publishedAt]);

  await client.query("DELETE FROM community_post_versions WHERE post_id = $1", [post.id]);
  await client.query(`INSERT INTO community_post_versions
    (post_id, version, title, body, status, topic_slugs_json, product_slugs_json, media_ids_json, change_type, actor_type, actor_id, created_at)
    VALUES ($1, 1, $2, $3, 'approved', $4, $5, $6, 'created', 'admin', $7, $8)`,
  [post.id, post.title, post.body, JSON.stringify([post.topicSlug]), JSON.stringify([post.productSlug]), JSON.stringify([post.mediaId]), editorialSeedActor, post.publishedAt]);

  await client.query("DELETE FROM community_moderation_events WHERE post_id = $1 AND admin_id = $2", [post.id, editorialSeedActor]);
  await client.query(`INSERT INTO community_moderation_events
    (post_id, from_status, to_status, reason, admin_id, actor_email, created_at)
    VALUES ($1, 'seed', 'approved', '官方示例内容初始化', $2, 'system@pusy.cn', $3)`, [post.id, editorialSeedActor, post.publishedAt]);
}

async function applySeed() {
  await assertDatabaseDependencies();
  await assertOwnedSeedRows();
  const existing = await client.query(`SELECT COUNT(*)::int AS count FROM community_posts
    WHERE id = ANY($1::text[]) AND status = 'approved' AND moderated_by = $2`, [editorialPosts.map((post) => post.id), editorialSeedActor]);
  if (existing.rows[0].count === editorialPosts.length) {
    console.log(`官方示例内容已存在：${existing.rows[0].count} 篇，跳过重复写入。`);
    return;
  }
  const memberIds = await upsertProfiles();
  for (const post of editorialPosts) await upsertPost(post, memberIds.get(post.profileKey));
  const verification = await client.query(`SELECT COUNT(*)::int AS count FROM community_posts
    WHERE id = ANY($1::text[]) AND status = 'approved' AND moderated_by = $2`, [editorialPosts.map((post) => post.id), editorialSeedActor]);
  if (verification.rows[0].count !== editorialPosts.length) throw new Error("数据库写入后的帖子数量校验失败");
  console.log(`官方示例内容写入完成：${editorialProfiles.length} 个账号，${verification.rows[0].count} 篇已审核内容。`);
}

async function rollbackSeed() {
  await assertOwnedSeedRows();
  const memberEmails = editorialProfiles.map((profile) => profile.email);
  const result = await client.query("DELETE FROM community_posts WHERE id = ANY($1::text[]) AND moderated_by = $2 RETURNING id", [editorialPosts.map((post) => post.id), editorialSeedActor]);
  await client.query(`DELETE FROM members WHERE email = ANY($1::text[])
    AND NOT EXISTS (SELECT 1 FROM community_posts WHERE community_posts.member_id = members.id)`, [memberEmails]);
  console.log(`官方示例内容已回滚：删除 ${result.rowCount} 篇种子帖子。`);
}

try {
  await client.query("SELECT pg_advisory_lock(hashtext('pusy-community-editorial-seed-v1'))");
  await client.query("BEGIN");
  if (mode === "apply") await applySeed(); else await rollbackSeed();
  await client.query("COMMIT");
} catch (error) {
  await client.query("ROLLBACK").catch(() => undefined);
  throw error;
} finally {
  await client.query("SELECT pg_advisory_unlock(hashtext('pusy-community-editorial-seed-v1'))").catch(() => undefined);
  client.release();
  await pool.end();
}
