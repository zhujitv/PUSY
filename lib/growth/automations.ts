import { getStoreDb } from "../../db/store";
import { enqueueNotification } from "../notifications/service";

const siteUrl = (process.env.NEXT_PUBLIC_SITE_URL || "https://pusy.cn").replace(/\/$/, "");
const storedToYuan = (value: number) => (Number(value) * 0.12).toFixed(2);

type AutomationResult = { key: string; matched: number; queued: number };

async function recordRun(key: string, work: () => Promise<Omit<AutomationResult, "key">>): Promise<AutomationResult> {
  const db = await getStoreDb();
  const id = `GROW-${crypto.randomUUID().replaceAll("-", "").slice(0, 16).toUpperCase()}`;
  await db.prepare("INSERT INTO growth_automation_runs (id, automation_key) VALUES (?, ?)").bind(id, key).run();
  try {
    const result = await work();
    await db.prepare("UPDATE growth_automation_runs SET status = 'completed', matched_count = ?, queued_count = ?, finished_at = CURRENT_TIMESTAMP WHERE id = ?").bind(result.matched, result.queued, id).run();
    return { key, ...result };
  } catch (error) {
    await db.prepare("UPDATE growth_automation_runs SET status = 'failed', error_text = ?, finished_at = CURRENT_TIMESTAMP WHERE id = ?").bind(error instanceof Error ? error.message.slice(0, 1000) : "自动任务失败", id).run();
    throw error;
  }
}

async function paymentReminders() {
  const db = await getStoreDb();
  const orders = await db.prepare(`
    SELECT id, customer, email, phone, total, reservation_expires_at
    FROM orders
    WHERE status IN ('待付款','支付失败')
      AND resources_committed = 0 AND resources_released = 0
      AND reservation_expires_at::timestamp > CURRENT_TIMESTAMP
      AND reservation_expires_at::timestamp <= CURRENT_TIMESTAMP + INTERVAL '20 minutes'
    ORDER BY reservation_expires_at LIMIT 100
  `).all<{ id: string; customer: string; email: string; phone: string; total: number; reservation_expires_at: string }>();
  let queued = 0;
  for (const order of orders.results) {
    queued += (await enqueueNotification({
      eventKey: `payment-reminder:${order.id}`,
      entityType: "order",
      entityId: order.id,
      templateKey: "payment_reminder",
      email: order.email,
      phone: order.phone,
      payload: { customer: order.customer, orderId: order.id, amount: storedToYuan(order.total), expiresAt: new Date(order.reservation_expires_at).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Shanghai" }) },
    })).length;
  }
  return { matched: orders.results.length, queued };
}

async function repurchaseReminders() {
  const db = await getStoreDb();
  const rows = await db.prepare(`
    SELECT o.id AS order_id, o.member_id, m.name, m.email, m.phone, mp.email_marketing, mp.sms_marketing,
      oi.product_slug, oi.product_name
    FROM orders o
    JOIN members m ON m.id = o.member_id AND m.status != 'blocked'
    JOIN member_profiles mp ON mp.member_id = m.id
    JOIN order_items oi ON oi.order_id = o.id
    WHERE o.status NOT IN ('待付款','支付失败','已取消','已退款')
      AND o.created_at::timestamp <= CURRENT_TIMESTAMP - INTERVAL '45 days'
      AND (mp.email_marketing = 1 OR mp.sms_marketing = 1)
      AND NOT EXISTS (
        SELECT 1 FROM orders newer
        JOIN order_items newer_item ON newer_item.order_id = newer.id
        WHERE newer.member_id = o.member_id AND newer_item.product_slug = oi.product_slug
          AND newer.created_at::timestamp > o.created_at::timestamp
          AND newer.status NOT IN ('待付款','支付失败','已取消','已退款')
      )
    ORDER BY o.created_at DESC LIMIT 100
  `).all<{ order_id: string; member_id: number; name: string; email: string; phone: string; email_marketing: number; sms_marketing: number; product_slug: string; product_name: string }>();
  let queued = 0;
  for (const row of rows.results) {
    queued += (await enqueueNotification({
      eventKey: `repurchase:${row.order_id}:${row.product_slug}`,
      entityType: "member",
      entityId: String(row.member_id),
      templateKey: "repurchase_reminder",
      email: row.email_marketing ? row.email : undefined,
      phone: row.sms_marketing ? row.phone : undefined,
      payload: { customer: row.name, productName: row.product_name, productUrl: `${siteUrl}/products/${row.product_slug}` },
    })).length;
  }
  return { matched: rows.results.length, queued };
}

async function newProductNotifications() {
  const db = await getStoreDb();
  const products = await db.prepare("SELECT slug, name FROM products WHERE status = 'active' AND created_at::timestamp >= CURRENT_TIMESTAMP - INTERVAL '48 hours' ORDER BY created_at DESC LIMIT 20").all<{ slug: string; name: string }>();
  const members = await db.prepare("SELECT m.id, m.name, m.email, m.phone, mp.email_marketing, mp.sms_marketing FROM members m JOIN member_profiles mp ON mp.member_id = m.id WHERE m.status != 'blocked' AND (mp.email_marketing = 1 OR mp.sms_marketing = 1) LIMIT 500").all<{ id: number; name: string; email: string; phone: string; email_marketing: number; sms_marketing: number }>();
  const subscribers = await db.prepare("SELECT id, email FROM subscribers WHERE status = 'active' AND NOT EXISTS (SELECT 1 FROM member_profiles mp JOIN members m ON m.id = mp.member_id WHERE lower(m.email) = lower(subscribers.email) AND mp.email_marketing = 1) LIMIT 1000").all<{ id: number; email: string }>();
  let queued = 0;
  let matched = 0;
  for (const product of products.results) for (const member of members.results) {
    matched += 1;
    queued += (await enqueueNotification({
      eventKey: `new-product:${product.slug}:${member.id}`,
      entityType: "product",
      entityId: product.slug,
      templateKey: "new_product",
      email: member.email_marketing ? member.email : undefined,
      phone: member.sms_marketing ? member.phone : undefined,
      payload: { customer: member.name, productName: product.name, productUrl: `${siteUrl}/products/${product.slug}` },
    })).length;
  }
  for (const product of products.results) for (const subscriber of subscribers.results) {
    matched += 1;
    queued += (await enqueueNotification({
      eventKey: `new-product:${product.slug}:subscriber-${subscriber.id}`,
      entityType: "product",
      entityId: product.slug,
      templateKey: "new_product",
      email: subscriber.email,
      payload: { customer: "朋友", productName: product.name, productUrl: `${siteUrl}/products/${product.slug}` },
    })).length;
  }
  return { matched, queued };
}

export async function runGrowthAutomations() {
  const results: AutomationResult[] = [];
  for (const [key, runner] of [["payment-reminder", paymentReminders], ["repurchase-reminder", repurchaseReminders], ["new-product", newProductNotifications]] as const) {
    results.push(await recordRun(key, runner));
  }
  return results;
}

export async function notifyProductChange(input: { slug: string; name: string; oldPrice: number; newPrice: number; oldStock: number; newStock: number; changeToken: string }) {
  const db = await getStoreDb();
  if (input.newPrice < input.oldPrice) {
    await db.prepare("INSERT INTO product_price_history (product_slug, old_price, new_price) VALUES (?, ?, ?)").bind(input.slug, input.oldPrice, input.newPrice).run();
    const alerts = await db.prepare(`
      SELECT a.id, a.member_id, m.name, m.email
      FROM member_product_alerts a JOIN members m ON m.id = a.member_id
      WHERE a.product_slug = ? AND a.alert_type = 'price_drop' AND a.status = 'active'
        AND (a.target_price IS NULL OR ? <= a.target_price) AND m.status != 'blocked'
    `).bind(input.slug, input.newPrice).all<{ id: number; member_id: number; name: string; email: string }>();
    for (const alert of alerts.results) {
      await enqueueNotification({ eventKey: `price-drop:${input.slug}:${input.newPrice}:${alert.member_id}`, entityType: "product", entityId: input.slug, templateKey: "price_drop", email: alert.email, payload: { customer: alert.name, productName: input.name, oldPrice: storedToYuan(input.oldPrice), newPrice: storedToYuan(input.newPrice), productUrl: `${siteUrl}/products/${input.slug}` } });
      await db.prepare("UPDATE member_product_alerts SET last_notified_at = CURRENT_TIMESTAMP WHERE id = ?").bind(alert.id).run();
    }
  }
  if (input.oldStock <= 0 && input.newStock > 0) {
    const alerts = await db.prepare("SELECT a.id, a.member_id, m.name, m.email FROM member_product_alerts a JOIN members m ON m.id = a.member_id WHERE a.product_slug = ? AND a.alert_type = 'restock' AND a.status = 'active' AND m.status != 'blocked'").bind(input.slug).all<{ id: number; member_id: number; name: string; email: string }>();
    for (const alert of alerts.results) {
      await enqueueNotification({ eventKey: `restock:${input.slug}:${input.changeToken}:${alert.member_id}`, entityType: "product", entityId: input.slug, templateKey: "product_restock", email: alert.email, payload: { customer: alert.name, productName: input.name, productUrl: `${siteUrl}/products/${input.slug}` } });
      await db.prepare("UPDATE member_product_alerts SET last_notified_at = CURRENT_TIMESTAMP WHERE id = ?").bind(alert.id).run();
    }
  }
}
