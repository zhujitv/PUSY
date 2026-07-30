import { adminSessionCookie, verifyAdminCredentials } from "../../../../lib/admin-auth";
import { completeAdminAudit, recordAdminAudit } from "../../../../lib/admin-governance";
import { allowRequest, hasTrustedOrigin, rateLimitResponse } from "../../../../lib/request-security";

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return Response.json({ error: "请求来源无效" }, { status: 403 });
  if (!await allowRequest(request, "admin-login", 5, 15 * 60)) return rateLimitResponse();
  const payload = await request.json().catch(() => ({})) as { email?: string; password?: string };
  const identity = await verifyAdminCredentials(String(payload.email ?? ""), String(payload.password ?? ""));
  if (!identity) return Response.json({ error: "账号或密码不正确" }, { status: 401 });
  const auditId = await recordAdminAudit({ request, actor: identity, action: "admin-login", entityId: identity.id, summary: "登录管理后台" });
  await completeAdminAudit(auditId, "succeeded");
  return Response.json({ ok: true }, { headers: { "set-cookie": await adminSessionCookie(identity), "cache-control": "no-store" } });
}
