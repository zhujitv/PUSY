import { deleteContentRevision, publishContentRevision, saveContentRevision } from "../../../db/commerce-features";
import { setCommunityPromotion } from "../../community/commerce";
import { createCommunityCampaign, qualifyCampaignEntry, updateCreatorGovernance } from "../../community/creator";
import { moderateCommunityReport } from "../../community/engagement";
import { moderateCommunityPost } from "../../community/moderation";
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
