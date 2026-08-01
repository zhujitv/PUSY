import { phaseTwoHeaders } from "../../../../lib/community/contracts";
import { followCommunityMember, listCommunityFollows, unfollowCommunityMember } from "../../../../lib/community/social";
import { getPreviewMemberIdentity } from "../../../../lib/preview-member-auth";
import { allowRequestForIdentity, hasTrustedOrigin, privateJson, rateLimitResponse, safeServerError } from "../../../../lib/request-security";

export async function GET() {
  try {
    const viewer = await getPreviewMemberIdentity();
    if (!viewer) return privateJson({ error: "请先登录会员账户" }, { status: 401, headers: phaseTwoHeaders() });
    const result = await listCommunityFollows(viewer.memberId);
    return privateJson({ enabled: true, phase: 2, ...result }, { headers: phaseTwoHeaders() });
  } catch { return safeServerError("关注列表暂时无法读取，请稍后再试"); }
}

async function mutate(request: Request, following: boolean) {
  try {
    if (!hasTrustedOrigin(request)) return privateJson({ error: "请求来源无效" }, { status: 403, headers: phaseTwoHeaders() });
    const viewer = await getPreviewMemberIdentity();
    if (!viewer) return privateJson({ error: "请先登录会员账户" }, { status: 401, headers: phaseTwoHeaders() });
    if (!await allowRequestForIdentity("community-follow", String(viewer.memberId), 60, 60 * 60)) return rateLimitResponse();
    const payload = await request.json() as Record<string, unknown>;
    const publicId = String(payload.publicId ?? "").trim().toUpperCase();
    if (!/^MBR-[A-Z0-9]{12}$/.test(publicId)) return privateJson({ error: "会员主页标识无效" }, { status: 400, headers: phaseTwoHeaders() });
    const result = following
      ? await followCommunityMember({ memberId: viewer.memberId, displayName: viewer.displayName, publicId })
      : await unfollowCommunityMember(viewer.memberId, publicId);
    return privateJson({ ok: true, enabled: true, phase: 2, ...result }, { headers: phaseTwoHeaders() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/^(要关注的会员不存在|不能关注自己)/.test(message)) return privateJson({ error: message }, { status: 400, headers: phaseTwoHeaders() });
    if (error instanceof SyntaxError) return privateJson({ error: "请求内容不是有效的 JSON" }, { status: 400, headers: phaseTwoHeaders() });
    return safeServerError("关注操作失败，请稍后再试");
  }
}

export async function POST(request: Request) { return mutate(request, true); }
export async function DELETE(request: Request) { return mutate(request, false); }
