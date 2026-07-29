import { getStoreDb } from "../../../db/store";
import { getAdminIdentity } from "../../../lib/admin-auth";
import { createPayment, createRefund, paymentProviderState, retryRefund, syncPayment, syncRefund } from "../../../lib/payments/service";
import type { PaymentProviderName } from "../../../lib/payments/types";
import { notifyOrderShipped } from "../../../lib/notifications/business";
import { notificationChannelState, processDueNotifications, processNotificationJob } from "../../../lib/notifications/service";
import { chinaComplianceReady, chinaRegion } from "../../../lib/china-region";
import { ensureCommerceFeatureSchema, getSiteContent } from "../../../db/commerce-features";
import { hasTrustedOrigin, safeServerError } from "../../../lib/request-security";
import { releaseOrderReservation } from "../../../lib/orders/reservations";

const orderStatuses = ["待付款", "支付失败", "待处理", "已确认", "配货中", "已发货", "已完成", "退款中", "部分退款", "已退款", "已取消"];
const memberStatuses = ["active", "vip", "blocked"];
const returnStatuses = ["待审核", "已批准", "已拒绝", "已退款", "已关闭"];
const partnershipStatuses = ["待联系", "洽谈中", "已合作", "已拒绝", "已关闭"];
const yuanToStored = (value: unknown) => Math.round(Number(value) / 0.12);
const validImagePath = (value: string) => /^\/(assets|products)\/[A-Za-z0-9_./-]+$/.test(value) || /^https:\/\/avatars\.mds\.yandex\.net\/get-yastore\//.test(value);

async function allowAdmin() { return Boolean(await getAdminIdentity()); }

export async function GET() {
  try {
    if (!await allowAdmin()) return Response.json({ error: "请先登录管理后台" }, { status: 401 });
    await ensureCommerceFeatureSchema();
    const db = await getStoreDb();
    const [products, orders, orderItems, members, subscribers, returns, retailPartnerships, coupons, giftCards, stats, revenueTrend, providers, payments, refunds, paymentEvents, notificationSettings, notificationTemplates, notificationJobs, reviews, content] = await Promise.all([
      db.prepare("SELECT * FROM products ORDER BY id DESC").all(),
      db.prepare("SELECT o.*, COUNT(oi.id) AS item_count FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id GROUP BY o.id ORDER BY o.created_at DESC LIMIT 200").all(),
      db.prepare("SELECT * FROM order_items ORDER BY id DESC LIMIT 1000").all(),
      db.prepare("SELECT * FROM members ORDER BY joined_at DESC LIMIT 500").all(),
      db.prepare("SELECT * FROM subscribers ORDER BY subscribed_at DESC LIMIT 1000").all(),
      db.prepare("SELECT * FROM returns ORDER BY created_at DESC LIMIT 500").all(),
      db.prepare("SELECT * FROM retail_partnerships ORDER BY created_at DESC LIMIT 1000").all(),
      db.prepare("SELECT * FROM coupons ORDER BY created_at DESC LIMIT 500").all(),
      db.prepare("SELECT * FROM gift_cards ORDER BY created_at DESC LIMIT 500").all(),
      db.prepare("SELECT COUNT(*) AS order_count, COALESCE(SUM(CASE WHEN status NOT IN ('待付款','支付失败','已取消') THEN total ELSE 0 END), 0) AS revenue, COALESCE(SUM(CASE WHEN status NOT IN ('已完成','已取消') THEN 1 ELSE 0 END), 0) AS pending_count, COALESCE(AVG(CASE WHEN status NOT IN ('待付款','支付失败','已取消') THEN total END), 0) AS avg_order_value, (SELECT COUNT(*) FROM products WHERE status = 'active' AND inventory_verified = 1 AND stock < 10) AS low_stock_count, (SELECT COUNT(*) FROM products WHERE status = 'active' AND inventory_verified = 0) AS unverified_inventory_count, (SELECT COUNT(*) FROM subscribers WHERE status = 'active') AS active_subscribers, (SELECT COUNT(*) FROM returns WHERE status = '待审核') AS pending_returns, (SELECT COUNT(*) FROM retail_partnerships WHERE status = '待联系') AS pending_partnerships FROM orders").first(),
      db.prepare("SELECT substr(created_at, 1, 10) AS day, COALESCE(SUM(total), 0) AS revenue, COUNT(*) AS orders FROM orders WHERE created_at::timestamp >= CURRENT_TIMESTAMP - INTERVAL '29 days' AND status NOT IN ('待付款','支付失败','已取消') GROUP BY substr(created_at, 1, 10) ORDER BY day").all(),
      paymentProviderState(),
      db.prepare("SELECT p.*, o.customer, o.email FROM payments p JOIN orders o ON o.id = p.order_id ORDER BY p.created_at DESC LIMIT 500").all(),
      db.prepare("SELECT r.*, p.merchant_trade_no FROM refunds r JOIN payments p ON p.id = r.payment_id ORDER BY r.created_at DESC LIMIT 500").all(),
      db.prepare("SELECT * FROM payment_events ORDER BY created_at DESC LIMIT 200").all(),
      notificationChannelState(),
      db.prepare("SELECT * FROM notification_templates ORDER BY key").all(),
      db.prepare("SELECT * FROM notification_jobs ORDER BY created_at DESC LIMIT 500").all(),
      db.prepare("SELECT * FROM product_reviews ORDER BY created_at DESC LIMIT 500").all(),
      getSiteContent(),
    ]);
    return Response.json({ products: products.results, orders: orders.results, orderItems: orderItems.results, members: members.results, subscribers: subscribers.results, returns: returns.results, retailPartnerships: retailPartnerships.results, coupons: coupons.results, giftCards: giftCards.results, stats, revenueTrend: revenueTrend.results, providers, payments: payments.results, refunds: refunds.results, paymentEvents: paymentEvents.results, notificationSettings, notificationTemplates: notificationTemplates.results, notificationJobs: notificationJobs.results, reviews: reviews.results, content, region: { ...chinaRegion, complianceReady: chinaComplianceReady } });
  } catch {
    return safeServerError("读取后台数据失败，请稍后再试");
  }
}

export async function POST(request: Request) {
  try {
    if (!await allowAdmin()) return Response.json({ error: "请先登录管理后台" }, { status: 401 });
    if (!hasTrustedOrigin(request)) return Response.json({ error: "请求来源无效" }, { status: 403 });
    const payload = await request.json() as Record<string, unknown>;
    const action = String(payload.action ?? "");
    await ensureCommerceFeatureSchema();
    const db = await getStoreDb();
    if (action === "bulk-import-products") {
      const items = Array.isArray(payload.products) ? payload.products.slice(0, 200) as Record<string, unknown>[] : [];
      if (!items.length) return Response.json({ error: "没有可导入的商品" }, { status: 400 });
      const statements = [];
      for (const item of items) {
        const slug = String(item.slug ?? "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-");
        const name = String(item.name ?? "").trim();
        const category = String(item.category ?? "").trim();
        const image = String(item.image ?? "").trim();
        const price = yuanToStored(item.price);
        if (!slug || !name || !category || !validImagePath(image) || !Number.isFinite(price)) return Response.json({ error: `商品 ${name || slug || "未知"} 的必填信息或图片地址无效` }, { status: 400 });
        statements.push(db.prepare("INSERT INTO products (slug, name, category, description, image, image_alt, badge, price, old_price, stock, inventory_verified, sku, volume, ingredients, usage, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(slug) DO UPDATE SET name = excluded.name, category = excluded.category, description = excluded.description, image = excluded.image, image_alt = excluded.image_alt, badge = excluded.badge, price = excluded.price, old_price = excluded.old_price, stock = excluded.stock, inventory_verified = excluded.inventory_verified, sku = excluded.sku, volume = excluded.volume, ingredients = excluded.ingredients, usage = excluded.usage, status = excluded.status, updated_at = CURRENT_TIMESTAMP").bind(slug, name, category, String(item.description ?? ""), image, String(item.imageAlt ?? "") || null, String(item.badge ?? "") || null, price, item.oldPrice ? yuanToStored(item.oldPrice) : null, Math.max(0, Math.round(Number(item.stock ?? 0))), item.inventoryVerified ? 1 : 0, String(item.sku ?? "") || null, String(item.volume ?? "") || null, String(item.ingredients ?? "") || null, String(item.usage ?? "") || null, String(item.status ?? "active")));
      }
      await db.batch(statements);
      return Response.json({ ok: true, imported: statements.length });
    } else if (action === "create-product" || action === "update-product") {
      const name = String(payload.name ?? "").trim();
      const slug = String(payload.slug ?? "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-");
      const category = String(payload.category ?? "").trim();
      const image = String(payload.image ?? "").trim();
      const price = yuanToStored(payload.price);
      if (!name || !slug || !category || !validImagePath(image) || !Number.isFinite(price) || price < 0) return Response.json({ error: "请完整填写商品信息，并使用站内图片或允许的历史图片地址" }, { status: 400 });
      const values = [slug, name, category, String(payload.description ?? ""), image, String(payload.imageAlt ?? "") || null, String(payload.badge ?? "") || null, price, payload.oldPrice ? yuanToStored(payload.oldPrice) : null, Math.max(0, Math.round(Number(payload.stock ?? 0))), payload.inventoryVerified ? 1 : 0, String(payload.sku ?? "") || null, String(payload.volume ?? "") || null, String(payload.ingredients ?? "") || null, String(payload.usage ?? "") || null, String(payload.status ?? "active")];
      if (action === "create-product") await db.prepare("INSERT INTO products (slug, name, category, description, image, image_alt, badge, price, old_price, stock, inventory_verified, sku, volume, ingredients, usage, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(...values).run();
      else await db.prepare("UPDATE products SET slug = ?, name = ?, category = ?, description = ?, image = ?, image_alt = ?, badge = ?, price = ?, old_price = ?, stock = ?, inventory_verified = ?, sku = ?, volume = ?, ingredients = ?, usage = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(...values, Number(payload.id)).run();
    } else if (action === "archive-product") {
      await db.prepare("UPDATE products SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(Number(payload.id)).run();
    } else if (action === "update-order-status") {
      const status = String(payload.status ?? "");
      if (!orderStatuses.includes(status)) return Response.json({ error: "订单状态无效" }, { status: 400 });
      if (status === "已取消" && await releaseOrderReservation(String(payload.id))) return Response.json({ ok: true });
      await db.prepare("UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(status, String(payload.id)).run();
      if (status === "已发货") await notifyOrderShipped(String(payload.id)).catch(() => undefined);
    } else if (action === "update-member-status") {
      const status = String(payload.status ?? "");
      if (!memberStatuses.includes(status)) return Response.json({ error: "会员状态无效" }, { status: 400 });
      await db.prepare("UPDATE members SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(status, Number(payload.id)).run();
    } else if (action === "update-subscriber-status") {
      const status = String(payload.status ?? "");
      if (!["active", "unsubscribed"].includes(status)) return Response.json({ error: "订阅状态无效" }, { status: 400 });
      await db.prepare("UPDATE subscribers SET status = ? WHERE id = ?").bind(status, Number(payload.id)).run();
    } else if (action === "update-return-status") {
      const status = String(payload.status ?? "");
      if (!returnStatuses.includes(status)) return Response.json({ error: "售后状态无效" }, { status: 400 });
      await db.prepare("UPDATE returns SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(status, String(payload.id)).run();
    } else if (action === "update-retail-partnership-status") {
      const status = String(payload.status ?? "");
      if (!partnershipStatuses.includes(status)) return Response.json({ error: "合作申请状态无效" }, { status: 400 });
      await db.prepare("UPDATE retail_partnerships SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(status, String(payload.id)).run();
    } else if (action === "create-coupon") {
      const code = String(payload.code ?? "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
      const kind = String(payload.kind ?? "percent");
      const value = kind === "fixed" ? yuanToStored(payload.value) : Math.round(Number(payload.value));
      const minimum = Math.max(0, yuanToStored(payload.minimum ?? 0));
      const usageLimit = Math.max(0, Math.round(Number(payload.usageLimit ?? 0)));
      if (!code || !["percent", "fixed"].includes(kind) || !Number.isFinite(value) || value <= 0 || (kind === "percent" && value > 100)) return Response.json({ error: "请填写有效的优惠码和优惠额度" }, { status: 400 });
      await db.prepare("INSERT INTO coupons (code, kind, value, minimum, usage_limit, status, starts_at, ends_at) VALUES (?, ?, ?, ?, ?, 'active', ?, ?)").bind(code, kind, value, minimum, usageLimit, String(payload.startsAt ?? "") || null, String(payload.endsAt ?? "") || null).run();
    } else if (action === "update-coupon-status") {
      const status = String(payload.status ?? "");
      if (!["active", "disabled"].includes(status)) return Response.json({ error: "优惠码状态无效" }, { status: 400 });
      await db.prepare("UPDATE coupons SET status = ? WHERE id = ?").bind(status, Number(payload.id)).run();
    } else if (action === "update-gift-card-status") {
      const status = String(payload.status ?? "");
      if (!["active", "used", "void"].includes(status)) return Response.json({ error: "礼品卡状态无效" }, { status: 400 });
      await db.prepare("UPDATE gift_cards SET status = ? WHERE code = ?").bind(status, String(payload.code)).run();
    } else if (action === "update-payment-provider") {
      const provider = String(payload.provider ?? "") as PaymentProviderName;
      if (!["wechat", "alipay"].includes(provider)) return Response.json({ error: "支付渠道无效" }, { status: 400 });
      const mode = String(payload.mode ?? "production");
      if (!["production", "sandbox"].includes(mode) || (provider === "wechat" && mode !== "production")) return Response.json({ error: "支付运行环境无效" }, { status: 400 });
      await db.prepare("UPDATE payment_providers SET enabled = ?, mode = ?, app_id = ?, merchant_id = ?, public_key_id = ?, certificate_serial = ?, updated_at = CURRENT_TIMESTAMP WHERE provider = ?").bind(payload.enabled ? 1 : 0, mode, String(payload.appId ?? "").trim(), String(payload.merchantId ?? "").trim(), String(payload.publicKeyId ?? "").trim(), String(payload.certificateSerial ?? "").trim(), provider).run();
    } else if (action === "retry-payment") {
      const provider = String(payload.provider ?? "") as PaymentProviderName;
      await createPayment(String(payload.orderId ?? ""), provider, new URL(request.url).origin);
    } else if (action === "sync-payment") {
      await syncPayment(String(payload.id ?? ""));
    } else if (action === "create-refund") {
      const amountFen = Math.round(Number(payload.amountYuan) * 100);
      const reason = String(payload.reason ?? "").trim();
      if (!Number.isFinite(amountFen) || amountFen <= 0 || !reason) return Response.json({ error: "请填写有效退款金额和原因" }, { status: 400 });
      await createRefund(String(payload.paymentId ?? ""), amountFen, reason, new URL(request.url).origin);
    } else if (action === "retry-refund") {
      await retryRefund(String(payload.id ?? ""), new URL(request.url).origin);
    } else if (action === "sync-refund") {
      await syncRefund(String(payload.id ?? ""));
    } else if (action === "update-notification-setting") {
      const channel = String(payload.channel ?? "");
      if (!["email", "sms"].includes(channel)) return Response.json({ error: "通知渠道无效" }, { status: 400 });
      await db.prepare("UPDATE notification_settings SET enabled = ?, sender_name = ?, sender_address = ?, updated_at = CURRENT_TIMESTAMP WHERE channel = ?").bind(payload.enabled ? 1 : 0, String(payload.senderName ?? "PUSY.CN").trim() || "PUSY.CN", String(payload.senderAddress ?? "").trim(), channel).run();
    } else if (action === "update-notification-template") {
      const key = String(payload.key ?? "");
      const template = await db.prepare("SELECT key FROM notification_templates WHERE key = ?").bind(key).first();
      if (!template) return Response.json({ error: "通知模板不存在" }, { status: 404 });
      await db.prepare("UPDATE notification_templates SET enabled = ?, email_subject = ?, email_body = ?, sms_body = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?").bind(payload.enabled ? 1 : 0, String(payload.emailSubject ?? "").trim(), String(payload.emailBody ?? "").trim(), String(payload.smsBody ?? "").trim(), key).run();
    } else if (action === "retry-notification") {
      const id = String(payload.id ?? "");
      await db.prepare("UPDATE notification_jobs SET status = 'queued', next_retry_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status != 'sent'").bind(id).run();
      await processNotificationJob(id);
    } else if (action === "process-notifications") {
      await processDueNotifications();
    } else if (action === "update-review-status") {
      const status = String(payload.status ?? "");
      if (!["pending", "approved", "rejected"].includes(status)) return Response.json({ error: "评价状态无效" }, { status: 400 });
      await db.prepare("UPDATE product_reviews SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(status, Number(payload.id)).run();
    } else if (action === "update-site-content") {
      const content = payload.content && typeof payload.content === "object" ? payload.content as Record<string, unknown> : {};
      const allowed = ["announcement", "hero_eyebrow", "hero_title", "hero_subtitle", "featured_title"];
      const statements = allowed.map((key) => db.prepare("INSERT INTO site_content (key, value, updated_at) VALUES (?, ?, CURRENT_TIMESTAMP) ON CONFLICT(key) DO UPDATE SET value = excluded.value, updated_at = CURRENT_TIMESTAMP").bind(key, String(content[key] ?? "").trim().slice(0, 180)));
      await db.batch(statements);
    } else return Response.json({ error: "未知操作" }, { status: 400 });
    return Response.json({ ok: true });
  } catch (error) {
    const conflict = error instanceof Error && /unique/i.test(error.message);
    return safeServerError(conflict ? "链接标识或邮箱已经存在" : "后台操作失败，请稍后再试", conflict ? 409 : 500);
  }
}
