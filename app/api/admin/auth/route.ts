import { adminSessionCookie, verifyAdminPassword } from "../../../../lib/admin-auth";
import { allowRequest, hasTrustedOrigin, rateLimitResponse } from "../../../../lib/request-security";

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return Response.json({ error: "请求来源无效" }, { status: 403 });
  if (!await allowRequest(request, "admin-login", 5, 15 * 60)) return rateLimitResponse();
  const payload = await request.json().catch(() => ({})) as { password?: string };
  if (!await verifyAdminPassword(String(payload.password ?? ""))) return Response.json({ error: "密码不正确或后台尚未配置" }, { status: 401 });
  return Response.json({ ok: true }, { headers: { "set-cookie": await adminSessionCookie(), "cache-control": "no-store" } });
}
