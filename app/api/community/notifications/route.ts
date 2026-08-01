import { phaseTwoHeaders } from "../../../../lib/community/contracts";
import { getCommunitySocialSummary, listCommunityNotifications, markCommunityNotificationsRead } from "../../../../lib/community/social";
import { getPreviewMemberIdentity } from "../../../../lib/preview-member-auth";
import { updateCommunityNotificationPreferences } from "../../../../lib/community/activity";
import { hasTrustedOrigin, privateJson, safeServerError } from "../../../../lib/request-security";

export async function GET() {
  try {
    const viewer = await getPreviewMemberIdentity();
    if (!viewer) return privateJson({ error: "请先登录会员账户" }, { status: 401, headers: phaseTwoHeaders() });
    const [notifications, summary] = await Promise.all([
      listCommunityNotifications(viewer.memberId),
      getCommunitySocialSummary(viewer.memberId),
    ]);
    return privateJson({ enabled: true, phase: 2, unreadCount: summary.unreadCount, notifications }, { headers: phaseTwoHeaders() });
  } catch { return safeServerError("站内通知暂时无法读取，请稍后再试"); }
}

export async function PATCH(request: Request) {
  try {
    if (!hasTrustedOrigin(request)) return privateJson({ error: "请求来源无效" }, { status: 403, headers: phaseTwoHeaders() });
    const viewer = await getPreviewMemberIdentity();
    if (!viewer) return privateJson({ error: "请先登录会员账户" }, { status: 401, headers: phaseTwoHeaders() });
    const payload = await request.json() as Record<string, unknown>;
    if (payload.preferences && typeof payload.preferences === "object") {
      const preferences = payload.preferences as Record<string, unknown>;
      const result = await updateCommunityNotificationPreferences(viewer.memberId, { reactions: preferences.reactions !== false, social: preferences.social !== false, campaigns: preferences.campaigns !== false });
      return privateJson({ ok: true, preferences: result }, { headers: phaseTwoHeaders() });
    }
    const id = payload.id ? String(payload.id).trim().toUpperCase() : undefined;
    if (id && !/^NTF-[A-Z0-9]{12}$/.test(id)) return privateJson({ error: "通知标识无效" }, { status: 400, headers: phaseTwoHeaders() });
    const updated = await markCommunityNotificationsRead(viewer.memberId, id);
    return privateJson({ ok: true, updated }, { headers: phaseTwoHeaders() });
  } catch (error) {
    if (error instanceof SyntaxError) return privateJson({ error: "请求内容不是有效的 JSON" }, { status: 400, headers: phaseTwoHeaders() });
    return safeServerError("通知状态更新失败，请稍后再试");
  }
}
