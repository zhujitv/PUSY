import { adminSessionCookie, verifyAdminCredentials } from "../../../../lib/admin-auth";
import { completeAdminAudit, recordAdminAudit } from "../../../../lib/admin-governance";
import { allowRequest, allowRequestForIdentity, hasTrustedOrigin, privateJson, rateLimitResponse } from "../../../../lib/request-security";

function browserFormRequest(request: Request) {
  return request.headers.get("content-type")?.includes("application/x-www-form-urlencoded") ?? false;
}

function loginRedirect(request: Request, error = "", sessionCookie = "") {
  const target = new URL(error ? `/admin/login?error=${encodeURIComponent(error)}` : "/admin", request.url);
  const responseHeaders = new Headers({ location: target.toString(), "cache-control": "private, no-store" });
  if (sessionCookie) responseHeaders.set("set-cookie", sessionCookie);
  return new Response(null, { status: 303, headers: responseHeaders });
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return privateJson({ error: "请求来源无效" }, { status: 403 });
  const isBrowserForm = browserFormRequest(request);
  const payload = isBrowserForm
    ? Object.fromEntries(await request.formData()) as { email?: string; password?: string }
    : await request.json().catch(() => ({})) as { email?: string; password?: string };
  const submittedEmail = String(payload.email ?? "").trim().toLowerCase();
  const legacyEmail = (process.env.ADMIN_EMAIL || "admin@pusy.cn").trim().toLowerCase();
  const accountKey = !submittedEmail || submittedEmail === legacyEmail ? "legacy-owner" : submittedEmail;
  const [ipAllowed, accountAllowed] = await Promise.all([
    allowRequest(request, "admin-login", 5, 15 * 60),
    allowRequestForIdentity("admin-login-account", accountKey, 8, 30 * 60),
  ]);
  if (!ipAllowed || !accountAllowed) return isBrowserForm ? loginRedirect(request, "rate-limited") : rateLimitResponse();
  const identity = await verifyAdminCredentials(String(payload.email ?? ""), String(payload.password ?? ""));
  if (!identity) return isBrowserForm ? loginRedirect(request, "invalid") : privateJson({ error: "账号或密码不正确" }, { status: 401 });
  const auditId = await recordAdminAudit({ request, actor: identity, action: "admin-login", entityId: identity.id, summary: "登录管理后台" });
  await completeAdminAudit(auditId, "succeeded");
  const sessionCookie = await adminSessionCookie(identity);
  return isBrowserForm ? loginRedirect(request, "", sessionCookie) : privateJson({ ok: true }, { headers: { "set-cookie": sessionCookie } });
}
