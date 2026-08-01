import { getStoreDb } from "../../../db/store";
import { notifyReturnUpdated } from "../../../lib/notifications/business";
import { allowRequest, privateJson, rateLimitResponse } from "../../../lib/request-security";
import { isReturnReason, isReturnRequestType, returnReasons, returnRequestTypes, sevenDayNoReasonWindow } from "../../../lib/returns/eligibility";
import { isGiftCardLineSlug } from "../../../lib/shipping";
import { createWebsiteReturnCase } from "../../../lib/support/service";
import { lookupIdentity } from "./return-lookup";
import type { ItemRow, OrderRow } from "./return-types";

const contactPreferences = new Set(["电话或短信", "微信", "电子邮箱"]);

export async function submitReturn(request: Request, payload: Record<string, unknown>) {
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
