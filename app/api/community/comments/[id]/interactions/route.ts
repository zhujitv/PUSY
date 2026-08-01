import { setCommunityCommentLike } from "../../../../../../lib/community/engagement";
import { getPreviewMemberIdentity } from "../../../../../../lib/preview-member-auth";
import { allowRequestForIdentity, hasTrustedOrigin, privateJson, rateLimitResponse, safeServerError } from "../../../../../../lib/request-security";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!hasTrustedOrigin(request)) return privateJson({ error: "请求来源无效" }, { status: 403 });
    const viewer = await getPreviewMemberIdentity();
    if (!viewer) return privateJson({ error: "请先登录会员账户" }, { status: 401 });
    if (!await allowRequestForIdentity("community-comment-like", String(viewer.memberId), 120, 60 * 60)) return rateLimitResponse();
    const { id } = await params;
    if (!/^CMT-[A-Z0-9]{12}$/.test(id)) return privateJson({ error: "评论标识无效" }, { status: 400 });
    const payload = await request.json() as Record<string, unknown>;
    if (typeof payload.enabled !== "boolean") return privateJson({ error: "互动状态无效" }, { status: 400 });
    return privateJson({ ok: true, ...await setCommunityCommentLike({ id, memberId: viewer.memberId, enabled: payload.enabled }) });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/^(评论不存在|不能给自己的评论点赞)/.test(message)) return privateJson({ error: message }, { status: 400 });
    if (error instanceof SyntaxError) return privateJson({ error: "请求内容不是有效的 JSON" }, { status: 400 });
    return safeServerError("评论互动失败，请稍后再试");
  }
}
