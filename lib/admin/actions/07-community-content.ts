import { deleteContentRevision, publishContentRevision, saveContentRevision } from "../../../db/commerce-features";
import { setCommunityPromotion } from "../../community/commerce";
import { createCommunityCampaign, qualifyCampaignEntry, updateCreatorGovernance } from "../../community/creator";
import { moderateCommunityReport } from "../../community/engagement";
import { moderateCommunityPost } from "../../community/moderation";
import { saveCommunityCampaign, saveCommunityTopic, sendCommunityBroadcast, updateCommunityCampaignStatus, updateCommunityCommentStatus, updateCommunityMemberGovernance } from "../../community/admin-operations";
import type { AdminActionContext, AdminActionResult } from "./action-context";

export async function handleCommunityContentAction(context: AdminActionContext): Promise<AdminActionResult> {
  const { action, payload, actor } = context;
  if (action === "update-community-post-status") {
      await moderateCommunityPost({
        postId: String(payload.id ?? ""),
        status: String(payload.status ?? "") as "pending" | "approved" | "rejected" | "hidden",
        reason: String(payload.reason ?? ""),
        actor,
      });
    } else if (action === "bulk-update-community-post-status") {
      const ids = Array.isArray(payload.ids) ? [...new Set(payload.ids.map(String).filter((id) => /^PST-[A-Z0-9]{12}$/.test(id)))].slice(0, 100) : [];
      const status = String(payload.status ?? "") as "pending" | "approved" | "rejected" | "hidden";
      if (!ids.length || !["approved", "hidden"].includes(status)) return Response.json({ error: "请选择内容并使用有效的批量状态" }, { status: 400 });
      for (const postId of ids) await moderateCommunityPost({ postId, status, reason: String(payload.reason ?? "批量社区运营处理").slice(0, 500), actor });
    } else if (action === "update-community-comment-status") {
      const status = String(payload.status ?? "") as "visible" | "hidden";
      if (!/^(visible|hidden)$/.test(status)) return Response.json({ error: "评论状态无效" }, { status: 400 });
      await updateCommunityCommentStatus({ id: String(payload.id ?? ""), status });
    } else if (action === "save-community-topic") {
      const slug = String(payload.slug ?? "").trim().toLowerCase().replace(/[^a-z0-9-]/g, "").slice(0, 40);
      const name = String(payload.name ?? "").trim().slice(0, 30);
      const status = String(payload.status ?? "draft") as "draft" | "active" | "archived";
      if (slug.length < 2 || !name || !["draft", "active", "archived"].includes(status)) return Response.json({ error: "请填写有效的话题名称、标识和状态" }, { status: 400 });
      await saveCommunityTopic({ id: String(payload.id ?? "") || undefined, slug, name, description: String(payload.description ?? "").trim().slice(0, 240), status, sortOrder: Math.max(0, Math.min(999, Number(payload.sortOrder ?? 0))), featured: payload.featured === true });
    } else if (action === "update-community-campaign-status") {
      const status = String(payload.status ?? "") as "draft" | "active" | "ended";
      if (!["draft", "active", "ended"].includes(status)) return Response.json({ error: "活动状态无效" }, { status: 400 });
      await updateCommunityCampaignStatus(String(payload.id ?? ""), status);
    } else if (action === "save-community-campaign") {
      const title = String(payload.title ?? "").trim().slice(0, 80);
      const status = String(payload.status ?? "draft") as "draft" | "active" | "ended";
      if (!title || !["draft", "active", "ended"].includes(status)) return Response.json({ error: "活动名称或状态无效" }, { status: 400 });
      await saveCommunityCampaign({ id: String(payload.id ?? ""), title, description: String(payload.description ?? "").trim().slice(0, 500), status, rewardPoints: Math.max(0, Math.min(500, Number(payload.rewardPoints ?? 0))), startsAt: String(payload.startsAt ?? "") || undefined, endsAt: String(payload.endsAt ?? "") || undefined });
    } else if (action === "update-community-member-governance") {
      const creatorStatus = String(payload.creatorStatus ?? "active") as "active" | "restricted";
      const commentStatus = String(payload.commentStatus ?? "active") as "active" | "restricted";
      if (!["active", "restricted"].includes(creatorStatus) || !["active", "restricted"].includes(commentStatus)) return Response.json({ error: "社区会员治理状态无效" }, { status: 400 });
      await updateCommunityMemberGovernance({ memberId: Number(payload.memberId), creatorStatus, commentStatus, restrictedUntil: String(payload.restrictedUntil ?? "") || undefined, note: String(payload.note ?? "").trim().slice(0, 300) });
    } else if (action === "send-community-broadcast") {
      const title = String(payload.title ?? "").trim().slice(0, 80);
      const body = String(payload.body ?? "").trim().slice(0, 500);
      const target = String(payload.target ?? "all") as "all" | "active" | "creators";
      if (!title || !body || !["all", "active", "creators"].includes(target)) return Response.json({ error: "请填写有效的社区通知" }, { status: 400 });
      const recipientCount = await sendCommunityBroadcast({ title, body, target, actorEmail: actor.email });
      return Response.json({ ok: true, recipientCount });
    } else if (action === "update-community-report-status") {
      await moderateCommunityReport({
        id: String(payload.id ?? ""),
        action: String(payload.decision ?? "") as "resolve" | "dismiss",
        note: String(payload.note ?? ""),
        actor,
      });
    } else if (action === "update-community-promotion") {
      await setCommunityPromotion({
        postId: String(payload.id ?? ""),
        placement: String(payload.placement ?? "none") as "none" | "featured" | "pinned",
        sortOrder: Number(payload.sortOrder ?? 0),
        note: String(payload.note ?? ""),
        actor,
      });
    } else if (action === "create-community-campaign") {
      const title = String(payload.title ?? "").trim().slice(0, 80);
      const slug = String(payload["slug"] ?? "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
      const status = String(payload.status ?? "draft") as "draft" | "active" | "ended";
      const rewardPoints = Math.min(500, Math.max(0, Math.round(Number(payload.rewardPoints ?? 0))));
      if (!title || slug.length < 2 || !["draft", "active", "ended"].includes(status)) return Response.json({ error: "请填写有效的活动名称、标识和状态" }, { status: 400 });
      await createCommunityCampaign({ title, slug, description: String(payload.description ?? "").trim().slice(0, 500), rules: String(payload.rules ?? "").trim().slice(0, 1000), topicSlug: String(payload.topicSlug ?? "") || undefined, productSlug: String(payload.productSlug ?? "") || undefined, rewardPoints, status, startsAt: String(payload.startsAt ?? "") || undefined, endsAt: String(payload.endsAt ?? "") || undefined, actorEmail: actor.email });
    } else if (action === "update-community-creator") {
      const accountType = String(payload.accountType ?? "member") as "member" | "official";
      const creatorStatus = String(payload.creatorStatus ?? "active") as "active" | "restricted";
      if (!["member", "official"].includes(accountType) || !["active", "restricted"].includes(creatorStatus)) return Response.json({ error: "创作者治理状态无效" }, { status: 400 });
      await updateCreatorGovernance({ memberId: Number(payload.memberId), accountType, officialLabel: String(payload.officialLabel ?? "").trim().slice(0, 30), creatorStatus });
    } else if (action === "qualify-community-campaign-entry") {
      await qualifyCampaignEntry({ postId: String(payload.id ?? ""), qualified: payload.qualified === true, note: String(payload.note ?? "").trim().slice(0, 500), actorEmail: actor.email });
    } else if (action === "update-site-content" || action === "save-content-draft" || action === "schedule-site-content") {
      const content = payload.content && typeof payload.content === "object" ? payload.content as Record<string, unknown> : {};
      await saveContentRevision({ title: String(payload.title ?? "首页内容版本"), content, status: action === "update-site-content" ? "published" : action === "schedule-site-content" ? "scheduled" : "draft", publishAt: String(payload.publishAt ?? ""), actor: actor.email });
    } else if (action === "publish-content-revision") {
      await publishContentRevision(String(payload.id ?? ""), actor.email);
    } else if (action === "delete-content-revision") {
      await deleteContentRevision(String(payload.id ?? ""));
  } else return false;
  return true;
}
