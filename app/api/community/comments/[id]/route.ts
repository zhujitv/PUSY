import { phaseThreeHeaders } from "../../../../../lib/community/contracts";
import { deleteCommunityComment } from "../../../../../lib/community/engagement";
import { getPreviewMemberIdentity } from "../../../../../lib/preview-member-auth";
import { allowRequestForIdentity, hasTrustedOrigin, privateJson, rateLimitResponse, safeServerError } from "../../../../../lib/request-security";

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!hasTrustedOrigin(request)) return privateJson({ error: "请求来源无效" }, { status: 403, headers: phaseThreeHeaders() });
    const viewer = await getPreviewMemberIdentity();
    if (!viewer) return privateJson({ error: "请先登录会员账户" }, { status: 401, headers: phaseThreeHeaders() });
    if (!await allowRequestForIdentity("community-comment-delete", String(viewer.memberId), 30, 60 * 60)) return rateLimitResponse();
    const { id } = await params;
    if (!/^CMT-[A-Z0-9]{12}$/.test(id)) return privateJson({ error: "评论标识无效" }, { status: 400, headers: phaseThreeHeaders() });
    await deleteCommunityComment({ id, memberId: viewer.memberId });
    return privateJson({ ok: true }, { headers: phaseThreeHeaders() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/评论不存在或无权删除/.test(message)) return privateJson({ error: message }, { status: 404, headers: phaseThreeHeaders() });
    return safeServerError("评论删除失败，请稍后再试");
  }
}
