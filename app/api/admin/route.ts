import { getStoreDb } from "../../../db/store";
import { getAdminIdentity, legacyAdminConfigured } from "../../../lib/admin-auth";
import { paymentProviderState } from "../../../lib/payments/service";
import { notificationChannelState } from "../../../lib/notifications/service";
import { chinaComplianceReady, chinaRegion } from "../../../lib/china-region";
import { ensureCommerceFeatureSchema, getContentWorkspace } from "../../../db/commerce-features";
import { hasTrustedOrigin, safeServerError } from "../../../lib/request-security";
import { supportReceivingDomain } from "../../../lib/support/service";
import { adminActionPermissions, roleCan, type AdminPermission } from "../../../lib/admin-permissions";
import { auditEntityId, auditSummary, completeAdminAudit, recordAdminAudit } from "../../../lib/admin-governance";
import { paymentReconciliation } from "../../../lib/payments/reconciliation";
import { listCommunityModerationPosts } from "../../../lib/community/moderation";
import { listCommunityReports } from "../../../lib/community/engagement";
import { getCommunityCommerceInsights } from "../../../lib/community/commerce";
import { getCommunityOperationsData } from "../../../lib/community/admin-operations";
import { handleAdminUserAction } from "../../../lib/admin/actions/01-admin-users";
import { handleCatalogProductAction } from "../../../lib/admin/actions/02-catalog-products";
import { handleOrderReturnAction } from "../../../lib/admin/actions/03-orders-returns";
import { handleSupportInvoiceAction } from "../../../lib/admin/actions/04-support-invoices";
import { handleGrowthMarketingAction } from "../../../lib/admin/actions/05-growth-marketing";
import { handlePaymentNotificationAction } from "../../../lib/admin/actions/06-payments-notifications";
import { handleCommunityContentAction } from "../../../lib/admin/actions/07-community-content";

const adminActionHandlers = [
  handleAdminUserAction,
  handleCatalogProductAction,
  handleOrderReturnAction,
  handleSupportInvoiceAction,
  handleGrowthMarketingAction,
  handlePaymentNotificationAction,
  handleCommunityContentAction,
];

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
    const communityVisible = can("community.read");
    const requestedView = new URL(request.url).searchParams.get("view") ?? "";
    const view = requestedView || (actor.role === "customer_service" ? "support" : actor.role === "warehouse" ? "orders" : "overview");
    const wants = (...views: string[]) => views.includes(view);
    const rowsIf = (visible: boolean, sql: string) => visible ? db.prepare(sql).all() : Promise.resolve({ results: [] });
    const firstIf = (visible: boolean, sql: string) => visible ? db.prepare(sql).first() : Promise.resolve(null);
    const [products, productCategories, orders, orderItems, members, subscribers, returns, retailPartnerships, coupons, giftCards, stats, revenueTrend, providers, payments, refunds, paymentEvents, notificationSettings, notificationTemplates, notificationJobs, reviews, communityPosts, communityReports, communityInsights, content, supportThreads, supportMessages, returnEvents, invoices, cannedReplies, orderStatusAnalytics, topProducts, customerAnalytics, returnAnalytics, adminUsers, auditLogs, shipments, shipmentEvents, reconciliation] = await Promise.all([
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
      communityVisible && wants("community") ? listCommunityModerationPosts() : Promise.resolve([]),
      communityVisible && wants("community") ? listCommunityReports() : Promise.resolve([]),
      communityVisible && wants("community") ? getCommunityCommerceInsights() : Promise.resolve({ summary: { impressions: 0, productClicks: 0, addToCarts: 0, measuredPosts: 0 }, products: [] }),
      can("content.manage") && wants("content") ? getContentWorkspace() : Promise.resolve({ current: {}, revisions: [] }),
      rowsIf(supportVisible && wants("support", "orders"), `SELECT st.*, m.name AS member_name, m.total_orders AS member_total_orders, m.total_spent AS member_total_spent,
        m.points_balance AS member_points_balance, m.lifetime_points AS member_lifetime_points, m.tier AS member_tier, m.status AS member_status,
        COALESCE((SELECT string_agg(DISTINCT ct.name, ', ') FROM member_tag_assignments mta JOIN customer_tags ct ON ct.id = mta.tag_id WHERE mta.member_id = m.id), '') AS member_tags,
        o.status AS order_status, r.status AS return_status
        FROM support_threads st LEFT JOIN members m ON m.id = st.member_id LEFT JOIN orders o ON o.id = st.order_id LEFT JOIN returns r ON r.id = st.return_id
        ORDER BY st.last_message_at DESC LIMIT 500`),
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
    const [supportAgentsResult, supportCustomerOrdersResult, supportCustomerReturnsResult] = supportVisible && wants("support") ? await Promise.all([
      db.prepare("SELECT id, email, display_name, role FROM admin_users WHERE status = 'active' AND role IN ('owner','operations','customer_service') ORDER BY CASE role WHEN 'owner' THEN 0 WHEN 'operations' THEN 1 ELSE 2 END, display_name").all(),
      db.prepare(`SELECT o.id, o.member_id, o.customer, o.email, o.total, o.status, o.delivery, o.payment, o.created_at,
        s.carrier_name, s.tracking_number, s.status AS shipment_status
        FROM orders o LEFT JOIN shipments s ON s.order_id = o.id
        WHERE EXISTS (SELECT 1 FROM support_threads st WHERE st.deleted_at IS NULL AND (st.order_id = o.id OR st.member_id = o.member_id OR (st.customer_email <> '' AND lower(st.customer_email) = lower(o.email))))
        ORDER BY o.created_at DESC LIMIT 1000`).all(),
      db.prepare(`SELECT r.id, r.order_id, r.email, r.reason, r.request_type, r.status, r.refund_id, r.created_at, o.member_id
        FROM returns r JOIN orders o ON o.id = r.order_id
        WHERE EXISTS (SELECT 1 FROM support_threads st WHERE st.deleted_at IS NULL AND (st.return_id = r.id OR st.order_id = r.order_id OR st.member_id = o.member_id OR (st.customer_email <> '' AND lower(st.customer_email) = lower(r.email))))
        ORDER BY r.created_at DESC LIMIT 500`).all(),
    ]) : [{ results: [] }, { results: [] }, { results: [] }];
    const legacySupportAgent = legacyAdminConfigured() ? [{ id: "legacy-owner", email: (process.env.ADMIN_EMAIL || "admin@pusy.cn").trim().toLowerCase(), display_name: "主管理员", role: "owner" }] : [];
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
    const communityOperations = communityVisible && wants("community") ? await getCommunityOperationsData() : { metrics: { dau: 0, wau: 0, mau: 0, interactions30d: 0, returning7d: 0, retention7d: 0 }, comments: [], members: [], topics: [], campaigns: [], broadcasts: [] };
    const wallets = financeVisible && wants("payments") ? await db.prepare(`SELECT m.id AS member_id, m.name, m.email,
      COALESCE(w.available_balance_fen, 0) AS available_balance_fen, COALESCE(w.frozen_balance_fen, 0) AS frozen_balance_fen,
      COALESCE(w.status, 'active') AS status, w.payment_password_hash IS NOT NULL AS payment_password_set
      FROM members m LEFT JOIN member_wallets w ON w.member_id = m.id
      ORDER BY COALESCE(w.available_balance_fen, 0) DESC, m.id DESC LIMIT 500`).all() : { results: [] };
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
      wallets: financeVisible ? wallets.results : [],
      notificationSettings: can("system.manage") ? notificationSettings : [],
      notificationTemplates: can("system.manage") ? notificationTemplates.results : [],
      notificationJobs: can("system.manage") ? notificationJobs.results : [],
      reviews: marketingVisible ? reviews.results : [],
      communityPosts: communityVisible ? communityPosts : [],
      communityReports: communityVisible ? communityReports : [],
      communityInsights: communityVisible ? communityInsights : { summary: { impressions: 0, productClicks: 0, addToCarts: 0, measuredPosts: 0 }, products: [] },
      communityOperations,
      content: can("content.manage") ? content.current : {},
      contentRevisions: can("content.manage") ? content.revisions : [],
      supportThreads: supportVisible ? supportThreads.results : [],
      supportMessages: supportVisible ? supportMessages.results : [],
      returnEvents: supportVisible ? returnEvents.results : [],
      invoices: financeVisible ? invoices.results : [],
      cannedReplies: supportVisible ? cannedReplies.results : [],
      supportAgents: supportVisible ? [...legacySupportAgent, ...supportAgentsResult.results] : [],
      supportCustomerOrders: supportVisible ? supportCustomerOrdersResult.results : [],
      supportCustomerReturns: supportVisible ? supportCustomerReturnsResult.results : [],
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
    const context = { action, payload, db, actor, request };
    let result: false | true | Response = false;
    for (const handler of adminActionHandlers) {
      result = await handler(context);
      if (result !== false) break;
    }
    if (result === false) return Response.json({ error: "未知操作" }, { status: 400 });
    if (result instanceof Response) {
      if (result.ok) {
        await completeAdminAudit(auditId, "succeeded");
        auditCompleted = true;
      }
      return result;
    }
    await completeAdminAudit(auditId, "succeeded");
    auditCompleted = true;
    return Response.json({ ok: true });
  } catch (error) {
    if (auditId) {
      await completeAdminAudit(auditId, "failed", error instanceof Error ? error.message : String(error)).catch(() => undefined);
      auditCompleted = true;
    }
    const conflict = error instanceof Error && /unique/i.test(error.message);
    const contentValidation = error instanceof Error && /^(定时发布时间必须晚于当前时间|内容版本不存在|只能删除草稿或待发布版本|社区内容标识无效|社区审核状态无效|拒绝公开时请填写审核说明|社区内容不存在|社区推荐位置无效|只有公开内容可以设为社区精选|社区评论不存在或已经删除|社区活动不存在|社区会员不存在)$/.test(error.message);
    console.error("[api/admin] action failed", { message: error instanceof Error ? error.message : String(error), code: typeof error === "object" && error && "code" in error ? String(error.code) : undefined });
    return safeServerError(contentValidation ? error.message : conflict ? "相同名称、商品编号或邮箱的数据已经存在" : "后台操作失败，请稍后再试", contentValidation ? 400 : conflict ? 409 : 500);
  } finally {
    if (auditId && !auditCompleted) await completeAdminAudit(auditId, "failed", "请求校验未通过或操作未完成").catch(() => undefined);
  }
}
