import { ensureMember } from "../../../db/member-account";
import { getStoreDb } from "../../../db/store";
import { sendVerificationEmail } from "../../../lib/notifications/verification-email";
import { getPreviewMemberIdentity } from "../../../lib/preview-member-auth";
import { sha256 } from "../../../lib/payments/crypto";
import { allowRequest, allowRequestForIdentity, privateJson, rateLimitResponse, safeServerError } from "../../../lib/request-security";
import { sevenDayNoReasonWindow } from "../../../lib/returns/eligibility";
import { isGiftCardLineSlug } from "../../../lib/shipping";
import type { ItemRow, LookupIdentity, OrderRow } from "./return-types";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const lookupCookie = "pusy-return-lookup";
const lookupPurpose = "return-order-lookup";
const accessPurpose = "return-order-access";

function normalizedEmail(value: unknown) {
  return String(value ?? "").trim().toLowerCase().slice(0, 160);
}

function randomCode() {
  const values = new Uint32Array(1);
  crypto.getRandomValues(values);
  return String(100000 + (values[0] % 900000));
}

function secureCookie() {
  return process.env.NODE_ENV === "production" ? "; Secure" : "";
}

function lookupCookieHeader(id: string, token: string) {
  return `${lookupCookie}=${encodeURIComponent(`${id}.${token}`)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=1800${secureCookie()}`;
}

function lookupCookieValue(request: Request) {
  const part = (request.headers.get("cookie") ?? "").split(";").map((value) => value.trim()).find((value) => value.startsWith(`${lookupCookie}=`));
  if (!part) return null;
  try {
    const value = decodeURIComponent(part.slice(lookupCookie.length + 1));
    const separator = value.indexOf(".");
    if (separator < 1) return null;
    return { id: value.slice(0, separator), token: value.slice(separator + 1) };
  } catch { return null; }
}

async function verifiedGuestIdentity(request: Request): Promise<LookupIdentity | null> {
  const cookie = lookupCookieValue(request);
  if (!cookie || !/^[0-9a-f-]{36}$/i.test(cookie.id) || cookie.token.length < 64) return null;
  const db = await getStoreDb();
  const access = await db.prepare("SELECT target, code_hash FROM member_verification_codes WHERE id = ? AND purpose = ? AND consumed_at IS NULL AND expires_at::timestamp > CURRENT_TIMESTAMP LIMIT 1").bind(cookie.id, accessPurpose).first<{ target: string; code_hash: string }>();
  if (!access || access.code_hash !== await sha256(`${cookie.id}:${cookie.token}`)) return null;
  return { memberId: null, email: access.target.toLowerCase(), grantId: cookie.id };
}

export async function lookupIdentity(request: Request): Promise<LookupIdentity | null> {
  const viewer = await getPreviewMemberIdentity();
  if (viewer) {
    const member = await ensureMember(viewer);
    return { memberId: member.id, email: member.email.toLowerCase(), grantId: null };
  }
  return verifiedGuestIdentity(request);
}

async function listOrders(identity: LookupIdentity) {
  const db = await getStoreDb();
  const ownership = identity.memberId ? "o.member_id = ?" : "lower(o.email) = ?";
  const owner = identity.memberId ?? identity.email;
  const orders = await db.prepare(`SELECT o.id, o.member_id, o.customer, o.email, o.phone, o.total, o.delivery, o.status, o.created_at,
    s.status AS shipment_status, s.delivered_at,
    (SELECT r.id FROM returns r WHERE r.order_id = o.id AND r.status NOT IN ('已拒绝','已关闭') ORDER BY r.created_at DESC LIMIT 1) AS existing_return_id
    FROM orders o LEFT JOIN shipments s ON s.order_id = o.id
    WHERE ${ownership} AND o.resources_committed = 1 AND o.status NOT IN ('待付款','支付失败','已取消','已退款')
    ORDER BY o.created_at DESC LIMIT 20`).bind(owner).all<OrderRow>();
  if (!orders.results.length) return [];
  const placeholders = orders.results.map(() => "?").join(",");
  const items = await db.prepare(`SELECT id, order_id, product_slug, product_name, quantity, unit_price FROM order_items WHERE order_id IN (${placeholders}) ORDER BY id`).bind(...orders.results.map((order) => order.id)).all<ItemRow>();
  return orders.results.map((order) => {
    const window = sevenDayNoReasonWindow(order.delivered_at);
    const orderItems = items.results.filter((item) => item.order_id === order.id).map((item) => ({
      id: item.id,
      productSlug: item.product_slug,
      productName: item.product_name,
      quantity: item.quantity,
      unitPrice: item.unit_price,
      returnable: !isGiftCardLineSlug(item.product_slug),
    }));
    const hasPhysicalItems = orderItems.some((item) => item.returnable);
    return {
      id: order.id,
      customer: order.customer,
      phone: order.phone,
      email: order.email,
      total: order.total,
      delivery: order.delivery,
      status: order.status,
      createdAt: order.created_at,
      shipmentStatus: order.shipment_status,
      deliveredAt: order.delivered_at,
      existingReturnId: order.existing_return_id,
      noReasonEligible: window.eligible && hasPhysicalItems && !order.existing_return_id,
      noReasonState: window.state,
      noReasonDeadline: window.deadline,
      noReasonLabel: order.existing_return_id ? `已有进行中的售后申请 ${order.existing_return_id}` : hasPhysicalItems ? window.deadlineLabel : "电子礼品卡不适用实物退换货流程",
      items: orderItems,
    };
  });
}

export async function requestOrderCode(request: Request, payload: Record<string, unknown>) {
  const email = normalizedEmail(payload.email);
  if (!emailPattern.test(email)) return privateJson({ error: "请输入有效的下单邮箱" }, { status: 400 });
  const [ipAllowed, shortAllowed, dayAllowed] = await Promise.all([
    allowRequest(request, "return-order-code", 8, 10 * 60),
    allowRequestForIdentity("return-order-code-target-10m", email, 3, 10 * 60),
    allowRequestForIdentity("return-order-code-target-day", email, 10, 24 * 60 * 60),
  ]);
  if (!ipAllowed || !shortAllowed || !dayAllowed) return rateLimitResponse();
  const db = await getStoreDb();
  const id = crypto.randomUUID();
  const code = randomCode();
  await db.prepare("UPDATE member_verification_codes SET consumed_at = CURRENT_TIMESTAMP WHERE target = ? AND purpose IN (?, ?) AND consumed_at IS NULL").bind(email, lookupPurpose, accessPurpose).run();
  await db.prepare("INSERT INTO member_verification_codes (id, target, purpose, code_hash, expires_at) VALUES (?, ?, ?, ?, ?)").bind(id, email, lookupPurpose, await sha256(`${id}:${code}`), new Date(Date.now() + 10 * 60 * 1000).toISOString()).run();
  try {
    await sendVerificationEmail({ to: email, code, subject: "PUSY.CN 售后订单验证", intro: "你正在查询可申请售后的订单，验证码是：", idempotencyKey: `RETURN-LOOKUP-${id}` });
  } catch (error) {
    console.error("[returns] lookup code delivery failed", { error: error instanceof Error ? error.message : String(error) });
    await db.prepare("DELETE FROM member_verification_codes WHERE id = ?").bind(id).run();
    return safeServerError("验证码暂时无法发送，请稍后再试", 503);
  }
  return privateJson({ ok: true, challengeId: id, message: "验证码已发送至该邮箱，验证后即可选择订单。" });
}

export async function verifyOrderCode(request: Request, payload: Record<string, unknown>) {
  if (!await allowRequest(request, "return-order-code-verify", 30, 10 * 60)) return rateLimitResponse();
  const email = normalizedEmail(payload.email);
  const id = String(payload.challengeId ?? "").trim();
  const code = String(payload.code ?? "").trim();
  if (!emailPattern.test(email) || !/^[0-9a-f-]{36}$/i.test(id) || !/^\d{6}$/.test(code)) return privateJson({ error: "验证码无效或已过期，请重新获取" }, { status: 400 });
  const db = await getStoreDb();
  const challenge = await db.prepare("SELECT target, code_hash, attempts, expires_at, consumed_at FROM member_verification_codes WHERE id = ? AND purpose = ? LIMIT 1").bind(id, lookupPurpose).first<{ target: string; code_hash: string; attempts: number; expires_at: string; consumed_at: string | null }>();
  if (!challenge || challenge.target.toLowerCase() !== email || challenge.consumed_at || challenge.attempts >= 5 || new Date(challenge.expires_at).getTime() <= Date.now()) return privateJson({ error: "验证码无效或已过期，请重新获取" }, { status: 400 });
  const expectedHash = await sha256(`${id}:${code}`);
  if (challenge.code_hash !== expectedHash) {
    await db.prepare("UPDATE member_verification_codes SET attempts = attempts + 1 WHERE id = ? AND purpose = ? AND consumed_at IS NULL").bind(id, lookupPurpose).run();
    return privateJson({ error: "验证码无效或已过期，请重新获取" }, { status: 400 });
  }
  const token = `${crypto.randomUUID()}${crypto.randomUUID()}`;
  await db.prepare("UPDATE member_verification_codes SET purpose = ?, code_hash = ?, attempts = 0, expires_at = ?, consumed_at = NULL WHERE id = ? AND purpose = ? AND code_hash = ? AND consumed_at IS NULL AND expires_at::timestamp > CURRENT_TIMESTAMP").bind(accessPurpose, await sha256(`${id}:${token}`), new Date(Date.now() + 30 * 60 * 1000).toISOString(), id, lookupPurpose, expectedHash).requireChanges("验证码已经使用").run();
  const orders = await listOrders({ memberId: null, email, grantId: id });
  return privateJson({ ok: true, email, orders, message: orders.length ? `已找到 ${orders.length} 笔可核验订单` : "该邮箱下暂时没有可申请售后的交易订单" }, { headers: { "set-cookie": lookupCookieHeader(id, token) } });
}

export async function lookupOrders(request: Request, payload: Record<string, unknown>) {
  if (!await allowRequest(request, "return-order-lookup", 30, 10 * 60)) return rateLimitResponse();
  const identity = await lookupIdentity(request);
  if (!identity) return privateJson({ code: "email-verification-required", error: "请先验证下单邮箱" }, { status: 401 });
  const requestedEmail = normalizedEmail(payload.email);
  if (identity.grantId && requestedEmail !== identity.email) return privateJson({ code: "email-verification-required", error: "请验证当前填写的下单邮箱" }, { status: 401 });
  const orders = await listOrders(identity);
  return privateJson({ ok: true, email: identity.email, orders, message: orders.length ? `已找到 ${orders.length} 笔可核验订单` : "暂时没有可申请售后的交易订单" });
}
