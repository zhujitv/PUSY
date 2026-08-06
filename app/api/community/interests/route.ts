import { getPreviewMemberIdentity } from "../../../../lib/preview-member-auth";
import { getCommunityInterestProfile, setCommunityInterestProfile } from "../../../../lib/community/personalization";
import { allowRequestForIdentity, hasTrustedOrigin, privateJson, rateLimitResponse, safeServerError } from "../../../../lib/request-security";

export async function GET() {
  const viewer = await getPreviewMemberIdentity();
  if (!viewer) return privateJson({ error: "请先登录会员账户" }, { status: 401 });
  try { return privateJson({ profile: await getCommunityInterestProfile(viewer.memberId) }); }
  catch { return safeServerError("兴趣偏好暂时无法读取，请稍后再试"); }
}

export async function PATCH(request: Request) {
  try {
    if (!hasTrustedOrigin(request)) return privateJson({ error: "请求来源无效" }, { status: 403 });
    const viewer = await getPreviewMemberIdentity();
    if (!viewer) return privateJson({ error: "请先登录会员账户" }, { status: 401 });
    if (!await allowRequestForIdentity("community-interests", String(viewer.memberId), 20, 60 * 60)) return rateLimitResponse();
    const payload = await request.json() as Record<string, unknown>;
    const profile = await setCommunityInterestProfile(viewer.memberId, payload.topicSlugs);
    return privateJson({ ok: true, profile, message: "兴趣偏好已更新，为你推荐会随互动继续优化" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/^(请至少选择|兴趣话题)/.test(message)) return privateJson({ error: message }, { status: 400 });
    return safeServerError("兴趣偏好保存失败，请稍后再试");
  }
}
