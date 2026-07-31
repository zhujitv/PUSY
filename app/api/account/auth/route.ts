import { getStoreDb } from "../../../../db/store";
import { createMemberSession, getPreviewMemberIdentity } from "../../../../lib/preview-member-auth";
import { sha256 } from "../../../../lib/payments/crypto";
import { emailConfigured, sendEmail } from "../../../../lib/notifications/email";
import { sendSms, smsConfigured } from "../../../../lib/notifications/sms";
import type { NotificationSetting } from "../../../../lib/notifications/types";
import { allowRequest, allowRequestForIdentity, hasTrustedOrigin, privateJson, rateLimitResponse, safeServerError } from "../../../../lib/request-security";
import { registerReferral } from "../../../../lib/growth/member-program";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^1[3-9]\d{9}$/;
const invalidCode = () => Response.json({ error: "验证码无效或已过期，请重新获取" }, { status: 400 });
type AuthMember = { id: number; name: string; email: string; status: string };

function normalizedPhone(value: unknown) { return String(value ?? "").replace(/\s|-/g, ""); }
function randomCode() { const values = new Uint32Array(1); crypto.getRandomValues(values); return String(100000 + (values[0] % 900000)); }

async function codeTargetAllowed(target: string) {
  const [shortWindow, dailyWindow] = await Promise.all([
    allowRequestForIdentity("member-code-target-10m", target, 3, 10 * 60),
    allowRequestForIdentity("member-code-target-day", target, 10, 24 * 60 * 60),
  ]);
  return shortWindow && dailyWindow;
}

async function deliverCode(target: string, code: string) {
  const db = await getStoreDb();
  const channel = emailPattern.test(target) ? "email" : "sms";
  const setting = await db.prepare("SELECT * FROM notification_settings WHERE channel = ? LIMIT 1").bind(channel).first<NotificationSetting>();
  if (!setting) throw new Error("验证码通知渠道尚未配置");
  if (channel === "email") {
    if (!emailConfigured(setting)) throw new Error("邮件验证码渠道尚未启用");
    await sendEmail(setting, { to: target, subject: "PUSY.CN 会员验证码", html: `<p>你的 PUSY.CN 验证码是：</p><p style="font-size:30px;font-weight:700;letter-spacing:6px">${code}</p><p>验证码 10 分钟内有效，请勿转发给他人。</p>`, idempotencyKey: `AUTH-${crypto.randomUUID()}` });
  } else {
    if (!smsConfigured(setting)) throw new Error("短信验证码渠道尚未启用");
    await sendSms(setting, { to: target, message: `PUSY.CN 验证码：${code}，10分钟内有效，请勿转发。`, idempotencyKey: `AUTH-${crypto.randomUUID()}` });
  }
}

async function requestCode(payload: Record<string, unknown>) {
  const mode = String(payload.mode ?? "");
  if (!(["login", "register"] as string[]).includes(mode)) return Response.json({ error: "会员操作无效" }, { status: 400 });
  const db = await getStoreDb();
  let target = "";
  if (mode === "login") {
    const identifier = String(payload.identifier ?? "").trim().toLowerCase();
    if (!identifier) return Response.json({ error: "请输入手机号或邮箱" }, { status: 400 });
    const phone = normalizedPhone(identifier);
    const targetKey = emailPattern.test(identifier) ? identifier : phone;
    if (!emailPattern.test(identifier) && !phonePattern.test(phone)) return Response.json({ error: "请输入有效的手机号或邮箱" }, { status: 400 });
    if (!await codeTargetAllowed(targetKey)) return rateLimitResponse();
    const member = await db.prepare("SELECT email, phone, status FROM members WHERE (lower(email) = ? AND email_verified = 1) OR (regexp_replace(phone, '[[:space:]-]', '', 'g') = ? AND phone_verified = 1) LIMIT 1").bind(identifier, phone).first<{ email: string; phone: string; status: string }>();
    target = member && member.status !== "blocked" ? (emailPattern.test(identifier) ? member.email.toLowerCase() : member.phone) : "";
    if (!target) return Response.json({ ok: true, challengeId: crypto.randomUUID(), message: "如账户存在，验证码将发送至注册联系方式" });
  } else {
    const email = String(payload.email ?? "").trim().toLowerCase();
    const phone = normalizedPhone(payload.phone);
    if (!emailPattern.test(email) || !phonePattern.test(phone)) return Response.json({ error: "请填写有效的邮箱和中国大陆手机号" }, { status: 400 });
    if (!await codeTargetAllowed(email)) return rateLimitResponse();
    const existingEmail = await db.prepare("SELECT id, email_verified FROM members WHERE lower(email) = ? LIMIT 1").bind(email).first<{ id: number; email_verified: number }>();
    const existingPhone = await db.prepare("SELECT id FROM members WHERE regexp_replace(phone, '[[:space:]-]', '', 'g') = ? LIMIT 1").bind(phone).first<{ id: number }>();
    if (existingEmail?.email_verified || (existingPhone && existingPhone.id !== existingEmail?.id)) return Response.json({ ok: true, challengeId: crypto.randomUUID(), message: "如资料可用于注册，验证码将发送至邮箱" });
    target = email;
  }

  const id = crypto.randomUUID();
  const code = randomCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await db.prepare("UPDATE member_verification_codes SET consumed_at = CURRENT_TIMESTAMP WHERE target = ? AND purpose = ? AND consumed_at IS NULL").bind(target, mode).run();
  await db.prepare("INSERT INTO member_verification_codes (id, target, purpose, code_hash, expires_at) VALUES (?, ?, ?, ?, ?)").bind(id, target, mode, await sha256(`${id}:${code}`), expiresAt).run();
  try { await deliverCode(target, code); }
  catch { await db.prepare("DELETE FROM member_verification_codes WHERE id = ?").bind(id).run(); return safeServerError("验证码暂时无法发送，请稍后再试", 503); }
  return Response.json({ ok: true, challengeId: id, message: mode === "login" ? "如账户存在，验证码将发送至注册联系方式" : `验证码已发送至${emailPattern.test(target) ? "邮箱" : "手机"}` });
}

async function verify(payload: Record<string, unknown>) {
  const mode = String(payload.action ?? "");
  const id = String(payload.challengeId ?? "");
  const code = String(payload.code ?? "").trim();
  if (!id || !/^\d{6}$/.test(code) || !(["login", "register"] as string[]).includes(mode)) return invalidCode();
  const db = await getStoreDb();
  const challenge = await db.prepare("SELECT * FROM member_verification_codes WHERE id = ? AND purpose = ? LIMIT 1").bind(id, mode).first<{ target: string; code_hash: string; attempts: number; expires_at: string; consumed_at: string | null }>();
  if (!challenge || challenge.consumed_at || challenge.attempts >= 5 || new Date(challenge.expires_at).getTime() <= Date.now()) return invalidCode();
  if (challenge.code_hash !== await sha256(`${id}:${code}`)) {
    await db.prepare("UPDATE member_verification_codes SET attempts = attempts + 1 WHERE id = ? AND consumed_at IS NULL").bind(id).run();
    return invalidCode();
  }
  let member: AuthMember | null = null;
  if (mode === "register") {
    const name = String(payload.name ?? "").trim().slice(0, 50);
    const email = String(payload.email ?? "").trim().toLowerCase();
    const phone = normalizedPhone(payload.phone);
    const consent = payload.consent === "on";
    if (name.length < 2 || !emailPattern.test(email) || !phonePattern.test(phone) || !consent || email !== challenge.target) return Response.json({ error: "注册资料无效，请重新获取验证码" }, { status: 400 });
    await db.prepare("UPDATE member_verification_codes SET consumed_at = CURRENT_TIMESTAMP WHERE id = ? AND consumed_at IS NULL").bind(id).requireChanges("验证码已经使用").run();
    await db.prepare("INSERT INTO members (name, email, phone, email_verified, phone_verified) VALUES (?, ?, ?, 1, 0) ON CONFLICT(email) DO UPDATE SET name = excluded.name, phone = excluded.phone, email_verified = 1, phone_verified = 0, updated_at = CURRENT_TIMESTAMP").bind(name, email, phone).run();
    member = await db.prepare("SELECT id, name, email, status FROM members WHERE email = ? LIMIT 1").bind(email).first<AuthMember>();
    if (member) await registerReferral(member.id, String(payload.referralCode ?? "")).catch(() => undefined);
  } else {
    await db.prepare("UPDATE member_verification_codes SET consumed_at = CURRENT_TIMESTAMP WHERE id = ? AND consumed_at IS NULL").bind(id).requireChanges("验证码已经使用").run();
    member = await db.prepare("SELECT id, name, email, status FROM members WHERE lower(email) = ? OR phone = ? LIMIT 1").bind(challenge.target, challenge.target).first<AuthMember>();
  }
  if (!member || member.status === "blocked") return Response.json({ error: "账户不可用" }, { status: 403 });
  return Response.json({ ok: true, message: mode === "register" ? "注册成功，正在进入会员中心" : `欢迎回来，${member.name}` }, { headers: { "set-cookie": await createMemberSession(member.id), "cache-control": "no-store" } });
}

async function requestPhoneCode(payload: Record<string, unknown>) {
  const viewer = await getPreviewMemberIdentity();
  if (!viewer) return Response.json({ error: "请先登录会员账户" }, { status: 401 });
  const phone = normalizedPhone(payload.phone);
  if (!phonePattern.test(phone)) return Response.json({ error: "请输入有效的中国大陆手机号码" }, { status: 400 });
  const db = await getStoreDb();
  const duplicate = await db.prepare("SELECT id FROM members WHERE regexp_replace(phone, '[[:space:]-]', '', 'g') = ? AND id != ? LIMIT 1").bind(phone, viewer.memberId).first();
  if (duplicate) return Response.json({ error: "该手机号码已关联其他会员账户" }, { status: 409 });
  if (!await codeTargetAllowed(phone)) return rateLimitResponse();
  const id = crypto.randomUUID();
  const code = randomCode();
  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  await db.prepare("UPDATE member_verification_codes SET consumed_at = CURRENT_TIMESTAMP WHERE target = ? AND purpose = 'verify-phone' AND consumed_at IS NULL").bind(phone).run();
  await db.prepare("INSERT INTO member_verification_codes (id, target, purpose, code_hash, expires_at) VALUES (?, ?, 'verify-phone', ?, ?)").bind(id, phone, await sha256(`${id}:${code}`), expiresAt).run();
  try { await deliverCode(phone, code); }
  catch { await db.prepare("DELETE FROM member_verification_codes WHERE id = ?").bind(id).run(); return safeServerError("短信验证码暂时无法发送，请稍后再试", 503); }
  return Response.json({ ok: true, challengeId: id, message: "验证码已发送至新手机号" });
}

async function verifyPhone(payload: Record<string, unknown>) {
  const viewer = await getPreviewMemberIdentity();
  if (!viewer) return Response.json({ error: "请先登录会员账户" }, { status: 401 });
  const id = String(payload.challengeId ?? "");
  const code = String(payload.code ?? "").trim();
  const phone = normalizedPhone(payload.phone);
  if (!id || !/^\d{6}$/.test(code) || !phonePattern.test(phone)) return invalidCode();
  const db = await getStoreDb();
  const challenge = await db.prepare("SELECT target, code_hash, attempts, expires_at, consumed_at FROM member_verification_codes WHERE id = ? AND purpose = 'verify-phone' LIMIT 1").bind(id).first<{ target: string; code_hash: string; attempts: number; expires_at: string; consumed_at: string | null }>();
  if (!challenge || challenge.target !== phone || challenge.consumed_at || challenge.attempts >= 5 || new Date(challenge.expires_at).getTime() <= Date.now()) return invalidCode();
  if (challenge.code_hash !== await sha256(`${id}:${code}`)) {
    await db.prepare("UPDATE member_verification_codes SET attempts = attempts + 1 WHERE id = ? AND consumed_at IS NULL").bind(id).run();
    return invalidCode();
  }
  await db.batch([
    db.prepare("UPDATE member_verification_codes SET consumed_at = CURRENT_TIMESTAMP WHERE id = ? AND consumed_at IS NULL").bind(id).requireChanges("验证码已经使用"),
    db.prepare("UPDATE members SET phone = ?, phone_verified = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(phone, viewer.memberId),
  ]);
  return Response.json({ ok: true, message: "手机号已验证，可用于登录" });
}

export async function POST(request: Request) {
  try {
    if (!hasTrustedOrigin(request)) return privateJson({ error: "请求来源无效" }, { status: 403 });
    if (!await allowRequest(request, "member-auth", 10, 10 * 60)) return rateLimitResponse();
    const payload = await request.json() as Record<string, unknown>;
    const action = String(payload.action ?? "");
    const response = action === "request-code" ? await requestCode(payload)
      : action === "request-phone-code" ? await requestPhoneCode(payload)
        : action === "verify-phone" ? await verifyPhone(payload)
          : await verify(payload);
    response.headers.set("cache-control", "private, no-store");
    return response;
  } catch (error) {
    const conflict = error instanceof Error && /unique/i.test(error.message);
    return safeServerError(conflict ? "该邮箱或手机号已经注册" : "会员操作失败，请稍后再试", conflict ? 409 : 500);
  }
}
