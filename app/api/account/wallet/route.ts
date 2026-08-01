import { getStoreDb } from "../../../../db/store";
import { sendVerificationEmail } from "../../../../lib/notifications/verification-email";
import { sha256 } from "../../../../lib/payments/crypto";
import { getPreviewMemberIdentity, revokeOtherMemberSessions } from "../../../../lib/preview-member-auth";
import { allowRequest, allowRequestForIdentity, hasTrustedOrigin, privateJson, rateLimitResponse, safeServerError } from "../../../../lib/request-security";
import { setMemberLoginPassword, setMemberPaymentPassword } from "../../../../lib/wallet/security";
import { getMemberWallet } from "../../../../lib/wallet/service";

type SecurityPurpose = "account-password" | "payment-password";

function randomCode() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return String(100000 + values[0] % 900000);
}

async function requestSecurityCode(memberId: number, email: string, purpose: SecurityPurpose) {
  if (!await allowRequestForIdentity("wallet-security-code", `${memberId}:${purpose}`, 3, 10 * 60)) return rateLimitResponse();
  const db = await getStoreDb();
  const id = crypto.randomUUID();
  const code = randomCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await db.prepare("UPDATE member_verification_codes SET consumed_at = CURRENT_TIMESTAMP WHERE target = ? AND purpose = ? AND consumed_at IS NULL").bind(email, purpose).run();
  await db.prepare("INSERT INTO member_verification_codes (id, target, purpose, code_hash, expires_at) VALUES (?, ?, ?, ?, ?)").bind(id, email, purpose, await sha256(`${id}:${code}`), expiresAt).run();
  try {
    await sendVerificationEmail({ to: email, code, subject: "PUSY.CN 财务安全验证码", intro: purpose === "payment-password" ? "你正在设置或修改支付密码，验证码是：" : "你正在设置或修改账户密码，验证码是：", idempotencyKey: `WALLET-${id}` });
  } catch {
    await db.prepare("DELETE FROM member_verification_codes WHERE id = ?").bind(id).run();
    throw new Error("安全验证码暂时无法发送，请稍后再试");
  }
  return privateJson({ ok: true, challengeId: id, message: "安全验证码已发送至注册邮箱" });
}

async function consumeSecurityCode(email: string, purpose: SecurityPurpose, challengeId: string, code: string) {
  if (!challengeId || !/^\d{6}$/.test(code)) throw new Error("安全验证码无效或已过期");
  const db = await getStoreDb();
  const challenge = await db.prepare("SELECT target, code_hash, attempts, expires_at, consumed_at FROM member_verification_codes WHERE id = ? AND purpose = ? LIMIT 1")
    .bind(challengeId, purpose).first<{ target: string; code_hash: string; attempts: number; expires_at: string; consumed_at: string | null }>();
  if (!challenge || challenge.target !== email || challenge.consumed_at || challenge.attempts >= 5 || new Date(challenge.expires_at).getTime() <= Date.now()) throw new Error("安全验证码无效或已过期");
  if (challenge.code_hash !== await sha256(`${challengeId}:${code}`)) {
    await db.prepare("UPDATE member_verification_codes SET attempts = attempts + 1 WHERE id = ? AND consumed_at IS NULL").bind(challengeId).run();
    throw new Error("安全验证码无效或已过期");
  }
  await db.prepare("UPDATE member_verification_codes SET consumed_at = CURRENT_TIMESTAMP WHERE id = ? AND consumed_at IS NULL").bind(challengeId).requireChanges("安全验证码已经使用").run();
}

export async function GET() {
  const viewer = await getPreviewMemberIdentity();
  if (!viewer) return privateJson({ error: "请先登录会员账户" }, { status: 401 });
  try { return privateJson(await getMemberWallet(viewer.memberId)); }
  catch { return safeServerError("财务中心暂时无法加载"); }
}

export async function POST(request: Request) {
  if (!hasTrustedOrigin(request)) return privateJson({ error: "请求来源无效" }, { status: 403 });
  if (!await allowRequest(request, "wallet-security", 12, 10 * 60)) return rateLimitResponse();
  const viewer = await getPreviewMemberIdentity();
  if (!viewer) return privateJson({ error: "请先登录会员账户" }, { status: 401 });
  try {
    const payload = await request.json() as Record<string, unknown>;
    const action = String(payload.action ?? "");
    const purpose: SecurityPurpose = action.includes("payment") ? "payment-password" : "account-password";
    if (action === "request-account-code" || action === "request-payment-code") return requestSecurityCode(viewer.memberId, viewer.email, purpose);
    if (action !== "set-account-password" && action !== "set-payment-password") return privateJson({ error: "财务安全操作无效" }, { status: 400 });
    await consumeSecurityCode(viewer.email, purpose, String(payload.challengeId ?? ""), String(payload.code ?? ""));
    const input = { memberId: viewer.memberId, currentPassword: String(payload.currentPassword ?? ""), newPassword: String(payload.newPassword ?? "") };
    if (action === "set-account-password") {
      await setMemberLoginPassword(input);
      await revokeOtherMemberSessions(viewer.memberId);
    } else await setMemberPaymentPassword(input);
    return privateJson({ ok: true, message: purpose === "payment-password" ? "支付密码已更新" : "账户密码已更新" });
  } catch (error) {
    const message = error instanceof Error ? error.message : "财务安全操作失败";
    const safe = /密码|验证码|余额/.test(message) ? message : "财务安全操作失败，请稍后再试";
    return privateJson({ error: safe }, { status: /不正确|无效|相同|需为/.test(message) ? 400 : 500 });
  }
}
