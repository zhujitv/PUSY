import { phaseThreeHeaders } from "../../../../lib/community/contracts";
import { createCommunityReport } from "../../../../lib/community/engagement";
import { getPreviewMemberIdentity } from "../../../../lib/preview-member-auth";
import { allowRequest, allowRequestForIdentity, hasTrustedOrigin, privateJson, rateLimitResponse, safeServerError } from "../../../../lib/request-security";

export async function POST(request: Request) {
  try {
    if (!hasTrustedOrigin(request)) return privateJson({ error: "请求来源无效" }, { status: 403, headers: phaseThreeHeaders() });
    if (!await allowRequest(request, "community-report", 12, 24 * 60 * 60)) return rateLimitResponse();
    const viewer = await getPreviewMemberIdentity();
    if (!viewer) return privateJson({ error: "请先登录会员账户" }, { status: 401, headers: phaseThreeHeaders() });
    if (!await allowRequestForIdentity("community-report-member", String(viewer.memberId), 12, 24 * 60 * 60)) return rateLimitResponse();
    const payload = await request.json() as Record<string, unknown>;
    const entityType = String(payload.entityType ?? "") as "post" | "comment";
    const entityId = String(payload.entityId ?? "").trim().toUpperCase();
    if (!(["post", "comment"] as string[]).includes(entityType)) return privateJson({ error: "举报对象无效" }, { status: 400, headers: phaseThreeHeaders() });
    const expected = entityType === "post" ? /^PST-[A-Z0-9]{12}$/ : /^CMT-[A-Z0-9]{12}$/;
    if (!expected.test(entityId)) return privateJson({ error: "举报对象标识无效" }, { status: 400, headers: phaseThreeHeaders() });
    const result = await createCommunityReport({
      memberId: viewer.memberId,
      entityType,
      entityId,
      reason: String(payload.reason ?? ""),
      detail: String(payload.detail ?? ""),
    });
    return privateJson({ ok: true, phase: 3, ...result, message: "举报已提交，内容管理员会尽快核查" }, { status: 201, headers: phaseThreeHeaders() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/^(请选择有效|选择其他原因|要举报的|不能举报|你已经举报)/.test(message)) return privateJson({ error: message }, { status: 400, headers: phaseThreeHeaders() });
    if (error instanceof SyntaxError) return privateJson({ error: "请求内容不是有效的 JSON" }, { status: 400, headers: phaseThreeHeaders() });
    return safeServerError("举报提交失败，请稍后再试");
  }
}
