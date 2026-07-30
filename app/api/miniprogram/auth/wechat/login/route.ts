import { getStoreDb } from "../../../../../../db/store";
import { issueMemberSession } from "../../../../../../lib/preview-member-auth";
import { sha256 } from "../../../../../../lib/payments/crypto";
import { allowRequest, rateLimitResponse, safeServerError } from "../../../../../../lib/request-security";

type WechatSessionResponse = { openid?: string; unionid?: string; session_key?: string; errcode?: number; errmsg?: string };

function configured() {
  return Boolean(process.env.WECHAT_MINIPROGRAM_APP_ID && process.env.WECHAT_MINIPROGRAM_APP_SECRET);
}

async function code2Session(code: string) {
  const query = new URLSearchParams({
    appid: process.env.WECHAT_MINIPROGRAM_APP_ID ?? "",
    secret: process.env.WECHAT_MINIPROGRAM_APP_SECRET ?? "",
    js_code: code,
    grant_type: "authorization_code",
  });
  const response = await fetch(`https://api.weixin.qq.com/sns/jscode2session?${query}`, { cache: "no-store", signal: AbortSignal.timeout(8000) });
  if (!response.ok) throw new Error("微信登录服务暂时不可用");
  const result = await response.json() as WechatSessionResponse;
  if (result.errcode || !result.openid) throw new Error("微信登录凭证无效或已经过期");
  return result;
}

export async function POST(request: Request) {
  try {
    if (!configured()) return Response.json({ error: "微信小程序尚未完成认证配置", code: "MINIPROGRAM_NOT_CONFIGURED" }, { status: 503 });
    if (!await allowRequest(request, "miniprogram-wechat-login", 15, 10 * 60)) return rateLimitResponse();
    const payload = await request.json() as Record<string, unknown>;
    const code = String(payload.code ?? "").trim();
    const displayName = String(payload.displayName ?? "微信会员").trim().slice(0, 50) || "微信会员";
    if (!/^[A-Za-z0-9_-]{6,256}$/.test(code)) return Response.json({ error: "微信登录凭证格式无效" }, { status: 400 });

    const session = await code2Session(code);
    const appId = process.env.WECHAT_MINIPROGRAM_APP_ID ?? "";
    const db = await getStoreDb();
    let identity = await db.prepare("SELECT member_id FROM member_wechat_identities WHERE app_id = ? AND openid = ? LIMIT 1").bind(appId, session.openid).first<{ member_id: number }>();
    if (!identity) {
      const key = await sha256(`${appId}:${session.openid}`);
      const placeholderEmail = `wechat-${key.slice(0, 24)}@members.pusy.cn`;
      await db.batch([
        db.prepare("INSERT INTO members (name, email, phone, email_verified, phone_verified) VALUES (?, ?, '', 0, 0) ON CONFLICT(email) DO NOTHING").bind(displayName, placeholderEmail),
        db.prepare("INSERT INTO member_wechat_identities (member_id, app_id, openid, unionid) SELECT id, ?, ?, ? FROM members WHERE email = ? ON CONFLICT(app_id, openid) DO NOTHING").bind(appId, session.openid, session.unionid ?? "", placeholderEmail),
      ]);
      identity = await db.prepare("SELECT member_id FROM member_wechat_identities WHERE app_id = ? AND openid = ? LIMIT 1").bind(appId, session.openid).first<{ member_id: number }>();
    } else {
      await db.prepare("UPDATE member_wechat_identities SET unionid = CASE WHEN ? != '' THEN ? ELSE unionid END, last_login_at = CURRENT_TIMESTAMP WHERE app_id = ? AND openid = ?").bind(session.unionid ?? "", session.unionid ?? "", appId, session.openid).run();
    }
    if (!identity) throw new Error("无法建立微信会员身份");
    const member = await db.prepare("SELECT id, name, tier, points_balance, status FROM members WHERE id = ? LIMIT 1").bind(identity.member_id).first<{ id: number; name: string; tier: string; points_balance: number; status: string }>();
    if (!member || member.status === "blocked") return Response.json({ error: "该会员账户不可用" }, { status: 403 });
    const issued = await issueMemberSession(member.id);
    return Response.json({ token: issued.token, expiresAt: issued.expiresAt, member: { id: member.id, name: member.name, tier: member.tier, pointsBalance: member.points_balance }, needsProfile: true }, { headers: { "cache-control": "no-store" } });
  } catch (error) {
    const message = error instanceof Error && /微信登录|微信会员/.test(error.message) ? error.message : "微信登录失败，请稍后再试";
    return safeServerError(message, 503);
  }
}
