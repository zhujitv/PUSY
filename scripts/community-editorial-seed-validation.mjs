import { access, readFile, stat } from "node:fs/promises";
import { createHash } from "node:crypto";
import { fileURLToPath } from "node:url";
import { editorialPosts, editorialProfiles } from "./community-editorial-seed-data.mjs";

const allowedTopics = new Set(["daily-makeup", "lip-diary", "real-empties", "body-care", "hair-inspiration"]);
const allowedSkinTypes = new Set(["normal", "dry", "oily", "combination", "sensitive"]);
const allowedUsagePeriods = new Set(["first-use", "one-week", "one-month", "three-months-plus"]);
const allowedScenes = new Set(["daily", "work", "date", "travel", "special-occasion"]);
const allowedHighlights = new Set(["显色", "持妆", "质地", "保湿", "香气", "便携", "温和", "性价比"]);

export async function validateEditorialSeed(projectRoot) {
  const profileKeys = new Set(editorialProfiles.map((profile) => profile.key));
  const ids = new Set();
  const requestIds = new Set();
  const mediaIds = new Set();
  const errors = [];

  if (editorialProfiles.length !== 3) errors.push("官方示例账号必须为 3 个");
  if (editorialPosts.length !== 18) errors.push("官方示例内容必须为 18 篇");

  for (const profile of editorialProfiles) {
    if (profile.officialLabel !== "官方示例") errors.push(`${profile.key} 缺少官方示例标识`);
    if (!profile.email.endsWith(".invalid")) errors.push(`${profile.key} 必须使用不可投递的系统邮箱`);
  }

  for (const post of editorialPosts) {
    if (ids.has(post.id)) errors.push(`帖子 ID 重复：${post.id}`);
    if (requestIds.has(post.clientRequestId)) errors.push(`请求 ID 重复：${post.clientRequestId}`);
    if (mediaIds.has(post.mediaId)) errors.push(`媒体 ID 重复：${post.mediaId}`);
    ids.add(post.id); requestIds.add(post.clientRequestId); mediaIds.add(post.mediaId);
    if (!profileKeys.has(post.profileKey)) errors.push(`${post.id} 的账号不存在`);
    if (!allowedTopics.has(post.topicSlug)) errors.push(`${post.id} 的话题不受支持`);
    if (!post.title.startsWith("官方示例｜") || !post.body.startsWith("【官方示例内容】")) errors.push(`${post.id} 未清晰披露示例身份`);
    if (!Array.isArray(post.highlights) || post.highlights.length < 2 || post.highlights.length > 5) errors.push(`${post.id} 的体验亮点数量无效`);
    if (!allowedSkinTypes.has(post.skinType)) errors.push(`${post.id} 的肤质标识无效`);
    if (!allowedUsagePeriods.has(post.usagePeriod)) errors.push(`${post.id} 的使用周期标识无效`);
    if (!allowedScenes.has(post.scene)) errors.push(`${post.id} 的使用场景标识无效`);
    if (post.highlights.some((item) => !allowedHighlights.has(item))) errors.push(`${post.id} 的体验亮点标识无效`);
    if (!Number.isInteger(post.rating) || post.rating < 1 || post.rating > 5) errors.push(`${post.id} 的评分无效`);
    const absolutePath = fileURLToPath(new URL(`public${post.mediaPath}`, projectRoot));
    try {
      await access(absolutePath);
      const mediaStat = await stat(absolutePath);
      if (mediaStat.size <= 0 || mediaStat.size > 450_000) errors.push(`${post.id} 的图片超过社区限制`);
    } catch {
      errors.push(`${post.id} 的图片不存在：${post.mediaPath}`);
    }
  }

  if (errors.length) throw new Error(`官方示例内容校验失败：\n- ${errors.join("\n- ")}`);
  return { profileCount: editorialProfiles.length, postCount: editorialPosts.length, topicCount: allowedTopics.size };
}

export async function mediaRecord(projectRoot, post) {
  const absolutePath = fileURLToPath(new URL(`public${post.mediaPath}`, projectRoot));
  const bytes = await readFile(absolutePath);
  return { bytes, byteSize: bytes.byteLength, mimeType: "image/webp" };
}

export function contentFingerprint(post) {
  return `official-seed-v1:${createHash("sha256").update(JSON.stringify({
    title: post.title, body: post.body, topicSlug: post.topicSlug, productSlug: post.productSlug,
    skinType: post.skinType, usagePeriod: post.usagePeriod, scene: post.scene,
    rating: post.rating, highlights: post.highlights, cautions: post.cautions,
  })).digest("hex")}`;
}
