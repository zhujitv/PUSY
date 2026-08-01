import { getCommunityHabitSummary, recordCommunityActivity } from "../../../../lib/community/activity";
import { getPreviewMemberIdentity } from "../../../../lib/preview-member-auth";
import { chinaDateParts } from "../../../../lib/growth/member-program-shared";
import { allowRequestForIdentity, hasTrustedOrigin, privateJson, rateLimitResponse, safeServerError } from "../../../../lib/request-security";

export async function POST(request: Request) {
  try {
    if (!hasTrustedOrigin(request)) return privateJson({ error: "请求来源无效" }, { status: 403 });
    const viewer = await getPreviewMemberIdentity();
    if (!viewer) return privateJson({ error: "请先登录会员账户" }, { status: 401 });
    if (!await allowRequestForIdentity("community-activity", String(viewer.memberId), 60, 60 * 60)) return rateLimitResponse();
    await recordCommunityActivity({ memberId: viewer.memberId, type: "visit", eventKey: `visit:${viewer.memberId}:${chinaDateParts().key}`, entityType: "community", entityId: "home" });
    return privateJson({ ok: true, summary: await getCommunityHabitSummary(viewer.memberId) });
  } catch { return safeServerError("社区活跃状态暂时无法更新"); }
}
