import { phaseThreeHeaders } from "../../../../../../lib/community/contracts";
import { createCommunityComment, listCommunityComments } from "../../../../../../lib/community/engagement";
import { getPreviewMemberIdentity } from "../../../../../../lib/preview-member-auth";
import { allowRequest, allowRequestForIdentity, hasTrustedOrigin, privateJson, rateLimitResponse, safeServerError } from "../../../../../../lib/request-security";

export async function GET(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    if (!/^PST-[A-Z0-9]{12}$/.test(id)) return privateJson({ error: "社区内容标识无效" }, { status: 400, headers: phaseThreeHeaders() });
    const viewer = await getPreviewMemberIdentity();
    return privateJson({ phase: 3, comments: await listCommunityComments(id, viewer?.memberId) }, { headers: phaseThreeHeaders() });
  } catch { return safeServerError("评论暂时无法读取，请稍后再试"); }
}

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!hasTrustedOrigin(request)) return privateJson({ error: "请求来源无效" }, { status: 403, headers: phaseThreeHeaders() });
    if (!await allowRequest(request, "community-comment", 30, 60 * 60)) return rateLimitResponse();
    const viewer = await getPreviewMemberIdentity();
    if (!viewer) return privateJson({ error: "请先登录会员账户" }, { status: 401, headers: phaseThreeHeaders() });
    if (!await allowRequestForIdentity("community-comment-member", String(viewer.memberId), 30, 60 * 60)) return rateLimitResponse();
    const { id } = await params;
    if (!/^PST-[A-Z0-9]{12}$/.test(id)) return privateJson({ error: "社区内容标识无效" }, { status: 400, headers: phaseThreeHeaders() });
    const payload = await request.json() as Record<string, unknown>;
    const parentCommentId = payload.parentCommentId ? String(payload.parentCommentId).trim().toUpperCase() : undefined;
    if (parentCommentId && !/^CMT-[A-Z0-9]{12}$/.test(parentCommentId)) return privateJson({ error: "回复标识无效" }, { status: 400, headers: phaseThreeHeaders() });
    const comment = await createCommunityComment({
      postId: id,
      memberId: viewer.memberId,
      displayName: viewer.displayName,
      body: String(payload.body ?? ""),
      parentCommentId,
    });
    return privateJson({ ok: true, phase: 3, comment }, { status: 201, headers: phaseThreeHeaders() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/^(评论至少|评论最多|社区内容不存在|要回复的评论不存在)/.test(message)) return privateJson({ error: message }, { status: 400, headers: phaseThreeHeaders() });
    if (error instanceof SyntaxError) return privateJson({ error: "请求内容不是有效的 JSON" }, { status: 400, headers: phaseThreeHeaders() });
    return safeServerError("评论发布失败，请稍后再试");
  }
}
