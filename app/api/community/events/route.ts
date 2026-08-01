import { phaseFourHeaders } from "../../../../lib/community/contracts";
import { recordCommunityContentEvent, type CommunityContentEventType } from "../../../../lib/community/commerce";
import { getPreviewMemberIdentity } from "../../../../lib/preview-member-auth";
import { allowRequest, hasTrustedOrigin, privateJson, rateLimitResponse, safeServerError } from "../../../../lib/request-security";

export async function POST(request: Request) {
  try {
    if (!hasTrustedOrigin(request)) return privateJson({ error: "请求来源无效" }, { status: 403, headers: phaseFourHeaders() });
    if (!await allowRequest(request, "community-content-event", 180, 60 * 60)) return rateLimitResponse();
    const payload = await request.json() as Record<string, unknown>;
    const viewer = await getPreviewMemberIdentity();
    await recordCommunityContentEvent({
      eventKey: String(payload.eventKey ?? ""),
      eventType: String(payload.eventType ?? "") as CommunityContentEventType,
      postId: String(payload.postId ?? "").toUpperCase(),
      productSlug: String(payload.productSlug ?? ""),
      memberId: viewer?.memberId,
    });
    return privateJson({ ok: true }, { status: 201, headers: phaseFourHeaders() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (error instanceof SyntaxError) return privateJson({ error: "请求内容不是有效的 JSON" }, { status: 400, headers: phaseFourHeaders() });
    if (/^(社区统计|社区内容标识|社区统计事件类型|关联商品标识|社区内容或关联商品)/.test(message)) return privateJson({ error: message }, { status: 400, headers: phaseFourHeaders() });
    console.error("[community/events] create failed", { message });
    return safeServerError("社区效果统计暂时不可用，请稍后再试");
  }
}
