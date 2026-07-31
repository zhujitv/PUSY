import { ensureMember } from "../../../db/member-account";
import { getStoreDb } from "../../../db/store";
import { getPreviewMemberIdentity } from "../../../lib/preview-member-auth";
import { ensureMemberProfile } from "../../../db/member-profile";
import { hasTrustedOrigin, privateJson, safeServerError } from "../../../lib/request-security";
import { cancelOrder } from "../../../lib/orders/cancellation";

const genderValues = new Set(["", "female", "male", "undisclosed"]);
const skinTypeValues = new Set(["", "normal", "dry", "oily", "combination", "sensitive"]);
const skinConcernValues = new Set(["补水保湿", "控油净肤", "敏感修护", "提亮肤色", "抗老紧致", "痘肌护理"]);
const categoryValues = new Set(["彩妆", "护肤", "身体护理", "头发护理", "眉妆", "配件"]);

function text(value: unknown, maximum: number) {
  return String(value ?? "").trim().slice(0, maximum);
}

function selected(value: unknown, allowed: Set<string>) {
  return Array.isArray(value) ? value.map(String).filter((item) => allowed.has(item)) : [];
}

function validBirthday(value: string) {
  if (!value) return true;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value) || value > new Date().toISOString().slice(0, 10)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year && date.getUTCMonth() === month - 1 && date.getUTCDate() === day;
}

async function identity() {
  return getPreviewMemberIdentity();
}

export async function GET() {
  try {
    const viewer = await identity();
    if (!viewer) return privateJson({ error: "请先登录会员账户" }, { status: 401 });
    const member = await ensureMember(viewer);
    await ensureMemberProfile(member.id);
    const db = await getStoreDb();
    const [profile, addresses, orders, orderItems, returns, invoices, pointsLedger, coupons, productAlerts, tags, shipments, shipmentEvents] = await Promise.all([
      db.prepare("SELECT * FROM member_profiles WHERE member_id = ?").bind(member.id).first(),
      db.prepare("SELECT * FROM member_addresses WHERE member_id = ? ORDER BY is_default DESC, id DESC").bind(member.id).all(),
      db.prepare("SELECT o.*, COUNT(oi.id) AS item_count FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id WHERE o.member_id = ? GROUP BY o.id ORDER BY o.created_at DESC").bind(member.id).all(),
      db.prepare("SELECT oi.* FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE o.member_id = ? ORDER BY oi.id").bind(member.id).all(),
      db.prepare("SELECT r.* FROM returns r JOIN orders o ON o.id = r.order_id WHERE o.member_id = ? ORDER BY r.created_at DESC").bind(member.id).all(),
      db.prepare("SELECT id, order_id, invoice_type, title, tax_number, recipient_email, amount, status, invoice_number, file_url, rejection_reason, requested_at, issued_at, updated_at FROM invoices WHERE member_id = ? ORDER BY requested_at DESC").bind(member.id).all(),
      db.prepare("SELECT id, points, balance_after, reason, reference_type, reference_id, created_at FROM member_points_ledger WHERE member_id = ? ORDER BY created_at DESC LIMIT 50").bind(member.id).all(),
      db.prepare("SELECT c.id, c.code, c.kind, c.value, c.minimum, c.starts_at, c.ends_at, ca.status, ca.assigned_at FROM coupon_assignments ca JOIN coupons c ON c.id = ca.coupon_id WHERE ca.member_id = ? AND c.status = 'active' ORDER BY ca.assigned_at DESC").bind(member.id).all(),
      db.prepare("SELECT a.id, a.product_slug, a.alert_type, a.target_price, a.last_notified_at, a.created_at, p.name AS product_name, p.image, p.price, p.stock FROM member_product_alerts a JOIN products p ON p.slug = a.product_slug WHERE a.member_id = ? AND a.status = 'active' ORDER BY a.created_at DESC").bind(member.id).all(),
      db.prepare("SELECT t.id, t.name, t.color FROM member_tag_assignments a JOIN customer_tags t ON t.id = a.tag_id WHERE a.member_id = ? ORDER BY t.name").bind(member.id).all(),
      db.prepare("SELECT s.* FROM shipments s JOIN orders o ON o.id = s.order_id WHERE o.member_id = ? ORDER BY s.shipped_at DESC").bind(member.id).all(),
      db.prepare("SELECT se.* FROM shipment_events se JOIN shipments s ON s.id = se.shipment_id JOIN orders o ON o.id = s.order_id WHERE o.member_id = ? ORDER BY se.event_time DESC").bind(member.id).all(),
    ]);
    return Response.json({ member, profile, addresses: addresses.results, orders: orders.results, orderItems: orderItems.results, returns: returns.results, invoices: invoices.results, pointsLedger: pointsLedger.results, coupons: coupons.results, productAlerts: productAlerts.results, tags: tags.results, shipments: shipments.results, shipmentEvents: shipmentEvents.results, canSignOut: true }, { headers: { "cache-control": "private, no-store" } });
  } catch {
    return safeServerError("读取会员资料失败，请稍后再试");
  }
}

export async function POST(request: Request) {
  try {
    if (!hasTrustedOrigin(request)) return privateJson({ error: "请求来源无效" }, { status: 403 });
    const viewer = await identity();
    if (!viewer) return privateJson({ error: "请先登录会员账户" }, { status: 401 });
    const member = await ensureMember(viewer);
    if (member.status === "blocked") return Response.json({ error: "该会员账户已停用" }, { status: 403 });
    await ensureMemberProfile(member.id);
    const payload = await request.json() as Record<string, unknown>;
    const action = String(payload.action ?? "");
    const db = await getStoreDb();
    if (action === "update-profile") {
      const name = text(payload.name, 50);
      if (!name) return Response.json({ error: "请填写姓名" }, { status: 400 });
      const nickname = text(payload.nickname, 30);
      const gender = text(payload.gender, 20);
      const birthday = text(payload.birthday, 10);
      const skinType = text(payload.skinType, 20);
      if (!genderValues.has(gender) || !skinTypeValues.has(skinType)) return Response.json({ error: "个人资料选项无效" }, { status: 400 });
      if (!validBirthday(birthday)) return Response.json({ error: "请填写有效的出生日期" }, { status: 400 });
      const skinConcerns = selected(payload.skinConcerns, skinConcernValues);
      const preferredCategories = selected(payload.preferredCategories, categoryValues);
      await db.batch([
        db.prepare("UPDATE members SET name = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(name, member.id),
        db.prepare(`UPDATE member_profiles SET nickname = ?, gender = ?, birthday = ?, wechat = ?, province = ?, city = ?, occupation = ?, skin_type = ?, skin_concerns = ?, preferred_categories = ?, bio = ?, email_marketing = ?, sms_marketing = ?, updated_at = CURRENT_TIMESTAMP WHERE member_id = ?`).bind(nickname, gender, birthday, text(payload.wechat, 50), text(payload.province, 30), text(payload.city, 30), text(payload.occupation, 50), skinType, JSON.stringify(skinConcerns), JSON.stringify(preferredCategories), text(payload.bio, 200), payload.emailMarketing ? 1 : 0, payload.smsMarketing ? 1 : 0, member.id),
      ]);
    } else if (action === "save-address") {
      const limits: Record<string, number> = { label: 20, recipient: 50, phone: 20, province: 30, city: 30, district: 30, detail: 200, postcode: 12 };
      const values = ["label", "recipient", "phone", "province", "city", "district", "detail", "postcode"].map((key) => text(payload[key], limits[key]));
      const [label, recipient, phone, province, city, district, detail, postcode] = values;
      if (!recipient || !/^\+?[0-9\s-]{6,20}$/.test(phone) || !province || !city || !detail) return Response.json({ error: "请完整填写收件人、有效电话和地址" }, { status: 400 });
      const id = Number(payload.id ?? 0);
      const wantsDefault = Boolean(payload.isDefault);
      const count = await db.prepare("SELECT COUNT(*) AS count FROM member_addresses WHERE member_id = ?").bind(member.id).first<{ count: number }>();
      const isDefault = wantsDefault || !count?.count;
      if (isDefault) await db.prepare("UPDATE member_addresses SET is_default = 0 WHERE member_id = ?").bind(member.id).run();
      if (id) {
        const result = await db.prepare("UPDATE member_addresses SET label = ?, recipient = ?, phone = ?, province = ?, city = ?, district = ?, detail = ?, postcode = ?, is_default = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND member_id = ?").bind(label || "家", recipient, phone, province, city, district, detail, postcode, isDefault ? 1 : 0, id, member.id).run();
        if (!result.meta.changes) return Response.json({ error: "未找到该收货地址" }, { status: 404 });
      } else {
        await db.prepare("INSERT INTO member_addresses (member_id, label, recipient, phone, province, city, district, detail, postcode, is_default) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(member.id, label || "家", recipient, phone, province, city, district, detail, postcode, isDefault ? 1 : 0).run();
      }
    } else if (action === "set-default-address") {
      const id = Number(payload.id);
      const address = await db.prepare("SELECT id FROM member_addresses WHERE id = ? AND member_id = ? LIMIT 1").bind(id, member.id).first();
      if (!address) return Response.json({ error: "未找到该收货地址" }, { status: 404 });
      await db.batch([db.prepare("UPDATE member_addresses SET is_default = 0 WHERE member_id = ?").bind(member.id), db.prepare("UPDATE member_addresses SET is_default = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND member_id = ?").bind(id, member.id)]);
    } else if (action === "delete-address") {
      const id = Number(payload.id);
      const address = await db.prepare("SELECT is_default FROM member_addresses WHERE id = ? AND member_id = ?").bind(id, member.id).first<{ is_default: number }>();
      if (!address) return Response.json({ error: "未找到该收货地址" }, { status: 404 });
      await db.prepare("DELETE FROM member_addresses WHERE id = ? AND member_id = ?").bind(id, member.id).run();
      if (address.is_default) await db.prepare("UPDATE member_addresses SET is_default = 1 WHERE id = (SELECT id FROM member_addresses WHERE member_id = ? ORDER BY id DESC LIMIT 1)").bind(member.id).run();
    } else if (action === "remove-product-alert") {
      const id = Number(payload.id);
      if (!Number.isInteger(id) || id < 1) return Response.json({ error: "商品提醒无效" }, { status: 400 });
      await db.prepare("UPDATE member_product_alerts SET status = 'disabled' WHERE id = ? AND member_id = ?").bind(id, member.id).run();
    } else if (action === "request-invoice") {
      const orderId = text(payload.orderId, 60).toUpperCase();
      const invoiceType = text(payload.invoiceType, 20);
      const title = text(payload.title, 120);
      const taxNumber = text(payload.taxNumber, 30).toUpperCase();
      const recipientEmail = text(payload.recipientEmail, 160).toLowerCase();
      if (!orderId || !["personal", "company"].includes(invoiceType) || !title || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(recipientEmail)) return Response.json({ error: "请完整填写有效的开票信息" }, { status: 400 });
      if (invoiceType === "company" && !/^[0-9A-Z]{15,20}$/.test(taxNumber)) return Response.json({ error: "请填写有效的企业税号" }, { status: 400 });
      const order = await db.prepare("SELECT o.id, o.total, o.status, COALESCE((SELECT SUM(r.amount_fen) FROM refunds r WHERE r.order_id = o.id AND r.status = 'succeeded'), 0) AS refunded_fen FROM orders o WHERE o.id = ? AND o.member_id = ? LIMIT 1").bind(orderId, member.id).first<{ id: string; total: number; status: string; refunded_fen: number }>();
      if (!order) return Response.json({ error: "未找到该会员订单" }, { status: 404 });
      if (["待付款", "支付失败", "已取消", "已退款"].includes(order.status)) return Response.json({ error: "该订单当前不符合开票条件" }, { status: 400 });
      const invoiceAmount = Math.max(0, Number(order.total) - Math.round(Number(order.refunded_fen) / 12));
      if (!invoiceAmount) return Response.json({ error: "该订单没有可开票金额" }, { status: 400 });
      const existing = await db.prepare("SELECT id, status FROM invoices WHERE order_id = ? AND member_id = ? LIMIT 1").bind(order.id, member.id).first<{ id: string; status: string }>();
      if (existing && !["rejected", "cancelled"].includes(existing.status)) return Response.json({ error: "该订单已经提交过发票申请" }, { status: 409 });
      if (existing) {
        await db.prepare("UPDATE invoices SET invoice_type = ?, title = ?, tax_number = ?, recipient_email = ?, amount = ?, status = 'pending', rejection_reason = '', requested_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(invoiceType, title, invoiceType === "company" ? taxNumber : "", recipientEmail, invoiceAmount, existing.id).run();
      } else {
        const invoiceId = `INV-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
        await db.prepare("INSERT INTO invoices (id, order_id, member_id, invoice_type, title, tax_number, recipient_email, amount) VALUES (?, ?, ?, ?, ?, ?, ?, ?)").bind(invoiceId, order.id, member.id, invoiceType, title, invoiceType === "company" ? taxNumber : "", recipientEmail, invoiceAmount).run();
      }
    } else if (action === "cancel-order") {
      const orderId = text(payload.orderId, 60).toUpperCase();
      if (!orderId) return Response.json({ error: "订单号无效" }, { status: 400 });
      const result = await cancelOrder({ orderId, memberId: member.id, reason: text(payload.reason, 200) || "会员中心申请取消", origin: new URL(request.url).origin });
      return Response.json({ ok: true, ...result });
    } else if (action === "update-return-logistics") {
      const returnId = text(payload.returnId, 60);
      const carrier = text(payload.carrier, 60);
      const trackingNumber = text(payload.trackingNumber, 64).replace(/\s+/g, "");
      if (!returnId || !carrier || !/^[A-Za-z0-9-]{5,64}$/.test(trackingNumber)) return Response.json({ error: "请填写有效退回物流公司和单号" }, { status: 400 });
      const result = await db.prepare("UPDATE returns r SET return_carrier = ?, return_tracking_number = ?, updated_at = CURRENT_TIMESTAMP FROM orders o WHERE r.order_id = o.id AND r.id = ? AND o.member_id = ? AND r.status IN ('待审核','已批准')").bind(carrier, trackingNumber, returnId, member.id).run();
      if (!result.meta.changes) return Response.json({ error: "未找到可更新物流的售后申请" }, { status: 404 });
    } else return Response.json({ error: "未知操作" }, { status: 400 });
    return Response.json({ ok: true });
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    if (/订单已经|订单当前|已经发货|没有可退|订单不存在/.test(message)) return safeServerError(message, 409);
    return safeServerError("保存会员资料失败，请稍后再试");
  }
}
