import { getStoreDb } from "../../../../db/store";
import { createMemberSession } from "../../../../lib/preview-member-auth";
import { sha256 } from "../../../../lib/payments/crypto";
import { emailConfigured, sendEmail } from "../../../../lib/notifications/email";
import { sendSms, smsConfigured } from "../../../../lib/notifications/sms";
import type { NotificationSetting } from "../../../../lib/notifications/types";
import { allowRequest, hasTrustedOrigin, rateLimitResponse, safeServerError } from "../../../../lib/request-security";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const phonePattern = /^1[3-9]\d{9}$/;
const invalidCode = () => Response.json({ error: "验证码无效或已过期，请重新获取" }, { status: 400 });
type AuthMember = { id: number; name: string; email: string; status: string };

function normalizedPhone(value: unknown) { return String(value ?? "").replace(/\s|-/g, ""); }
function randomCode() { const values = new Uint32Array(1); crypto.getRandomValues(values); return String(100000 + (values[0] % 900000)); }

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
    const member = await db.prepare("SELECT email, phone, status FROM members WHERE lower(email) = ? OR phone = ? LIMIT 1").bind(identifier, phone).first<{ email: string; phone: string; status: string }>();
    target = member && member.status !== "blocked" ? (emailPattern.test(identifier) ? member.email.toLowerCase() : member.phone) : "";
    if (!target) return Response.json({ ok: true, challengeId: crypto.randomUUID(), message: "如账户存在，验证码将发送至注册联系方式" });
  } else {
    const email = String(payload.email ?? "").trim().toLowerCase();
    const phone = normalizedPhone(payload.phone);
    if (!emailPattern.test(email) || !phonePattern.test(phone)) return Response.json({ error: "请填写有效的邮箱和中国大陆手机号" }, { status: 400 });
    const existing = await db.prepare("SELECT id FROM members WHERE lower(email) = ? OR phone = ? LIMIT 1").bind(email, phone).first();
    if (existing) return Response.json({ error: "该邮箱或手机号已经注册，请直接登录" }, { status: 409 });
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
  await db.prepare("UPDATE member_verification_codes SET consumed_at = CURRENT_TIMESTAMP WHERE id = ? AND consumed_at IS NULL").bind(id).requireChanges("验证码已经使用").run();

  let member: AuthMember | null = null;
  if (mode === "register") {
    const name = String(payload.name ?? "").trim().slice(0, 50);
    const email = String(payload.email ?? "").trim().toLowerCase();
    const phone = normalizedPhone(payload.phone);
    const consent = payload.consent === "on";
    if (name.length < 2 || !emailPattern.test(email) || !phonePattern.test(phone) || !consent || email !== challenge.target) return Response.json({ error: "注册资料无效，请重新获取验证码" }, { status: 400 });
    await db.prepare("INSERT INTO members (name, email, phone) VALUES (?, ?, ?)").bind(name, email, phone).run();
    member = await db.prepare("SELECT id, name, email, status FROM members WHERE email = ? LIMIT 1").bind(email).first<AuthMember>();
  } else {
    member = await db.prepare("SELECT id, name, email, status FROM members WHERE lower(email) = ? OR phone = ? LIMIT 1").bind(challenge.target, challenge.target).first<AuthMember>();
  }
  if (!member || member.status === "blocked") return Response.json({ error: "账户不可用" }, { status: 403 });
  return Response.json({ ok: true, message: mode === "register" ? "注册成功，正在进入会员中心" : `欢迎回来，${member.name}` }, { headers: { "set-cookie": await createMemberSession(member.id), "cache-control": "no-store" } });
}

export async function POST(request: Request) {
  try {
    if (!hasTrustedOrigin(request)) return Response.json({ error: "请求来源无效" }, { status: 403 });
    if (!await allowRequest(request, "member-auth", 10, 10 * 60)) return rateLimitResponse();
    const payload = await request.json() as Record<string, unknown>;
    return String(payload.action ?? "") === "request-code" ? requestCode(payload) : verify(payload);
  } catch {
    return safeServerError("会员操作失败，请稍后再试");
  }
}
