import { adminSessionCookie, verifyAdminCredentials } from "../../../../lib/admin-auth";
import { completeAdminAudit, recordAdminAudit } from "../../../../lib/admin-governance";
import { allowRequest, allowRequestForIdentity, hasTrustedOrigin, privateJson, rateLimitResponse } from "../../../../lib/request-security";

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return privateJson({ error: "请求来源无效" }, { status: 403 });
  const payload = await request.json().catch(() => ({})) as { email?: string; password?: string };
  const submittedEmail = String(payload.email ?? "").trim().toLowerCase();
  const legacyEmail = (process.env.ADMIN_EMAIL || "admin@pusy.cn").trim().toLowerCase();
  const accountKey = !submittedEmail || submittedEmail === legacyEmail ? "legacy-owner" : submittedEmail;
  const [ipAllowed, accountAllowed] = await Promise.all([
    allowRequest(request, "admin-login", 5, 15 * 60),
    allowRequestForIdentity("admin-login-account", accountKey, 8, 30 * 60),
  ]);
  if (!ipAllowed || !accountAllowed) return rateLimitResponse();
  const identity = await verifyAdminCredentials(String(payload.email ?? ""), String(payload.password ?? ""));
  if (!identity) return privateJson({ error: "账号或密码不正确" }, { status: 401 });
  const auditId = await recordAdminAudit({ request, actor: identity, action: "admin-login", entityId: identity.id, summary: "登录管理后台" });
  await completeAdminAudit(auditId, "succeeded");
  return privateJson({ ok: true }, { headers: { "set-cookie": await adminSessionCookie(identity) } });
}
