import { getPreviewMemberIdentity } from "../../../../../lib/preview-member-auth";
import { hasTrustedOrigin, privateJson, safeServerError } from "../../../../../lib/request-security";
import { setCreatorPostHidden, updateCreatorPost } from "../../../../../lib/community/creator";
import { normalizeCommunityExperience } from "../../../../../lib/community/experience";

function slugs(value: unknown, limit: number) {
  return Array.isArray(value) ? Array.from(new Set(value.map(String).map((item) => item.trim().toLowerCase()).filter((item) => /^[a-z0-9-]{2,119}$/.test(item)))).slice(0, limit) : [];
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!hasTrustedOrigin(request)) return privateJson({ error: "请求来源无效" }, { status: 403 });
    const viewer = await getPreviewMemberIdentity();
    if (!viewer) return privateJson({ error: "请先登录会员账户" }, { status: 401 });
    const postId = (await params).id.toUpperCase();
    if (!/^PST-[A-Z0-9]{12}$/.test(postId)) return privateJson({ error: "分享标识无效" }, { status: 400 });
    const payload = await request.json() as Record<string, unknown>;
    if (payload.action === "hide" || payload.action === "restore") {
      const status = await setCreatorPostHidden({ memberId: viewer.memberId, postId, hidden: payload.action === "hide" });
      return privateJson({ ok: true, status, message: status === "hidden" ? "内容已隐藏" : "内容已恢复并重新进入审核" });
    }
    const intent = payload.intent === "draft" ? "draft" : "submit";
    const result = await updateCreatorPost({
      memberId: viewer.memberId,
      postId,
      title: String(payload.title ?? ""),
      body: String(payload.body ?? ""),
      topicSlugs: slugs(payload.topicSlugs, 3),
      productSlugs: slugs(payload.productSlugs, 3),
      experience: normalizeCommunityExperience(payload),
      expectedUpdatedAt: String(payload.expectedUpdatedAt ?? ""),
      intent,
    });
    return privateJson({ ok: true, ...result, message: intent === "draft" ? "草稿已更新" : "修改已提交审核" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/分享不存在|已隐藏|正文至少|提交审核|社区话题|内容已变化|刚刚在其他页面|这篇内容|已购分享/.test(message)) return privateJson({ error: message }, { status: /不存在/.test(message) ? 404 : 409 });
    if (/创作者账号/.test(message)) return privateJson({ error: message }, { status: 403 });
    console.error("[community/creator-post] update failed", { message });
    return safeServerError("保存失败，请稍后再试");
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  return PATCH(new Request(request.url, { method: "PATCH", headers: request.headers, body: JSON.stringify({ action: "hide" }) }), context);
}
