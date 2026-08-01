import { phaseThreeHeaders } from "../../../../../../lib/community/contracts";
import { setCommunityPostInteraction } from "../../../../../../lib/community/engagement";
import { getPreviewMemberIdentity } from "../../../../../../lib/preview-member-auth";
import { allowRequest, allowRequestForIdentity, hasTrustedOrigin, privateJson, rateLimitResponse, safeServerError } from "../../../../../../lib/request-security";

export async function POST(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    if (!hasTrustedOrigin(request)) return privateJson({ error: "请求来源无效" }, { status: 403, headers: phaseThreeHeaders() });
    if (!await allowRequest(request, "community-interaction", 120, 60 * 60)) return rateLimitResponse();
    const viewer = await getPreviewMemberIdentity();
    if (!viewer) return privateJson({ error: "请先登录会员账户" }, { status: 401, headers: phaseThreeHeaders() });
    if (!await allowRequestForIdentity("community-interaction-member", String(viewer.memberId), 120, 60 * 60)) return rateLimitResponse();
    const { id } = await params;
    if (!/^PST-[A-Z0-9]{12}$/.test(id)) return privateJson({ error: "社区内容标识无效" }, { status: 400, headers: phaseThreeHeaders() });
    const payload = await request.json() as Record<string, unknown>;
    const kind = String(payload.kind ?? "") as "like" | "bookmark";
    if (!(["like", "bookmark"] as string[]).includes(kind)) return privateJson({ error: "互动类型无效" }, { status: 400, headers: phaseThreeHeaders() });
    if (typeof payload.enabled !== "boolean") return privateJson({ error: "互动状态无效" }, { status: 400, headers: phaseThreeHeaders() });
    const result = await setCommunityPostInteraction({ postId: id, memberId: viewer.memberId, kind, enabled: payload.enabled });
    return privateJson({ ok: true, phase: 3, ...result }, { headers: phaseThreeHeaders() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/^(社区内容不存在|不能给自己的分享点赞)/.test(message)) return privateJson({ error: message }, { status: 400, headers: phaseThreeHeaders() });
    if (error instanceof SyntaxError) return privateJson({ error: "请求内容不是有效的 JSON" }, { status: 400, headers: phaseThreeHeaders() });
    return safeServerError("互动操作失败，请稍后再试");
  }
}
