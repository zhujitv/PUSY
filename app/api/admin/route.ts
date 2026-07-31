import { getStoreDb } from "../../../db/store";
import { createAdminPasswordHash, getAdminIdentity, legacyAdminConfigured } from "../../../lib/admin-auth";
import { createPayment, createRefund, paymentProviderState, retryRefund, syncPayment, syncRefund } from "../../../lib/payments/service";
import type { PaymentProviderName } from "../../../lib/payments/types";
import { notificationChannelState, processDueNotifications, processNotificationJob } from "../../../lib/notifications/service";
import { chinaComplianceReady, chinaRegion } from "../../../lib/china-region";
import { deleteContentRevision, ensureCommerceFeatureSchema, getContentWorkspace, publishContentRevision, saveContentRevision } from "../../../db/commerce-features";
import { hasTrustedOrigin, safeServerError } from "../../../lib/request-security";
import { ensureLinkedSupportThread, recordReturnStatusChange, sendSupportReply, supportReceivingDomain } from "../../../lib/support/service";
import { adminActionPermissions, roleCan, validAdminRole, type AdminPermission } from "../../../lib/admin-permissions";
import { auditEntityId, auditSummary, completeAdminAudit, recordAdminAudit } from "../../../lib/admin-governance";
import { adjustMemberPoints } from "../../../lib/growth/loyalty";
import { notifyProductChange, runGrowthAutomations } from "../../../lib/growth/automations";
import { addShipmentEvent, shipOrder } from "../../../lib/logistics/service";
import { cancelOrder } from "../../../lib/orders/cancellation";
import { paymentReconciliation } from "../../../lib/payments/reconciliation";

const orderStatuses = ["待付款", "支付失败", "待处理", "已确认", "配货中", "已发货", "已完成", "退款中", "部分退款", "已退款", "已取消"];
const memberStatuses = ["active", "vip", "blocked"];
const returnStatuses = ["待审核", "已批准", "补发处理中", "退款中", "已退款", "已拒绝", "已关闭"];
const supportStatuses = ["unread", "open", "pending", "resolved"];
const supportPriorities = ["low", "normal", "high", "urgent"];
const invoiceStatuses = ["pending", "processing", "issued", "rejected", "cancelled"];
const supportOperations = ["mark-read", "mark-unread", "star", "unstar", "archive", "unarchive", "trash", "restore", "delete-permanent"];
const partnershipStatuses = ["待联系", "洽谈中", "已合作", "已拒绝", "已关闭"];
const yuanToStored = (value: unknown) => Math.round(Number(value) / 0.12);
const validImagePath = (value: string) => /^\/(assets|products)\/[A-Za-z0-9_./-]+$/.test(value) || /^https:\/\/avatars\.mds\.yandex\.net\/get-yastore\//.test(value);
const normalizeManagedSlug = (value: unknown) => String(value ?? "").trim().toLowerCase().replace(/[^a-z0-9-]+/g, "-").replace(/^-+|-+$/g, "").slice(0, 80);
const createManagedSlug = (value: unknown, prefix: "category" | "product") => normalizeManagedSlug(value) || `${prefix}-${crypto.randomUUID().replaceAll("-", "").slice(0, 12)}`;

export async function GET(request: Request) {
  try {
    const actor = await getAdminIdentity();
    if (!actor) return Response.json({ error: "请先登录管理后台" }, { status: 401 });
    await ensureCommerceFeatureSchema();
    const db = await getStoreDb();
    const can = (permission: AdminPermission) => roleCan(actor.role, permission);
    const supportVisible = can("support.read");
    const financeVisible = can("finance.read");
    const marketingVisible = can("marketing.read") || can("marketing.manage");
    const requestedView = new URL(request.url).searchParams.get("view") ?? "";
    const view = requestedView || (actor.role === "customer_service" ? "support" : actor.role === "warehouse" ? "orders" : "overview");
    const wants = (...views: string[]) => views.includes(view);
    const rowsIf = (visible: boolean, sql: string) => visible ? db.prepare(sql).all() : Promise.resolve({ results: [] });
    const firstIf = (visible: boolean, sql: string) => visible ? db.prepare(sql).first() : Promise.resolve(null);
    const [products, productCategories, orders, orderItems, members, subscribers, returns, retailPartnerships, coupons, giftCards, stats, revenueTrend, providers, payments, refunds, paymentEvents, notificationSettings, notificationTemplates, notificationJobs, reviews, content, supportThreads, supportMessages, returnEvents, invoices, cannedReplies, orderStatusAnalytics, topProducts, customerAnalytics, returnAnalytics, adminUsers, auditLogs, shipments, shipmentEvents, reconciliation] = await Promise.all([
      rowsIf(can("products.read") && wants("products"), "SELECT * FROM products ORDER BY id DESC"),
      rowsIf(can("products.read") && wants("products"), "SELECT c.*, parent.name AS parent_name, COUNT(p.id)::INTEGER AS product_count FROM product_categories c LEFT JOIN product_categories parent ON parent.id = c.parent_id LEFT JOIN products p ON p.category_id = c.id GROUP BY c.id, parent.name ORDER BY c.sort_order, c.id"),
      rowsIf(can("orders.read") && wants("overview", "orders", "members"), "SELECT o.*, COUNT(oi.id) AS item_count, COALESCE(BOOL_OR(NOT (oi.product_slug ~ '^gift-card-(1000|3000|5000|10000)(-[0-9]+)?$')), false) AS has_physical_items FROM orders o LEFT JOIN order_items oi ON oi.order_id = o.id GROUP BY o.id ORDER BY o.created_at DESC LIMIT 200"),
      rowsIf(can("orders.read") && wants("overview", "orders", "members"), "SELECT * FROM order_items ORDER BY id DESC LIMIT 1000"),
      rowsIf(can("customers.read") && wants("members"), "SELECT * FROM members ORDER BY joined_at DESC LIMIT 500"),
      rowsIf(marketingVisible && wants("subscribers"), "SELECT * FROM subscribers ORDER BY subscribed_at DESC LIMIT 1000"),
      rowsIf(supportVisible && wants("returns"), "SELECT * FROM returns ORDER BY created_at DESC LIMIT 500"),
      rowsIf(marketingVisible && wants("partnerships"), "SELECT * FROM retail_partnerships ORDER BY created_at DESC LIMIT 1000"),
      rowsIf(marketingVisible && wants("marketing"), "SELECT * FROM coupons ORDER BY created_at DESC LIMIT 500"),
      rowsIf(marketingVisible && wants("marketing"), "SELECT * FROM gift_cards ORDER BY created_at DESC LIMIT 500"),
      firstIf(can("dashboard.read") && wants("overview"), "WITH refund_totals AS (SELECT order_id, ROUND(SUM(amount_fen) / 12.0)::INTEGER AS refunded FROM refunds WHERE status = 'succeeded' GROUP BY order_id) SELECT COUNT(*) AS order_count, COALESCE(SUM(CASE WHEN o.status NOT IN ('待付款','支付失败','已取消','已退款') THEN GREATEST(o.total - COALESCE(rt.refunded, 0), 0) ELSE 0 END), 0) AS revenue, COUNT(*) FILTER (WHERE o.status IN ('待处理','已确认','配货中','已发货','退款中')) AS pending_count, COALESCE(AVG(CASE WHEN o.status NOT IN ('待付款','支付失败','已取消','已退款') THEN GREATEST(o.total - COALESCE(rt.refunded, 0), 0) END), 0) AS avg_order_value, (SELECT COUNT(*) FROM products WHERE status = 'active' AND inventory_verified = 1 AND stock <= low_stock_threshold) AS low_stock_count, (SELECT COUNT(*) FROM products WHERE status = 'active' AND inventory_verified = 0) AS unverified_inventory_count, (SELECT COUNT(*) FROM subscribers WHERE status = 'active') AS active_subscribers, (SELECT COUNT(*) FROM returns WHERE status = '待审核') AS pending_returns, (SELECT COUNT(*) FROM retail_partnerships WHERE status = '待联系') AS pending_partnerships FROM orders o LEFT JOIN refund_totals rt ON rt.order_id = o.id"),
      rowsIf(can("dashboard.read") && wants("overview"), "WITH refund_totals AS (SELECT order_id, ROUND(SUM(amount_fen) / 12.0)::INTEGER AS refunded FROM refunds WHERE status = 'succeeded' GROUP BY order_id) SELECT substr(o.created_at, 1, 10) AS day, COALESCE(SUM(GREATEST(o.total - COALESCE(rt.refunded, 0), 0)), 0) AS revenue, COUNT(*) AS orders FROM orders o LEFT JOIN refund_totals rt ON rt.order_id = o.id WHERE o.created_at::timestamp >= CURRENT_TIMESTAMP - INTERVAL '29 days' AND o.status NOT IN ('待付款','支付失败','已取消','已退款') GROUP BY substr(o.created_at, 1, 10) ORDER BY day"),
      financeVisible && wants("payments", "settings") ? paymentProviderState() : Promise.resolve([]),
      rowsIf(financeVisible && wants("payments"), "SELECT p.*, o.customer, o.email FROM payments p JOIN orders o ON o.id = p.order_id ORDER BY p.created_at DESC LIMIT 500"),
      rowsIf(financeVisible && wants("payments"), "SELECT r.*, p.merchant_trade_no FROM refunds r JOIN payments p ON p.id = r.payment_id ORDER BY r.created_at DESC LIMIT 500"),
      rowsIf(financeVisible && wants("payments"), "SELECT * FROM payment_events ORDER BY created_at DESC LIMIT 200"),
      can("system.manage") && wants("notifications") ? notificationChannelState() : Promise.resolve([]),
      rowsIf(can("system.manage") && wants("notifications"), "SELECT * FROM notification_templates ORDER BY key"),
      rowsIf(can("system.manage") && wants("notifications"), "SELECT * FROM notification_jobs ORDER BY created_at DESC LIMIT 500"),
      rowsIf(marketingVisible && wants("reviews"), "SELECT * FROM product_reviews ORDER BY created_at DESC LIMIT 500"),
      can("content.manage") && wants("content") ? getContentWorkspace() : Promise.resolve({ current: {}, revisions: [] }),
      rowsIf(supportVisible && wants("support", "orders"), "SELECT st.*, m.name AS member_name, o.status AS order_status, r.status AS return_status FROM support_threads st LEFT JOIN members m ON m.id = st.member_id LEFT JOIN orders o ON o.id = st.order_id LEFT JOIN returns r ON r.id = st.return_id ORDER BY st.last_message_at DESC LIMIT 500"),
      rowsIf(supportVisible && wants("support"), "SELECT * FROM (SELECT id, thread_id, direction, source, provider_email_id, from_email, to_email, subject, text_body, attachments_json, created_at FROM support_messages ORDER BY created_at DESC LIMIT 1000) recent ORDER BY created_at ASC"),
      rowsIf(supportVisible && wants("support"), "SELECT * FROM (SELECT * FROM return_events ORDER BY created_at DESC LIMIT 1000) recent ORDER BY created_at ASC"),
      rowsIf(financeVisible && wants("invoices"), "SELECT i.*, o.customer, o.email AS customer_email FROM invoices i JOIN orders o ON o.id = i.order_id ORDER BY i.requested_at DESC LIMIT 500"),
      rowsIf(supportVisible && wants("support"), "SELECT * FROM support_canned_replies ORDER BY id"),
      rowsIf(can("analytics.read") && wants("analytics"), "SELECT status, COUNT(*) AS count, COALESCE(SUM(total), 0) AS revenue FROM orders GROUP BY status ORDER BY count DESC"),
      rowsIf(can("analytics.read") && wants("analytics"), "SELECT oi.product_slug, oi.product_name, SUM(oi.quantity) AS quantity, COALESCE(SUM(oi.quantity * oi.unit_price), 0) AS revenue FROM order_items oi JOIN orders o ON o.id = oi.order_id WHERE o.status NOT IN ('待付款','支付失败','已取消','已退款') GROUP BY oi.product_slug, oi.product_name ORDER BY quantity DESC, revenue DESC LIMIT 10"),
      firstIf(can("analytics.read") && wants("analytics"), "SELECT COUNT(*) FILTER (WHERE joined_at::timestamp >= CURRENT_TIMESTAMP - INTERVAL '30 days') AS new_members_30d, COUNT(*) FILTER (WHERE total_orders > 1) AS repeat_members, COUNT(*) FILTER (WHERE total_orders > 0) AS purchasing_members, COUNT(*) AS total_members FROM members"),
      firstIf(can("analytics.read") && wants("analytics"), "SELECT COUNT(*) AS total_returns, COUNT(*) FILTER (WHERE created_at::timestamp >= CURRENT_TIMESTAMP - INTERVAL '30 days') AS returns_30d, COUNT(*) FILTER (WHERE status IN ('已退款','退款中')) AS refund_returns FROM returns"),
      rowsIf(can("admins.manage") && wants("admins"), "SELECT id, email, display_name, role, status, last_login_at, created_at, updated_at FROM admin_users ORDER BY created_at DESC LIMIT 200"),
      rowsIf(can("audit.read") && wants("audit"), "SELECT id, admin_id, actor_email, actor_role, action, entity_id, summary, request_ip, outcome, error_text, completed_at, created_at FROM admin_audit_logs ORDER BY created_at DESC LIMIT 1000"),
      rowsIf(can("orders.read") && wants("orders"), "SELECT * FROM shipments ORDER BY shipped_at DESC LIMIT 500"),
      rowsIf(can("orders.read") && wants("orders"), "SELECT * FROM shipment_events ORDER BY event_time DESC LIMIT 1000"),
      financeVisible && wants("payments") ? paymentReconciliation() : Promise.resolve({ items: [], summary: { paymentCount: 0, paidFen: 0, refundedFen: 0, netFen: 0, anomalyCount: 0 } }),
    ]);
    const statValues = stats && typeof stats === "object" ? stats : {};
    const [growthMembers, growthTags, growthSegments, couponAssignments, automationRuns, growthStats] = marketingVisible && wants("growth") ? await Promise.all([
      db.prepare(`SELECT m.id, m.name, m.email, m.phone, m.status, m.total_orders, m.total_spent, m.points_balance, m.lifetime_points, m.tier,
        COALESCE(string_agg(DISTINCT t.name, ', '), '') AS tags, COALESCE(string_agg(DISTINCT t.id::text, ','), '') AS tag_ids,
        COALESCE(mp.email_marketing, 0) AS email_marketing, COALESCE(mp.sms_marketing, 0) AS sms_marketing
        FROM members m LEFT JOIN member_profiles mp ON mp.member_id = m.id
        LEFT JOIN member_tag_assignments mta ON mta.member_id = m.id LEFT JOIN customer_tags t ON t.id = mta.tag_id
        GROUP BY m.id, mp.email_marketing, mp.sms_marketing ORDER BY m.lifetime_points DESC, m.joined_at DESC LIMIT 1000`).all(),
      db.prepare("SELECT t.*, COUNT(mta.member_id)::INTEGER AS member_count FROM customer_tags t LEFT JOIN member_tag_assignments mta ON mta.tag_id = t.id GROUP BY t.id ORDER BY t.name").all(),
      db.prepare("SELECT * FROM customer_segments ORDER BY updated_at DESC LIMIT 200").all(),
      db.prepare("SELECT ca.*, c.code, m.name AS member_name, m.email FROM coupon_assignments ca JOIN coupons c ON c.id = ca.coupon_id JOIN members m ON m.id = ca.member_id ORDER BY ca.assigned_at DESC LIMIT 500").all(),
      db.prepare("SELECT * FROM growth_automation_runs ORDER BY started_at DESC LIMIT 100").all(),
      db.prepare("SELECT COUNT(*)::INTEGER AS total_members, COUNT(*) FILTER (WHERE tier = 'silver')::INTEGER AS silver_members, COUNT(*) FILTER (WHERE tier = 'gold')::INTEGER AS gold_members, COUNT(*) FILTER (WHERE tier = 'diamond')::INTEGER AS diamond_members, COALESCE(SUM(points_balance), 0)::INTEGER AS points_outstanding FROM members").first(),
    ]) : [{ results: [] }, { results: [] }, { results: [] }, { results: [] }, { results: [] }, {}];
    return Response.json({
      viewer: actor,
      products: can("products.read") ? products.results : [],
      productCategories: can("products.read") ? productCategories.results : [],
      orders: can("orders.read") ? orders.results : [],
      orderItems: can("orders.read") ? orderItems.results : [],
      members: can("customers.read") ? members.results : [],
      subscribers: marketingVisible ? subscribers.results : [],
      returns: supportVisible ? returns.results : [],
      retailPartnerships: marketingVisible ? retailPartnerships.results : [],
      coupons: marketingVisible ? coupons.results : [],
      giftCards: marketingVisible ? giftCards.results : [],
      stats: can("dashboard.read") ? { ...statValues, unread_support: supportVisible ? supportThreads.results.filter((item) => { const thread = item as { status?: string; archived_at?: string | null; deleted_at?: string | null }; return thread.status === "unread" && !thread.archived_at && !thread.deleted_at; }).length : 0 } : {},
      revenueTrend: can("dashboard.read") ? revenueTrend.results : [],
      providers: financeVisible ? providers : [],
      payments: financeVisible ? payments.results : [],
      refunds: financeVisible ? refunds.results : [],
      paymentEvents: financeVisible ? paymentEvents.results : [],
      notificationSettings: can("system.manage") ? notificationSettings : [],
      notificationTemplates: can("system.manage") ? notificationTemplates.results : [],
      notificationJobs: can("system.manage") ? notificationJobs.results : [],
      reviews: marketingVisible ? reviews.results : [],
      content: can("content.manage") ? content.current : {},
      contentRevisions: can("content.manage") ? content.revisions : [],
      supportThreads: supportVisible ? supportThreads.results : [],
      supportMessages: supportVisible ? supportMessages.results : [],
      returnEvents: supportVisible ? returnEvents.results : [],
      invoices: financeVisible ? invoices.results : [],
      cannedReplies: supportVisible ? cannedReplies.results : [],
      analytics: can("analytics.read") ? { orderStatuses: orderStatusAnalytics.results, topProducts: topProducts.results, customers: customerAnalytics ?? {}, returns: returnAnalytics ?? {} } : { orderStatuses: [], topProducts: [], customers: {}, returns: {} },
      supportReceiving: supportVisible ? { domain: supportReceivingDomain(), configured: Boolean(supportReceivingDomain() && process.env.RESEND_API_KEY && process.env.RESEND_RECEIVING_API_KEY && process.env.RESEND_WEBHOOK_SECRET) } : { domain: "", configured: false },
      region: can("system.manage") ? { ...chinaRegion, complianceReady: chinaComplianceReady } : {},
      adminUsers: can("admins.manage") ? [...(legacyAdminConfigured() ? [{ id: "legacy-owner", email: (process.env.ADMIN_EMAIL || "admin@pusy.cn").trim().toLowerCase(), display_name: "主管理员", role: "owner", status: "active", last_login_at: null, created_at: "", updated_at: "" }] : []), ...adminUsers.results] : [],
      auditLogs: can("audit.read") ? auditLogs.results : [],
      shipments: can("orders.read") ? shipments.results : [],
      shipmentEvents: can("orders.read") ? shipmentEvents.results : [],
      reconciliation: financeVisible ? reconciliation : { items: [], summary: {} },
      growth: marketingVisible ? { members: growthMembers.results, tags: growthTags.results, segments: growthSegments.results, couponAssignments: couponAssignments.results, automationRuns: automationRuns.results, stats: growthStats ?? {} } : { members: [], tags: [], segments: [], couponAssignments: [], automationRuns: [], stats: {} },
    }, { headers: { "cache-control": "private, no-store" } });
  } catch (error) {
    console.error("[api/admin] read failed", { message: error instanceof Error ? error.message : String(error), code: typeof error === "object" && error && "code" in error ? String(error.code) : undefined });
    return safeServerError("读取后台数据失败，请稍后再试");
  }
}

export async function POST(request: Request) {
  let auditId: number | null = null;
  let auditCompleted = false;
  try {
    const actor = await getAdminIdentity();
    if (!actor) return Response.json({ error: "请先登录管理后台" }, { status: 401 });
    if (!hasTrustedOrigin(request)) return Response.json({ error: "请求来源无效" }, { status: 403 });
    const payload = await request.json() as Record<string, unknown>;
    const action = String(payload.action ?? "");
    const requiredPermission = adminActionPermissions[action];
    if (!requiredPermission) return Response.json({ error: "未知操作" }, { status: 400 });
    if (!roleCan(actor.role, requiredPermission)) return Response.json({ error: "当前账号没有执行此操作的权限" }, { status: 403 });
    await ensureCommerceFeatureSchema();
    const db = await getStoreDb();
    auditId = await recordAdminAudit({ request, actor, action, entityId: auditEntityId(payload), summary: auditSummary(action, payload) });
    if (action === "create-admin-user") {
      const email = String(payload.email ?? "").trim().toLowerCase().slice(0, 160);
      const displayName = String(payload.displayName ?? "").trim().slice(0, 80);
      const role = String(payload.role ?? "");
      const password = String(payload.password ?? "");
      if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) || !displayName || !validAdminRole(role)) return Response.json({ error: "请填写有效的员工账号、姓名和角色" }, { status: 400 });
      if (legacyAdminConfigured() && email === (process.env.ADMIN_EMAIL || "admin@pusy.cn").trim().toLowerCase()) return Response.json({ error: "该邮箱已由服务器主管理员使用" }, { status: 409 });
      const credentials = await createAdminPasswordHash(password);
      const id = `ADM-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`;
      await db.prepare("INSERT INTO admin_users (id, email, display_name, role, password_hash, password_salt) VALUES (?, ?, ?, ?, ?, ?)").bind(id, email, displayName, role, credentials.hash, credentials.salt).run();
      payload.id = id;
    } else if (action === "update-admin-user") {
      const id = String(payload.id ?? "");
      const role = String(payload.role ?? "");
      const status = String(payload.status ?? "");
      if (!/^ADM-[A-Z0-9]{12}$/.test(id) || !validAdminRole(role) || !["active", "disabled"].includes(status)) return Response.json({ error: "管理员账号信息无效" }, { status: 400 });
      if (id === actor.id && (role !== "owner" || status !== "active")) return Response.json({ error: "不能降级或停用当前登录账号" }, { status: 409 });
      const result = await db.prepare("UPDATE admin_users SET role = ?, status = ?, session_version = session_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(role, status, id).run();
      if (!result.meta.changes) return Response.json({ error: "管理员账号不存在" }, { status: 404 });
    } else if (action === "reset-admin-password") {
      const id = String(payload.id ?? "");
      if (!/^ADM-[A-Z0-9]{12}$/.test(id)) return Response.json({ error: "管理员账号信息无效" }, { status: 400 });
      const credentials = await createAdminPasswordHash(String(payload.password ?? ""));
      const result = await db.prepare("UPDATE admin_users SET password_hash = ?, password_salt = ?, session_version = session_version + 1, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(credentials.hash, credentials.salt, id).run();
      if (!result.meta.changes) return Response.json({ error: "管理员账号不存在" }, { status: 404 });
    } else if (action === "create-product-category" || action === "update-product-category") {
      const id = Number(payload.id);
      const name = String(payload.name ?? "").trim().slice(0, 60);
      const description = String(payload.description ?? "").trim().slice(0, 500);
      const sortOrder = Math.min(9999, Math.max(0, Math.round(Number(payload.sortOrder ?? 0))));
      const status = String(payload.status ?? "active");
      const parentId = payload.parentId ? Number(payload.parentId) : null;
      if (!name || !Number.isFinite(sortOrder) || !["active", "disabled"].includes(status)) return Response.json({ error: "请完整填写分类名称和状态" }, { status: 400 });
      if (action === "update-product-category" && (!Number.isInteger(id) || id < 1)) return Response.json({ error: "分类编号无效" }, { status: 400 });
      if (parentId && (!Number.isInteger(parentId) || parentId < 1 || parentId === id)) return Response.json({ error: "上级分类无效" }, { status: 400 });
      const previous = action === "update-product-category" ? await db.prepare("SELECT name, slug FROM product_categories WHERE id = ? LIMIT 1").bind(id).first<{ name: string; slug: string }>() : null;
      if (action === "update-product-category" && !previous) return Response.json({ error: "分类不存在" }, { status: 404 });
      const duplicate = await db.prepare("SELECT id FROM product_categories WHERE name = ? AND id <> ? LIMIT 1").bind(name, action === "update-product-category" ? id : 0).first();
      if (duplicate) return Response.json({ error: "分类名称已存在" }, { status: 409 });
      if (parentId) {
        const parent = await db.prepare("SELECT id FROM product_categories WHERE id = ? LIMIT 1").bind(parentId).first();
        if (!parent) return Response.json({ error: "上级分类不存在" }, { status: 400 });
        if (action === "update-product-category") {
          const descendant = await db.prepare("WITH RECURSIVE descendants AS (SELECT id FROM product_categories WHERE parent_id = ? UNION ALL SELECT c.id FROM product_categories c JOIN descendants d ON c.parent_id = d.id) SELECT id FROM descendants WHERE id = ? LIMIT 1").bind(id, parentId).first();
          if (descendant) return Response.json({ error: "不能把分类移动到自己的下级分类中" }, { status: 409 });
        }
      }
      if (action === "create-product-category") {
        const slug = createManagedSlug(name, "category");
        const created = await db.prepare("INSERT INTO product_categories (name, slug, parent_id, description, sort_order, status) VALUES (?, ?, ?, ?, ?, ?) RETURNING id").bind(name, slug, parentId, description, sortOrder, status).first<{ id: number }>();
        payload.id = created?.id ?? "";
      } else {
        await db.batch([
          db.prepare("UPDATE product_categories SET name = ?, parent_id = ?, description = ?, sort_order = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(name, parentId, description, sortOrder, status, id).requireChanges("分类不存在"),
          db.prepare("UPDATE products SET category = ?, category_id = ?, updated_at = CURRENT_TIMESTAMP WHERE category_id = ? OR (category_id IS NULL AND category = ?)").bind(name, id, id, previous?.name ?? name),
        ]);
      }
    } else if (action === "delete-product-category") {
      const id = Number(payload.id);
      if (!Number.isInteger(id) || id < 1) return Response.json({ error: "分类编号无效" }, { status: 400 });
      const usage = await db.prepare("SELECT (SELECT COUNT(*) FROM products WHERE category_id = ?)::INTEGER AS product_count, (SELECT COUNT(*) FROM product_categories WHERE parent_id = ?)::INTEGER AS child_count").bind(id, id).first<{ product_count: number; child_count: number }>();
      if ((usage?.product_count ?? 0) > 0) return Response.json({ error: "该分类仍有关联商品，请先调整商品分类或停用分类" }, { status: 409 });
      if ((usage?.child_count ?? 0) > 0) return Response.json({ error: "该分类仍有下级分类，请先调整下级分类" }, { status: 409 });
      await db.prepare("DELETE FROM product_categories WHERE id = ?").bind(id).requireChanges("分类不存在").run();
    } else if (action === "bulk-import-products") {
      const items = Array.isArray(payload.products) ? payload.products.slice(0, 200) as Record<string, unknown>[] : [];
      if (!items.length) return Response.json({ error: "没有可导入的商品" }, { status: 400 });
      const statements = [];
      const categoryRows = await db.prepare("SELECT id, name FROM product_categories WHERE status = 'active'").all<{ id: number; name: string }>();
      const categoryIds = new Map(categoryRows.results.map((category) => [category.name, category.id]));
      for (const item of items) {
        const name = String(item.name ?? "").trim();
        const slug = createManagedSlug(item.slug || `${String(item.sku ?? "")} ${name}`, "product");
        const category = String(item.category ?? "").trim();
        const categoryId = categoryIds.get(category);
        const image = String(item.image ?? "").trim();
        const price = yuanToStored(item.price);
        if (!slug || !name || !categoryId || !validImagePath(image) || !Number.isFinite(price)) return Response.json({ error: `商品 ${name || slug || "未知"} 的必填信息、分类或图片地址无效` }, { status: 400 });
        statements.push(db.prepare("INSERT INTO products (slug, name, category, category_id, description, image, image_alt, badge, price, old_price, stock, inventory_verified, sku, volume, ingredients, usage, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?) ON CONFLICT(slug) DO UPDATE SET name = excluded.name, category = excluded.category, category_id = excluded.category_id, description = excluded.description, image = excluded.image, image_alt = excluded.image_alt, badge = excluded.badge, price = excluded.price, old_price = excluded.old_price, stock = excluded.stock, inventory_verified = excluded.inventory_verified, sku = excluded.sku, volume = excluded.volume, ingredients = excluded.ingredients, usage = excluded.usage, status = excluded.status, updated_at = CURRENT_TIMESTAMP").bind(slug, name, category, categoryId, String(item.description ?? ""), image, String(item.imageAlt ?? "") || null, String(item.badge ?? "") || null, price, item.oldPrice ? yuanToStored(item.oldPrice) : null, Math.max(0, Math.round(Number(item.stock ?? 0))), item.inventoryVerified ? 1 : 0, String(item.sku ?? "") || null, String(item.volume ?? "") || null, String(item.ingredients ?? "") || null, String(item.usage ?? "") || null, String(item.status ?? "active")));
      }
      await db.batch(statements);
      await completeAdminAudit(auditId, "succeeded");
      auditCompleted = true;
      return Response.json({ ok: true, imported: statements.length });
    } else if (action === "create-product" || action === "update-product") {
      const name = String(payload.name ?? "").trim();
      const categoryId = Number(payload.categoryId);
      const categoryRow = Number.isInteger(categoryId) && categoryId > 0 ? await db.prepare("SELECT id, name, status FROM product_categories WHERE id = ? LIMIT 1").bind(categoryId).first<{ id: number; name: string; status: string }>() : null;
      const currentProduct = action === "update-product" ? await db.prepare("SELECT slug, name, price, stock, category_id FROM products WHERE id = ? LIMIT 1").bind(Number(payload.id)).first<{ slug: string; name: string; price: number; stock: number; category_id: number | null }>() : null;
      let slug = currentProduct?.slug ?? createManagedSlug(`${String(payload.sku ?? "")} ${name}`, "product");
      if (action === "create-product") {
        const slugExists = await db.prepare("SELECT id FROM products WHERE slug = ? LIMIT 1").bind(slug).first();
        if (slugExists) slug = `${slug.slice(0, 72)}-${crypto.randomUUID().replaceAll("-", "").slice(0, 7)}`;
      }
      const category = categoryRow?.name ?? "";
      const image = String(payload.image ?? "").trim();
      const price = yuanToStored(payload.price);
      const categoryAllowed = categoryRow && (categoryRow.status === "active" || currentProduct?.category_id === categoryRow.id);
      if (!name || !slug || !categoryAllowed || !validImagePath(image) || !Number.isFinite(price) || price < 0) return Response.json({ error: "请完整填写商品信息，选择已启用分类，并使用站内图片或允许的历史图片地址" }, { status: 400 });
      const stock = Math.max(0, Math.round(Number(payload.stock ?? 0)));
      const values = [slug, name, category, categoryId, String(payload.description ?? ""), image, String(payload.imageAlt ?? "") || null, String(payload.badge ?? "") || null, price, payload.oldPrice ? yuanToStored(payload.oldPrice) : null, stock, Math.max(0, Math.round(Number(payload.lowStockThreshold ?? 10))), payload.inventoryVerified ? 1 : 0, String(payload.sku ?? "") || null, String(payload.volume ?? "") || null, String(payload.ingredients ?? "") || null, String(payload.usage ?? "") || null, String(payload.status ?? "active")];
      if (action === "create-product") await db.prepare("INSERT INTO products (slug, name, category, category_id, description, image, image_alt, badge, price, old_price, stock, low_stock_threshold, inventory_verified, sku, volume, ingredients, usage, status) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)").bind(...values).run();
      else {
        await db.prepare("UPDATE products SET slug = ?, name = ?, category = ?, category_id = ?, description = ?, image = ?, image_alt = ?, badge = ?, price = ?, old_price = ?, stock = ?, low_stock_threshold = ?, inventory_verified = ?, sku = ?, volume = ?, ingredients = ?, usage = ?, status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(...values, Number(payload.id)).run();
        if (currentProduct) await notifyProductChange({ slug, name, oldPrice: currentProduct.price, newPrice: price, oldStock: currentProduct.stock, newStock: stock, changeToken: crypto.randomUUID() }).catch(() => undefined);
      }
    } else if (action === "archive-product") {
      await db.prepare("UPDATE products SET status = 'archived', updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(Number(payload.id)).run();
    } else if (action === "update-product-inventory") {
      const id = Number(payload.id);
      const stock = Math.max(0, Math.round(Number(payload.stock ?? 0)));
      const lowStockThreshold = Math.max(0, Math.round(Number(payload.lowStockThreshold ?? 10)));
      if (!Number.isInteger(id) || id < 1 || !Number.isFinite(stock)) return Response.json({ error: "商品库存信息无效" }, { status: 400 });
      const previous = await db.prepare("SELECT slug, name, price, stock FROM products WHERE id = ? LIMIT 1").bind(id).first<{ slug: string; name: string; price: number; stock: number }>();
      const result = await db.prepare("UPDATE products SET stock = ?, low_stock_threshold = ?, inventory_verified = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(stock, lowStockThreshold, payload.inventoryVerified ? 1 : 0, id).run();
      if (!result.meta.changes) return Response.json({ error: "商品不存在" }, { status: 404 });
      if (previous) {
        const referenceId = `admin:${crypto.randomUUID()}`;
        await db.prepare("INSERT INTO inventory_movements (product_slug, movement_type, quantity, stock_after, reference_id, actor) VALUES (?, 'adjust', ?, ?, ?, ?)").bind(previous.slug, stock - previous.stock, stock, referenceId, actor.email).run();
        await notifyProductChange({ slug: previous.slug, name: previous.name, oldPrice: previous.price, newPrice: previous.price, oldStock: previous.stock, newStock: stock, changeToken: crypto.randomUUID() }).catch(() => undefined);
      }
    } else if (action === "bulk-update-order-status") {
      const ids = [...new Set((Array.isArray(payload.ids) ? payload.ids : []).map((id) => String(id)).filter((id) => /^PUSY-[A-Z0-9-]{8,64}$/.test(id)))].slice(0, 100);
      const status = String(payload.status ?? "");
      if (!ids.length || !["配货中", "已完成"].includes(status)) return Response.json({ error: "请选择有效订单和批量处理状态；发货必须逐单填写物流单号" }, { status: 400 });
      for (const id of ids) {
        const order = await db.prepare("SELECT resources_committed FROM orders WHERE id = ? LIMIT 1").bind(id).first<{ resources_committed: number }>();
        const payment = await db.prepare("SELECT status FROM payments WHERE order_id = ? AND status IN ('paid','partially_refunded') ORDER BY created_at DESC LIMIT 1").bind(id).first<{ status: string }>();
        if (!order || !order.resources_committed || !payment) return Response.json({ error: `订单 ${id} 尚未完成付款，不能批量进入履约状态` }, { status: 409 });
      }
      await db.batch(ids.map((id) => db.prepare("UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(status, id)));
    } else if (action === "ship-order") {
      await shipOrder({ orderId: String(payload.orderId ?? ""), carrierCode: String(payload.carrierCode ?? ""), trackingNumber: String(payload.trackingNumber ?? ""), actor: actor.email });
    } else if (action === "add-shipment-event") {
      await addShipmentEvent({ shipmentId: String(payload.shipmentId ?? ""), status: String(payload.status ?? ""), description: String(payload.description ?? ""), location: String(payload.location ?? ""), actor: actor.email });
    } else if (action === "cancel-order") {
      await cancelOrder({ orderId: String(payload.orderId ?? ""), reason: String(payload.reason ?? "后台取消订单"), origin: new URL(request.url).origin });
    } else if (action === "update-order-status") {
      const status = String(payload.status ?? "");
      if (!orderStatuses.includes(status)) return Response.json({ error: "订单状态无效" }, { status: 400 });
      if (!roleCan(actor.role, "orders.manage") && !["配货中", "已发货", "已完成"].includes(status)) return Response.json({ error: "仓库账号只能更新订单履约状态" }, { status: 403 });
      const orderId = String(payload.id ?? "");
      const order = await db.prepare("SELECT id, status, resources_committed, resources_released FROM orders WHERE id = ? LIMIT 1").bind(orderId).first<{ id: string; status: string; resources_committed: number; resources_released: number }>();
      if (!order) return Response.json({ error: "订单不存在" }, { status: 404 });
      const payment = await db.prepare("SELECT status FROM payments WHERE order_id = ? AND status IN ('paid','partially_refunded','refunding','refunded') ORDER BY created_at DESC LIMIT 1").bind(orderId).first<{ status: string }>();
      const financiallySettled = Boolean(payment);
      const fulfillable = Boolean(payment && ["paid", "partially_refunded"].includes(payment.status));
      if (["待付款", "支付失败", "已确认", "退款中", "部分退款", "已退款"].includes(status) && status !== order.status) return Response.json({ error: "该状态由支付与退款系统自动维护" }, { status: 409 });
      if (status === "已发货") return Response.json({ error: "请使用发货操作填写物流公司和单号" }, { status: 409 });
      if (status === "已取消") {
        if (financiallySettled || order.resources_committed) return Response.json({ error: "已支付订单不能直接取消，请通过退款流程处理" }, { status: 409 });
        await cancelOrder({ orderId, reason: String(payload.reason ?? "后台取消未付款订单"), origin: new URL(request.url).origin });
        await completeAdminAudit(auditId, "succeeded");
        auditCompleted = true;
        return Response.json({ ok: true });
      }
      if (["配货中", "已发货", "已完成"].includes(status) && (!fulfillable || !order.resources_committed)) return Response.json({ error: "订单尚未完成付款，不能进入履约状态" }, { status: 409 });
      await db.prepare("UPDATE orders SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(status, orderId).run();
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
      if (["退款中", "已退款"].includes(status)) return Response.json({ error: "退款状态只能由真实退款流程更新" }, { status: 409 });
      await recordReturnStatusChange({ returnId: String(payload.id), status, actor: actor.email, note: String(payload.note ?? "").trim().slice(0, 1000) });
    } else if (action === "update-return-logistics") {
      const carrier = String(payload.carrier ?? "").trim().slice(0, 60);
      const trackingNumber = String(payload.trackingNumber ?? "").trim().replace(/\s+/g, "").slice(0, 64);
      if (!carrier || !/^[A-Za-z0-9-]{5,64}$/.test(trackingNumber)) return Response.json({ error: "请填写有效退回物流公司和单号" }, { status: 400 });
      const result = await db.prepare("UPDATE returns SET return_carrier = ?, return_tracking_number = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(carrier, trackingNumber, String(payload.id ?? "")).run();
      if (!result.meta.changes) return Response.json({ error: "售后申请不存在" }, { status: 404 });
    } else if (action === "approve-return-refund") {
      const returnId = String(payload.id ?? "");
      const item = await db.prepare(`SELECT r.id, r.order_id, r.refund_id, p.id AS payment_id, p.amount_fen,
        COALESCE((SELECT SUM(rr.amount_fen) FROM refunds rr WHERE rr.payment_id = p.id AND rr.status IN ('pending','processing','succeeded')), 0) AS refunded_fen
        FROM returns r JOIN payments p ON p.order_id = r.order_id AND p.status IN ('paid','partially_refunded') WHERE r.id = ? ORDER BY p.created_at DESC LIMIT 1`).bind(returnId).first<{ id: string; order_id: string; refund_id: string | null; payment_id: string; amount_fen: number; refunded_fen: number }>();
      if (!item || item.refund_id) return Response.json({ error: item?.refund_id ? "该售后单已经关联退款" : "未找到可退款的支付记录" }, { status: 409 });
      const remaining = Number(item.amount_fen) - Number(item.refunded_fen);
      const requested = payload.amountYuan ? Math.round(Number(payload.amountYuan) * 100) : remaining;
      if (!Number.isInteger(requested) || requested <= 0 || requested > remaining) return Response.json({ error: "退款金额超过可退余额" }, { status: 400 });
      const refund = await createRefund(item.payment_id, requested, `售后单 ${returnId}：${String(payload.reason ?? "审核退款")}`.slice(0, 80), new URL(request.url).origin) as { id?: string } | null;
      await recordReturnStatusChange({ returnId, status: "退款中", actor: actor.email, note: String(payload.reason ?? "审核通过并发起退款") });
      await db.prepare("UPDATE returns SET refund_id = ?, requested_amount_fen = ?, reviewed_at = CURRENT_TIMESTAMP, resolution = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(refund?.id ?? null, requested, String(payload.reason ?? "审核通过并原路退款").slice(0, 1000), returnId).run();
    } else if (action === "update-support-thread") {
      const status = String(payload.status ?? "");
      const priority = String(payload.priority ?? "normal");
      if (!supportStatuses.includes(status) || !supportPriorities.includes(priority)) return Response.json({ error: "工单状态或优先级无效" }, { status: 400 });
      const dueAt = String(payload.dueAt ?? "").trim();
      if (dueAt && Number.isNaN(Date.parse(dueAt))) return Response.json({ error: "处理时限无效" }, { status: 400 });
      const result = await db.prepare("UPDATE support_threads SET status = ?, priority = ?, assigned_to = ?, due_at = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL").bind(status, priority, String(payload.assignedTo ?? "").trim().slice(0, 120) || null, dueAt || null, String(payload.id)).run();
      if (!result.meta.changes) return Response.json({ error: "客服工单不存在" }, { status: 404 });
    } else if (action === "add-support-note") {
      const threadId = String(payload.id ?? "");
      const note = String(payload.note ?? "").trim().slice(0, 5000);
      if (!note) return Response.json({ error: "请填写内部备注" }, { status: 400 });
      const result = await db.prepare("INSERT INTO support_messages (id, thread_id, direction, source, from_email, to_email, subject, text_body, headers_json) SELECT ?, id, 'system', 'internal_note', ?, customer_email, '内部备注', ?, ? FROM support_threads WHERE id = ? AND deleted_at IS NULL").bind(`MSG-${crypto.randomUUID().replaceAll("-", "").slice(0, 12).toUpperCase()}`, actor.email, note, JSON.stringify({ actor: actor.email }), threadId).run();
      if (!result.meta.changes) return Response.json({ error: "客服工单不存在" }, { status: 404 });
      await db.prepare("UPDATE support_threads SET updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(threadId).run();
    } else if (action === "create-canned-reply") {
      const title = String(payload.title ?? "").trim().slice(0, 80);
      const content = String(payload.content ?? "").trim().slice(0, 5000);
      if (!title || !content) return Response.json({ error: "请填写快捷回复名称和内容" }, { status: 400 });
      await db.prepare("INSERT INTO support_canned_replies (title, content) VALUES (?, ?)").bind(title, content).run();
    } else if (action === "delete-canned-reply") {
      await db.prepare("DELETE FROM support_canned_replies WHERE id = ?").bind(Number(payload.id)).run();
    } else if (action === "manage-support-threads") {
      const operation = String(payload.operation ?? "");
      const ids = [...new Set((Array.isArray(payload.ids) ? payload.ids : []).map((id) => String(id)).filter((id) => /^TKT-[A-Z0-9]{6,32}$/.test(id)))].slice(0, 200);
      if (!supportOperations.includes(operation) || !ids.length) return Response.json({ error: "请选择有效的邮件操作和工单" }, { status: 400 });
      if (operation === "delete-permanent" && payload.confirm !== "DELETE") return Response.json({ error: "永久删除需要再次确认" }, { status: 400 });
      const statements = ids.map((id) => operation === "mark-read"
        ? db.prepare("UPDATE support_threads SET status = CASE WHEN status = 'unread' THEN 'open' ELSE status END, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL").bind(id)
        : operation === "mark-unread"
          ? db.prepare("UPDATE support_threads SET status = 'unread', updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL").bind(id)
          : operation === "star"
            ? db.prepare("UPDATE support_threads SET starred = 1, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL").bind(id)
            : operation === "unstar"
              ? db.prepare("UPDATE support_threads SET starred = 0, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(id)
              : operation === "archive"
                ? db.prepare("UPDATE support_threads SET archived_at = CURRENT_TIMESTAMP, deleted_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(id)
                : operation === "unarchive"
                  ? db.prepare("UPDATE support_threads SET archived_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND deleted_at IS NULL").bind(id)
                  : operation === "trash"
                    ? db.prepare("UPDATE support_threads SET deleted_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(id)
                    : operation === "restore"
                      ? db.prepare("UPDATE support_threads SET deleted_at = NULL, archived_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(id)
                      : db.prepare("DELETE FROM support_threads WHERE id = ? AND deleted_at IS NOT NULL").bind(id));
      await db.batch(statements);
    } else if (action === "reply-support-thread") {
      await sendSupportReply(String(payload.id), String(payload.message ?? ""), actor.email);
    } else if (action === "open-linked-support-thread") {
      const threadId = await ensureLinkedSupportThread({ orderId: String(payload.orderId ?? ""), returnId: String(payload.returnId ?? ""), actor: actor.email });
      payload.id = threadId;
      await completeAdminAudit(auditId, "succeeded");
      auditCompleted = true;
      return Response.json({ ok: true, threadId });
    } else if (action === "update-invoice") {
      const status = String(payload.status ?? "");
      const invoiceNumber = String(payload.invoiceNumber ?? "").trim().slice(0, 100);
      const fileUrl = String(payload.fileUrl ?? "").trim().slice(0, 1000);
      const rejectionReason = String(payload.rejectionReason ?? "").trim().slice(0, 1000);
      const adminNote = String(payload.adminNote ?? "").trim().slice(0, 2000);
      if (!invoiceStatuses.includes(status)) return Response.json({ error: "发票状态无效" }, { status: 400 });
      if (status === "issued" && (!invoiceNumber || !(/^(https:\/\/|\/(?!\/))/.test(fileUrl)))) return Response.json({ error: "已开具发票需要填写发票号码和安全下载地址" }, { status: 400 });
      if (status === "rejected" && !rejectionReason) return Response.json({ error: "请填写驳回原因" }, { status: 400 });
      const result = await db.prepare("UPDATE invoices SET status = ?, invoice_number = ?, file_url = ?, rejection_reason = ?, admin_note = ?, issued_at = CASE WHEN ? = 'issued' THEN COALESCE(issued_at, CURRENT_TIMESTAMP) ELSE issued_at END, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(status, invoiceNumber, fileUrl, rejectionReason, adminNote, status, String(payload.id)).run();
      if (!result.meta.changes) return Response.json({ error: "发票申请不存在" }, { status: 404 });
    } else if (action === "update-retail-partnership-status") {
      const status = String(payload.status ?? "");
      if (!partnershipStatuses.includes(status)) return Response.json({ error: "合作申请状态无效" }, { status: 400 });
      await db.prepare("UPDATE retail_partnerships SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(status, String(payload.id)).run();
    } else if (action === "adjust-member-points") {
      const points = Math.round(Number(payload.points));
      const reason = String(payload.reason ?? "").trim().slice(0, 120);
      if (!Number.isInteger(points) || !points || !reason) return Response.json({ error: "请填写有效的积分数值和调整原因" }, { status: 400 });
      await adjustMemberPoints(Number(payload.memberId), points, reason);
    } else if (action === "create-customer-tag") {
      const name = String(payload.name ?? "").trim().slice(0, 40);
      const color = String(payload.color ?? "#ef398b");
      const description = String(payload.description ?? "").trim().slice(0, 160);
      if (!name || !/^#[0-9a-f]{6}$/i.test(color)) return Response.json({ error: "请填写有效的标签名称和颜色" }, { status: 400 });
      await db.prepare("INSERT INTO customer_tags (name, color, description) VALUES (?, ?, ?)").bind(name, color, description).run();
    } else if (action === "assign-member-tag") {
      const memberId = Number(payload.memberId);
      const tagId = Number(payload.tagId);
      if (!Number.isInteger(memberId) || !Number.isInteger(tagId)) return Response.json({ error: "会员或标签无效" }, { status: 400 });
      if (payload.assigned === false) await db.prepare("DELETE FROM member_tag_assignments WHERE member_id = ? AND tag_id = ?").bind(memberId, tagId).run();
      else await db.prepare("INSERT INTO member_tag_assignments (member_id, tag_id) VALUES (?, ?) ON CONFLICT DO NOTHING").bind(memberId, tagId).run();
    } else if (action === "create-customer-segment") {
      const name = String(payload.name ?? "").trim().slice(0, 60);
      const description = String(payload.description ?? "").trim().slice(0, 200);
      const tier = String(payload.tier ?? "all");
      const tagId = Number(payload.tagId ?? 0);
      const minSpentYuan = Math.max(0, Number(payload.minSpentYuan ?? 0));
      if (!name || !["all", "bronze", "silver", "gold", "diamond"].includes(tier)) return Response.json({ error: "客户分组条件无效" }, { status: 400 });
      await db.prepare("INSERT INTO customer_segments (name, description, filter_json) VALUES (?, ?, ?)").bind(name, description, JSON.stringify({ tier, tagId: tagId || null, minSpent: yuanToStored(minSpentYuan), marketingOnly: true })).run();
    } else if (action === "issue-targeted-coupon") {
      const code = String(payload.code ?? "").trim().toUpperCase().replace(/[^A-Z0-9_-]/g, "");
      const kind = String(payload.kind ?? "percent");
      const value = kind === "fixed" ? yuanToStored(payload.value) : Math.round(Number(payload.value));
      const minimum = Math.max(0, yuanToStored(payload.minimum ?? 0));
      let tier = String(payload.tier ?? "all");
      let tagId = Math.max(0, Number(payload.tagId ?? 0));
      let minimumSpent = 0;
      const segmentId = Math.max(0, Number(payload.segmentId ?? 0));
      if (segmentId) {
        const segment = await db.prepare("SELECT filter_json FROM customer_segments WHERE id = ? LIMIT 1").bind(segmentId).first<{ filter_json: string }>();
        if (!segment) return Response.json({ error: "客户分组不存在" }, { status: 404 });
        const filter = JSON.parse(segment.filter_json) as { tier?: string; tagId?: number | null; minSpent?: number };
        tier = String(filter.tier ?? "all");
        tagId = Math.max(0, Number(filter.tagId ?? 0));
        minimumSpent = Math.max(0, Number(filter.minSpent ?? 0));
      }
      const rawEndsAt = String(payload.endsAt ?? "").trim();
      const endsAt = rawEndsAt && !Number.isNaN(Date.parse(rawEndsAt)) ? new Date(rawEndsAt).toISOString() : null;
      if (rawEndsAt && !endsAt) return Response.json({ error: "优惠券有效期无效" }, { status: 400 });
      if (!code || !["percent", "fixed"].includes(kind) || !Number.isFinite(value) || value <= 0 || (kind === "percent" && value > 100)) return Response.json({ error: "请填写有效的专属优惠券" }, { status: 400 });
      const audience = await db.prepare(`SELECT DISTINCT m.id, m.name, m.email, m.phone, COALESCE(mp.email_marketing, 0) AS email_marketing, COALESCE(mp.sms_marketing, 0) AS sms_marketing
        FROM members m LEFT JOIN member_profiles mp ON mp.member_id = m.id
        LEFT JOIN member_tag_assignments mta ON mta.member_id = m.id
        WHERE m.status != 'blocked' AND (? = 'all' OR m.tier = ?) AND (? = 0 OR mta.tag_id = ?) AND m.total_spent >= ?
        ORDER BY m.id LIMIT 1000`).bind(tier, tier, tagId, tagId, minimumSpent).all<{ id: number; name: string; email: string; phone: string; email_marketing: number; sms_marketing: number }>();
      if (!audience.results.length) return Response.json({ error: "当前定向条件下没有会员" }, { status: 400 });
      const coupon = await db.prepare("INSERT INTO coupons (code, kind, value, minimum, usage_limit, status, assignment_mode, ends_at) VALUES (?, ?, ?, ?, ?, 'active', 'targeted', ?) RETURNING id").bind(code, kind, value, minimum, audience.results.length, endsAt).first<{ id: number }>();
      if (!coupon) throw new Error("专属优惠券创建失败");
      await db.batch(audience.results.map((member) => db.prepare("INSERT INTO coupon_assignments (coupon_id, member_id) VALUES (?, ?)").bind(coupon.id, member.id)));
      const benefit = kind === "percent" ? `${value}% 折扣` : `减 ${Number(payload.value).toFixed(2)} 元`;
      for (const member of audience.results) await (await import("../../../lib/notifications/service")).enqueueNotification({ eventKey: `targeted-coupon:${coupon.id}:${member.id}`, entityType: "member", entityId: String(member.id), templateKey: "targeted_coupon", email: member.email_marketing ? member.email : undefined, phone: member.sms_marketing ? member.phone : undefined, payload: { customer: member.name, couponCode: code, benefit, condition: minimum ? `满 ${Number(payload.minimum).toFixed(2)} 元可用` : "无门槛", endsAt: endsAt ? new Date(endsAt).toLocaleDateString("zh-CN") : "长期有效" } });
    } else if (action === "run-growth-automations") {
      const results = await runGrowthAutomations();
      await completeAdminAudit(auditId, "succeeded");
      auditCompleted = true;
      return Response.json({ ok: true, results });
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
    } else if (action === "update-site-content" || action === "save-content-draft" || action === "schedule-site-content") {
      const content = payload.content && typeof payload.content === "object" ? payload.content as Record<string, unknown> : {};
      await saveContentRevision({ title: String(payload.title ?? "首页内容版本"), content, status: action === "update-site-content" ? "published" : action === "schedule-site-content" ? "scheduled" : "draft", publishAt: String(payload.publishAt ?? ""), actor: actor.email });
    } else if (action === "publish-content-revision") {
      await publishContentRevision(String(payload.id ?? ""), actor.email);
    } else if (action === "delete-content-revision") {
      await deleteContentRevision(String(payload.id ?? ""));
    } else return Response.json({ error: "未知操作" }, { status: 400 });
    await completeAdminAudit(auditId, "succeeded");
    auditCompleted = true;
    return Response.json({ ok: true });
  } catch (error) {
    if (auditId) {
      await completeAdminAudit(auditId, "failed", error instanceof Error ? error.message : String(error)).catch(() => undefined);
      auditCompleted = true;
    }
    const conflict = error instanceof Error && /unique/i.test(error.message);
    console.error("[api/admin] action failed", { message: error instanceof Error ? error.message : String(error), code: typeof error === "object" && error && "code" in error ? String(error.code) : undefined });
    return safeServerError(conflict ? "相同名称、商品编号或邮箱的数据已经存在" : "后台操作失败，请稍后再试", conflict ? 409 : 500);
  } finally {
    if (auditId && !auditCompleted) await completeAdminAudit(auditId, "failed", "请求校验未通过或操作未完成").catch(() => undefined);
  }
}
