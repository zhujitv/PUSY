import { phaseTwoHeaders } from "../../../../lib/community/contracts";
import { listCommunityTopics } from "../../../../lib/community/social";
import { setCommunityTopicFollow } from "../../../../lib/community/topics";
import { getPreviewMemberIdentity } from "../../../../lib/preview-member-auth";
import { allowRequestForIdentity, hasTrustedOrigin, privateJson, rateLimitResponse, safeServerError } from "../../../../lib/request-security";

export async function GET() {
  try {
    const viewer = await getPreviewMemberIdentity();
    return privateJson({ enabled: true, phase: 6, topics: await listCommunityTopics(viewer?.memberId) }, { headers: phaseTwoHeaders() });
  } catch { return safeServerError("社区话题暂时无法读取，请稍后再试"); }
}

async function mutate(request: Request, enabled: boolean) {
  try {
    if (!hasTrustedOrigin(request)) return privateJson({ error: "请求来源无效" }, { status: 403, headers: phaseTwoHeaders() });
    const viewer = await getPreviewMemberIdentity();
    if (!viewer) return privateJson({ error: "请先登录会员账户" }, { status: 401, headers: phaseTwoHeaders() });
    if (!await allowRequestForIdentity("community-topic-follow", String(viewer.memberId), 60, 60 * 60)) return rateLimitResponse();
    const payload = await request.json() as Record<string, unknown>;
    const slug = String(payload.slug ?? "").trim().toLowerCase();
    if (!/^[a-z0-9-]{2,40}$/.test(slug)) return privateJson({ error: "社区话题标识无效" }, { status: 400, headers: phaseTwoHeaders() });
    return privateJson({ ok: true, phase: 6, ...await setCommunityTopicFollow({ memberId: viewer.memberId, slug, enabled }) }, { headers: phaseTwoHeaders() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/^社区话题不存在/.test(message)) return privateJson({ error: message }, { status: 400, headers: phaseTwoHeaders() });
    if (error instanceof SyntaxError) return privateJson({ error: "请求内容不是有效的 JSON" }, { status: 400, headers: phaseTwoHeaders() });
    return safeServerError("话题关注操作失败，请稍后再试");
  }
}

export async function POST(request: Request) { return mutate(request, true); }
export async function DELETE(request: Request) { return mutate(request, false); }
