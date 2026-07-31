import { ensureMember } from "../../../db/member-account";
import { getStoreDb } from "../../../db/store";
import { sendVerificationEmail } from "../../../lib/notifications/verification-email";
import { notifyReturnUpdated } from "../../../lib/notifications/business";
import { getPreviewMemberIdentity } from "../../../lib/preview-member-auth";
import { sha256 } from "../../../lib/payments/crypto";
import { allowRequest, allowRequestForIdentity, hasTrustedOrigin, privateJson, rateLimitResponse, safeServerError } from "../../../lib/request-security";
import { isReturnReason, isReturnRequestType, returnReasons, returnRequestTypes, sevenDayNoReasonWindow } from "../../../lib/returns/eligibility";
import { isGiftCardLineSlug } from "../../../lib/shipping";
import { createWebsiteReturnCase } from "../../../lib/support/service";

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const contactPreferences = new Set(["电话或短信", "微信", "电子邮箱"]);
const lookupCookie = "pusy-return-lookup";
const lookupPurpose = "return-order-lookup";
const accessPurpose = "return-order-access";

type OrderRow = {
  id: string;
  member_id: number | null;
  customer: string;
  email: string;
  phone: string;
  total: number;
  delivery: string;
  status: string;
  created_at: string;
  shipment_status: string | null;
  delivered_at: string | null;
  existing_return_id: string | null;
};

type ItemRow = { id: number; order_id: string; product_slug: string; product_name: string; quantity: number; unit_price: number };
type LookupIdentity = { memberId: number | null; email: string; grantId: string | null };

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

async function lookupIdentity(request: Request): Promise<LookupIdentity | null> {
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

async function requestOrderCode(request: Request, payload: Record<string, unknown>) {
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

async function verifyOrderCode(request: Request, payload: Record<string, unknown>) {
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

async function lookupOrders(request: Request, payload: Record<string, unknown>) {
  if (!await allowRequest(request, "return-order-lookup", 30, 10 * 60)) return rateLimitResponse();
  const identity = await lookupIdentity(request);
  if (!identity) return privateJson({ code: "email-verification-required", error: "请先验证下单邮箱" }, { status: 401 });
  const requestedEmail = normalizedEmail(payload.email);
  if (identity.grantId && requestedEmail !== identity.email) return privateJson({ code: "email-verification-required", error: "请验证当前填写的下单邮箱" }, { status: 401 });
  const orders = await listOrders(identity);
  return privateJson({ ok: true, email: identity.email, orders, message: orders.length ? `已找到 ${orders.length} 笔可核验订单` : "暂时没有可申请售后的交易订单" });
}

async function submitReturn(request: Request, payload: Record<string, unknown>) {
  if (!await allowRequest(request, "returns-submit", 8, 3600)) return rateLimitResponse();
  const identity = await lookupIdentity(request);
  if (!identity) return privateJson({ error: "订单验证已失效，请重新验证邮箱" }, { status: 401 });
  const orderId = String(payload.orderId ?? "").trim().toUpperCase().slice(0, 64);
  const requestType = String(payload.requestType ?? "");
  const reasonKey = String(payload.reason ?? "");
  const details = String(payload.details ?? "").trim().slice(0, 4000);
  const phone = String(payload.phone ?? "").trim().replace(/\s+/g, "").slice(0, 20);
  const wechat = String(payload.wechat ?? "").trim().slice(0, 60);
  const contactPreference = String(payload.contactPreference ?? "").trim();
  if (!/^PUSY-\d{8}-[A-Z0-9]{6,20}$/.test(orderId) || !isReturnRequestType(requestType) || !isReturnReason(reasonKey)) return privateJson({ error: "请选择有效订单、售后诉求和申请原因" }, { status: 400 });
  if (!/^1[3-9]\d{9}$/.test(phone) || !contactPreferences.has(contactPreference)) return privateJson({ error: "请填写有效手机号码和联系方式" }, { status: 400 });
  if (contactPreference === "微信" && !wechat) return privateJson({ error: "选择微信联系时请填写微信号" }, { status: 400 });
  if (reasonKey === "other" && details.length < 5) return privateJson({ error: "请补充说明具体的售后问题" }, { status: 400 });

  const db = await getStoreDb();
  const ownership = identity.memberId ? "o.member_id = ?" : "lower(o.email) = ?";
  const order = await db.prepare(`SELECT o.id, o.member_id, o.customer, o.email, o.phone, o.status, o.resources_committed, s.status AS shipment_status, s.delivered_at
    FROM orders o LEFT JOIN shipments s ON s.order_id = o.id
    WHERE upper(o.id) = ? AND ${ownership} LIMIT 1`).bind(orderId, identity.memberId ?? identity.email).first<OrderRow & { resources_committed: number }>();
  if (!order) return privateJson({ error: "未找到属于当前账户的订单" }, { status: 404 });
  if (!order.resources_committed || ["待付款", "支付失败", "已取消", "已退款"].includes(order.status)) return privateJson({ error: "该订单当前不符合售后申请条件" }, { status: 409 });
  const existing = await db.prepare("SELECT id FROM returns WHERE order_id = ? AND status NOT IN ('已拒绝','已关闭') LIMIT 1").bind(order.id).first<{ id: string }>();
  if (existing) return privateJson({ error: `该订单已有进行中的申请：${existing.id}` }, { status: 409 });

  const storedItems = await db.prepare("SELECT id, order_id, product_slug, product_name, quantity, unit_price FROM order_items WHERE order_id = ? ORDER BY id").bind(order.id).all<ItemRow>();
  const requestedItems = Array.isArray(payload.items) ? payload.items : [];
  const selectedIds = new Set<number>();
  const snapshots: { orderItemId: number; productSlug: string; productName: string; purchasedQuantity: number; requestedQuantity: number; unitPrice: number }[] = [];
  for (const raw of requestedItems) {
    if (!raw || typeof raw !== "object") return privateJson({ error: "申请商品信息无效" }, { status: 400 });
    const candidate = raw as Record<string, unknown>;
    const orderItemId = Number(candidate.orderItemId);
    const requestedQuantity = Number(candidate.quantity);
    const stored = storedItems.results.find((item) => item.id === orderItemId);
    if (!Number.isInteger(orderItemId) || selectedIds.has(orderItemId) || !stored || !Number.isInteger(requestedQuantity) || requestedQuantity < 1 || requestedQuantity > stored.quantity || isGiftCardLineSlug(stored.product_slug)) return privateJson({ error: "请选择有效的实物商品和申请数量" }, { status: 400 });
    selectedIds.add(orderItemId);
    snapshots.push({ orderItemId, productSlug: stored.product_slug, productName: stored.product_name, purchasedQuantity: stored.quantity, requestedQuantity, unitPrice: stored.unit_price });
  }
  if (!snapshots.length) return privateJson({ error: "请至少选择一件需要售后的商品" }, { status: 400 });

  const window = sevenDayNoReasonWindow(order.delivered_at);
  const sealedConfirmed = payload.sealedConditionConfirmed === true;
  if (reasonKey === "seven-day-no-reason") {
    if (requestType !== "refund") return privateJson({ error: "七日无理由申请请选择退货退款" }, { status: 400 });
    if (!window.eligible) return privateJson({ error: "该订单当前不在可自动识别的七日无理由时间窗口内；质量、错发或破损问题仍可继续申请售后" }, { status: 409 });
    if (!sealedConfirmed) return privateJson({ error: "请确认商品必要的一次性密封包装未拆除或损坏，且商品、配件、赠品和标签保持完好" }, { status: 400 });
  }
  const eligibilityNote = reasonKey === "seven-day-no-reason"
    ? `${window.deadlineLabel}；客户已确认必要的一次性密封包装未拆除或损坏，最终以退回商品完好情况审核为准`
    : `本申请属于${returnReasons[reasonKey]}，不以七日无理由时间窗口作为唯一处理条件`;
  let created: { returnId: string; threadId: string };
  try {
    created = await createWebsiteReturnCase({
      orderId: order.id,
      memberId: order.member_id,
      customer: order.customer,
      email: order.email.toLowerCase(),
      phone,
      wechat,
      contactPreference,
      requestType,
      requestTypeLabel: returnRequestTypes[requestType],
      reason: returnReasons[reasonKey],
      details,
      itemsJson: JSON.stringify(snapshots),
      eligibilityNote,
    });
  } catch (error) {
    if (error instanceof Error && /进行中的售后申请/.test(error.message)) return privateJson({ error: "该订单已有进行中的售后申请" }, { status: 409 });
    throw error;
  }
  await notifyReturnUpdated(created.returnId, "待审核", "售后申请已提交，客服将在工单中与你联系。").catch(() => undefined);
  return privateJson({ ok: true, id: created.threadId, returnId: created.returnId, status: "待审核", message: "售后申请已提交，确认邮件会发送至下单邮箱。" }, { status: 201 });
}

export async function POST(request: Request) {
  try {
    if (!hasTrustedOrigin(request)) return privateJson({ error: "请求来源无效" }, { status: 403 });
    const payload = await request.json() as Record<string, unknown>;
    const action = String(payload.action ?? "");
    if (action === "request-order-code") return requestOrderCode(request, payload);
    if (action === "verify-order-code") return verifyOrderCode(request, payload);
    if (action === "lookup-orders") return lookupOrders(request, payload);
    if (action === "submit-return") return submitReturn(request, payload);
    return privateJson({ error: "售后操作无效" }, { status: 400 });
  } catch (error) {
    console.error("[returns] request failed", { error: error instanceof Error ? error.message : String(error) });
    const message = error instanceof Error && /验证码已经使用/.test(error.message) ? "验证码无效或已过期，请重新获取" : "售后操作失败，请稍后再试";
    return safeServerError(message, message.startsWith("验证码") ? 409 : 500);
  }
}
