"use client";
import { useCallback, useEffect, useMemo, useState } from "react";
import { formatCnyFromRub } from "../data/products";
import { ContentAdmin, ReviewsAdmin } from "./CommerceFeaturesAdmin";
import { SupportAdmin } from "./SupportAdmin";
import { AnalyticsAdmin, InvoiceAdmin } from "./BusinessFeaturesAdmin";
import { AdminUsersAdmin, AuditLogAdmin } from "./AdminGovernance";
import { GrowthAdmin } from "./GrowthAdmin";
import { adminRoleLabels, type AdminPermission } from "../../lib/admin-permissions";
import { ProductManagement, type AdminProduct } from "./ProductManagement";
import { CommunityAdmin } from "./CommunityAdmin";
import type {
  AdminData,
  AdminMember,
  AdminOrder,
  AdminPayment,
  AdminViewer,
} from "./admin-types";

export type {
  AdminData,
  AdminMember,
  AdminOrder,
  AdminPayment,
  AdminRefund,
  AdminReturn,
  AdminViewer,
  ChinaRegionSettings,
  Coupon,
  GiftCard,
  NotificationJob,
  NotificationSetting,
  NotificationTemplate,
  OrderItem,
  PaymentEvent,
  PaymentProvider,
  Reconciliation,
  ReconciliationItem,
  RetailPartnership,
  Shipment,
  ShipmentEvent,
  Subscriber,
  TrendPoint,
} from "./admin-types";
import { adminNavGroups, adminTabMeta, searchPlaceholders, tabPermissions } from "./admin-config";
import { ExportLink, ImportModal, RevenueChart } from "./AdminSharedComponents";
import { ChinaRegionAdmin, NotificationAdmin } from "./AdminNotificationRegion";
import { PaymentAdmin, PaymentStatus, RefundModal } from "./AdminPaymentComponents";
import { MemberModal, OrderManagement, OrderModal, OrderTable, ProductModal } from "./AdminOrderMemberComponents";

function returnItemSummary(value = "[]") { try { const items = JSON.parse(value) as { productName?: string; product_name?: string; requestedQuantity?: number; quantity?: number }[]; return items.map((item) => `${item.productName || item.product_name || "商品"} × ${item.requestedQuantity || item.quantity || 1}`).join("、"); } catch { return ""; } }

export function AdminClient({ viewer, canSignOut }: { viewer: AdminViewer; canSignOut: boolean }) {
  const defaultTab = viewer.role === "customer_service" ? "support" : viewer.role === "warehouse" ? "orders" : "overview";
  const [tab, setTab] = useState(defaultTab);
  const [data, setData] = useState<AdminData | null>(null);
  const [editing, setEditing] = useState<AdminProduct | null>(null);
  const [creating, setCreating] = useState(false);
  const [importing, setImporting] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<AdminOrder | null>(null);
  const [selectedMember, setSelectedMember] = useState<AdminMember | null>(null);
  const [refundPayment, setRefundPayment] = useState<AdminPayment | null>(null);
  const [supportFocus, setSupportFocus] = useState("");
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [contentDirty, setContentDirty] = useState(false);
  const can = (permission: AdminPermission) => viewer.permissions.includes(permission);

  useEffect(() => {
    if (message !== "已保存") return;
    const timeout = window.setTimeout(() => setMessage(""), 3_000);
    return () => window.clearTimeout(timeout);
  }, [message]);

  const load = useCallback(async (view: string, options: { silent?: boolean; preserveMessage?: boolean } = {}) => {
    const silent = Boolean(options.silent);
    if (!silent) setLoading(true);
    const controller = new AbortController();
    const timeout = window.setTimeout(() => controller.abort(), 20_000);
    try {
      const response = await fetch(`/api/admin?view=${encodeURIComponent(view)}`, { cache: "no-store", signal: controller.signal });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) setMessage(body.error || "加载失败，请稍后重试");
      else { setData(body); if (!options.preserveMessage) setMessage(""); }
    } catch (error) {
      setMessage(error instanceof DOMException && error.name === "AbortError" ? "读取商城数据超时，请刷新页面重试" : "无法连接商城数据，请刷新页面重试");
    } finally {
      window.clearTimeout(timeout);
      if (!silent) setLoading(false);
    }
  }, []);
  useEffect(() => { queueMicrotask(() => { void load(defaultTab); }); }, [defaultTab, load]);
  async function act(payload: Record<string, unknown>) {
    setMessage("正在保存…");
    try {
      const response = await fetch("/api/admin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) { setMessage(body.error || "保存失败"); return false; }
      setMessage("已保存");
      await load(tab, { silent: true, preserveMessage: true });
      return true;
    } catch {
      setMessage("无法连接后台，请检查网络后重试");
      return false;
    }
  }
  async function saveProduct(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    const inventoryOnly = Boolean(editing && !can("products.manage") && can("products.inventory.manage"));
    const ok = await act({ action: inventoryOnly ? "update-product-inventory" : editing ? "update-product" : "create-product", id: editing?.id, ...payload });
    if (ok) { setEditing(null); setCreating(false); }
  }
  async function saveCoupon(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (await act({ action: "create-coupon", ...payload })) event.currentTarget.reset();
  }
  async function openLinkedSupport(input: { orderId?: string; returnId?: string }) {
    setMessage("正在打开关联邮件工单…");
    const response = await fetch("/api/admin", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "open-linked-support-thread", ...input }) });
    const body = await response.json();
    if (!response.ok || !body.threadId) { setMessage(body.error || "无法打开邮件工单"); return; }
    await load("support");
    setSupportFocus(String(body.threadId));
    setSelectedOrder(null);
    setQuery("");
    setTab("support");
    setMessage("已打开关联邮件工单，可直接回复客户");
  }
  function changeTab(next: string) {
    if (tab === "content" && next !== tab && contentDirty && !window.confirm("当前内容还有未保存修改，确定离开吗？")) return;
    setContentDirty(false);
    setTab(next);
    setQuery("");
    if (next !== "support") setSupportFocus("");
    void load(next);
  }

  const normalized = query.trim().toLowerCase();
  const filtered = useMemo(() => {
    if (!data || !normalized) return { products: data?.products ?? [], orders: data?.orders ?? [], invoices: data?.invoices ?? [], members: data?.members ?? [], subscribers: data?.subscribers ?? [], returns: data?.returns ?? [], retailPartnerships: data?.retailPartnerships ?? [], coupons: data?.coupons ?? [], giftCards: data?.giftCards ?? [], payments: data?.payments ?? [], refunds: data?.refunds ?? [], notificationJobs: data?.notificationJobs ?? [], reviews: data?.reviews ?? [], communityPosts: data?.communityPosts ?? [], communityReports: data?.communityReports ?? [] };
    return {
      products: data.products.filter((item) => `${item.name} ${item.slug} ${item.category} ${item.status}`.toLowerCase().includes(normalized)),
      orders: data.orders.filter((item) => `${item.id} ${item.customer} ${item.email} ${item.phone} ${item.status}`.toLowerCase().includes(normalized)),
      invoices: data.invoices.filter((item) => `${item.id} ${item.order_id} ${item.customer} ${item.customer_email} ${item.title} ${item.tax_number} ${item.status}`.toLowerCase().includes(normalized)),
      members: data.members.filter((item) => `${item.name} ${item.email} ${item.phone} ${item.status}`.toLowerCase().includes(normalized)),
      subscribers: data.subscribers.filter((item) => `${item.email} ${item.source} ${item.status}`.toLowerCase().includes(normalized)),
      returns: data.returns.filter((item) => `${item.id} ${item.order_id} ${item.email} ${item.reason} ${item.status}`.toLowerCase().includes(normalized)),
      retailPartnerships: data.retailPartnerships.filter((item) => `${item.id} ${item.contact_name} ${item.phone} ${item.company} ${item.city} ${item.cooperation_type} ${item.wechat} ${item.email} ${item.proposal} ${item.status}`.toLowerCase().includes(normalized)),
      coupons: data.coupons.filter((item) => `${item.code} ${item.kind} ${item.status}`.toLowerCase().includes(normalized)),
      giftCards: data.giftCards.filter((item) => `${item.code} ${item.order_id} ${item.recipient_name} ${item.recipient_email} ${item.status}`.toLowerCase().includes(normalized)),
      payments: data.payments.filter((item) => `${item.id} ${item.order_id} ${item.merchant_trade_no} ${item.customer} ${item.email} ${item.provider} ${item.status}`.toLowerCase().includes(normalized)),
      refunds: data.refunds.filter((item) => `${item.id} ${item.order_id} ${item.merchant_refund_no} ${item.provider} ${item.reason} ${item.status}`.toLowerCase().includes(normalized)),
      notificationJobs: data.notificationJobs.filter((item) => `${item.id} ${item.event_key} ${item.entity_id} ${item.template_key} ${item.channel} ${item.recipient} ${item.status}`.toLowerCase().includes(normalized)),
      reviews: data.reviews.filter((item) => `${item.product_slug} ${item.reviewer_name} ${item.title} ${item.body} ${item.status}`.toLowerCase().includes(normalized)),
      communityPosts: data.communityPosts.filter((item) => `${item.id} ${item.author_name} ${item.author_public_id} ${item.title} ${item.body} ${item.status} ${item.moderation_note}`.toLowerCase().includes(normalized)),
      communityReports: data.communityReports.filter((item) => `${item.id} ${item.entity_type} ${item.reason} ${item.detail} ${item.status} ${item.reporter_name} ${item.target_author_name} ${item.target_excerpt}`.toLowerCase().includes(normalized)),
    };
  }, [data, normalized]);

  const tabMeta = adminTabMeta[tab];
  const messageIsError = /失败|无法|超时|错误/.test(message);
  return <main className="admin-shell">
    <aside className="admin-sidebar"><div className="admin-sidebar-brand"><a className="admin-brand" href="/">PUSY.CN</a><span>ADMIN</span></div><p>中国区商城管理后台</p><nav aria-label="后台功能导航">{adminNavGroups.map((group) => { const items = group.items.filter(([key]) => can(tabPermissions[key])); return items.length ? <section className="admin-nav-group" key={group.label}><b>{group.label}</b>{items.map(([key,label,icon]) => <button className={tab === key ? "active" : ""} aria-current={tab === key ? "page" : undefined} onClick={() => changeTab(key)} key={key}><i aria-hidden="true">{icon}</i><span>{label}</span>{key === "support" && Boolean(data?.stats?.unread_support) && <em className="admin-nav-count">{data?.stats?.unread_support}</em>}</button>)}</section> : null; })}</nav><div className="admin-viewer"><i>{viewer.displayName.slice(0, 1).toUpperCase()}</i><span><small>{adminRoleLabels[viewer.role]}</small><b>{viewer.displayName}</b></span>{canSignOut && <a href="/admin/logout">退出</a>}</div><a className="admin-store-link" href="/">查看商城 <span>↗</span></a></aside>
    <section className="admin-main"><header><div><p>{tabMeta.eyebrow} / PUSY.CN</p><h1>{tabMeta.title}</h1><span>{tabMeta.description}</span></div></header>
      {!['overview','analytics','settings','content','admins','audit'].includes(tab) && <div className="admin-search"><i aria-hidden="true">⌕</i><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder={searchPlaceholders[tab] ?? "搜索当前列表"} aria-label="搜索当前列表" /><span>{query ? `${tab === "support" ? data?.supportThreads.filter((item) => `${item.id} ${item.subject} ${item.customer_email} ${item.customer_phone ?? ""} ${item.customer_wechat ?? ""} ${item.order_id ?? ""} ${item.return_id ?? ""}`.toLowerCase().includes(normalized)).length : tab === "orders" ? filtered.orders.length : tab === "invoices" ? filtered.invoices.length : tab === "payments" ? filtered.payments.length + filtered.refunds.length : tab === "notifications" ? filtered.notificationJobs.length : tab === "members" ? filtered.members.length : tab === "products" ? filtered.products.length : tab === "community" ? filtered.communityPosts.length + filtered.communityReports.length : tab === "reviews" ? filtered.reviews.length : tab === "returns" ? filtered.returns.length : tab === "partnerships" ? filtered.retailPartnerships.length : tab === "marketing" ? filtered.coupons.length + filtered.giftCards.length : filtered.subscribers.length} 条结果` : ""}</span></div>}
      {message && <div className={`admin-message ${messageIsError ? "error" : ""}`} role={messageIsError ? "alert" : "status"} aria-live={messageIsError ? "assertive" : "polite"} aria-atomic="true">{message}</div>}
      {loading ? <div className="admin-loading"><i /><b>正在读取商城数据</b><span>正在同步当前模块的数据…</span></div> : data && <>
        {tab === "overview" && <div className="admin-overview"><section className="stat-grid"><article><span>累计订单</span><b>{data.stats?.order_count ?? 0}</b></article><article><span>累计销售额</span><b>{formatCnyFromRub(data.stats?.revenue ?? 0)}</b></article><article><span>平均客单价</span><b>{formatCnyFromRub(Math.round(data.stats?.avg_order_value ?? 0))}</b></article><article><span>待处理订单</span><b>{data.stats?.pending_count ?? 0}</b></article><article><span>待核验库存</span><b>{data.stats?.unverified_inventory_count ?? 0}</b></article><article><span>低库存商品</span><b>{data.stats?.low_stock_count ?? 0}</b></article><article><span>待审核售后</span><b>{data.stats?.pending_returns ?? 0}</b></article><article><span>待联系合作</span><b>{data.stats?.pending_partnerships ?? 0}</b></article></section><RevenueChart points={data.revenueTrend} /><section className="admin-panel"><div className="admin-panel-title"><h2>最新订单</h2><button onClick={() => changeTab("orders")}>查看全部</button></div><OrderTable orders={data.orders.slice(0, 6)} canManage={can("orders.manage")} canSupport={can("support.manage")} onOpen={setSelectedOrder} onSupport={(orderId) => void openLinkedSupport({ orderId })} onStatus={(id,status) => act({ action:"update-order-status", id, status })} /></section></div>}
        {tab === "analytics" && <AnalyticsAdmin analytics={data.analytics} />}
        {tab === "growth" && <GrowthAdmin data={data.growth} onAct={act} />}
        {tab === "content" && <ContentAdmin key={data.contentRevisions.find((item) => item.status === "published")?.id ?? "content"} content={data.content} revisions={data.contentRevisions} onAct={act} onDirtyChange={setContentDirty} />}
        {tab === "settings" && <ChinaRegionAdmin settings={data.region} providers={data.providers} onOpenPayments={() => changeTab("payments")} />}
        {tab === "orders" && <OrderManagement orders={filtered.orders} shipments={data.shipments} shipmentEvents={data.shipmentEvents} canManage={can("orders.manage") || can("orders.fulfill")} canFullManage={can("orders.manage")} canSupport={can("support.manage")} onOpen={setSelectedOrder} onSupport={(orderId) => void openLinkedSupport({ orderId })} onStatus={(id,status) => act({ action:"update-order-status", id, status })} onAct={act} />}
        {tab === "invoices" && <InvoiceAdmin invoices={filtered.invoices} onAct={act} />}
        {tab === "support" && <SupportAdmin key={supportFocus || "support"} threads={data.supportThreads} messages={data.supportMessages} returnEvents={data.returnEvents} cannedReplies={data.cannedReplies} receiving={data.supportReceiving} agents={data.supportAgents} customerOrders={data.supportCustomerOrders} customerReturns={data.supportCustomerReturns} query={query} viewer={viewer} focusThreadId={supportFocus} onAct={act} />}
        {tab === "payments" && <PaymentAdmin providers={data.providers} payments={filtered.payments} refunds={filtered.refunds} wallets={data.wallets} events={data.paymentEvents} reconciliation={data.reconciliation} canManage={can("finance.manage")} onAct={act} onRefund={setRefundPayment} />}
        {tab === "notifications" && <NotificationAdmin settings={data.notificationSettings} templates={data.notificationTemplates} jobs={filtered.notificationJobs} onAct={act} />}
        {tab === "members" && <section className="admin-panel"><div className="admin-panel-title"><h2>会员档案</h2><div className="admin-panel-actions"><span>{filtered.members.length} 位会员</span><ExportLink type="members" /></div></div><div className="admin-table-wrap"><table><thead><tr><th>会员</th><th>联系方式</th><th>订单</th><th>累计消费</th><th>加入时间</th><th>状态</th><th>详情</th></tr></thead><tbody>{filtered.members.map((member) => <tr key={member.id}><td><b>{member.name}</b><small>#{member.id}</small></td><td>{member.email}<small>{member.phone}</small></td><td>{member.total_orders}</td><td>{formatCnyFromRub(member.total_spent)}</td><td>{new Date(member.joined_at).toLocaleDateString("zh-CN")}</td><td><select value={member.status} disabled={!can("customers.manage")} onChange={(event) => act({ action:"update-member-status", id:member.id, status:event.target.value })}><option value="active">普通会员</option><option value="vip">VIP</option><option value="blocked">已停用</option></select></td><td><button className="admin-text-button" onClick={() => setSelectedMember(member)}>查看</button></td></tr>)}</tbody></table></div></section>}
        {tab === "products" && <ProductManagement products={data.products} categories={data.productCategories} query={query} canManage={can("products.manage")} canInventoryManage={can("products.inventory.manage")} onCreate={() => { setEditing(null); setCreating(true); }} onImport={() => setImporting(true)} onEdit={(product) => { setEditing(product); setCreating(false); }} onAct={act} />}
        {tab === "reviews" && <ReviewsAdmin reviews={filtered.reviews} onAct={act} />}
        {tab === "community" && <CommunityAdmin posts={filtered.communityPosts} reports={filtered.communityReports} insights={data.communityInsights} operations={data.communityOperations} canManage={can("community.manage")} onAct={act} />}
        {tab === "returns" && <section className="admin-panel"><div className="admin-panel-title"><h2>售后申请</h2><div className="admin-panel-actions"><span>{filtered.returns.length} 条申请</span><ExportLink type="returns" /></div></div><div className="admin-table-wrap"><table><thead><tr><th>售后单号</th><th>订单号</th><th>诉求 / 原因</th><th>退回物流</th><th>状态</th><th>售后处理</th><th>客户沟通</th></tr></thead><tbody>{filtered.returns.length ? filtered.returns.map((item) => <tr key={item.id}><td><b>{item.id}</b>{item.support_thread_id && <small>工单 {item.support_thread_id}</small>}</td><td>{item.order_id}<small>{item.email}</small></td><td>{item.request_type === "exchange" ? "换货" : item.request_type === "reship" ? "补寄" : "退货退款"}<small>{item.reason}{returnItemSummary(item.items_json) && <><br />商品：{returnItemSummary(item.items_json)}</>}<br />{item.details || "无补充说明"}</small></td><td>{item.return_tracking_number ? <>{item.return_carrier}<small>{item.return_tracking_number}</small></> : "尚未填写"}</td><td><PaymentStatus value={item.status} />{item.refund_id && <small>退款单 {item.refund_id}</small>}</td><td><select value={item.status} disabled={["退款中","已退款"].includes(item.status)} onChange={(event) => act({ action:"update-return-status", id:item.id, status:event.target.value })}>{["待审核","已批准","补发处理中","已拒绝","已关闭"].map((status) => <option key={status}>{status}</option>)}</select>{can("finance.manage") && item.request_type === "refund" && !item.refund_id && !["已拒绝","已关闭"].includes(item.status) && <button className="admin-text-button danger" onClick={() => { const amountYuan = window.prompt("退款金额（元）；留空则退剩余全部金额", ""); const reason = window.prompt("退款处理说明", "售后审核通过"); if (reason !== null) void act({ action: "approve-return-refund", id: item.id, amountYuan: amountYuan || undefined, reason }); }}>审核并退款</button>}</td><td><button className="admin-communication-button" onClick={() => void openLinkedSupport({ returnId: item.id })}>{item.support_thread_id ? "查看并回复" : "建立客服工单"}</button></td></tr>) : <tr><td className="admin-empty" colSpan={7}>暂无售后申请</td></tr>}</tbody></table></div></section>}
        {tab === "partnerships" && <section className="admin-panel"><div className="admin-panel-title"><div><h2>中国区零售合作申请</h2><p>集中处理官网提交的渠道、经销与企业采购咨询。</p></div><div className="admin-panel-actions"><span>{filtered.retailPartnerships.length} 条申请</span><ExportLink type="partnerships" /></div></div><div className="admin-table-wrap"><table><thead><tr><th>申请人 / 公司</th><th>联系方式</th><th>地区 / 类型</th><th>合作方案</th><th>提交时间</th><th>状态</th></tr></thead><tbody>{filtered.retailPartnerships.length ? filtered.retailPartnerships.map((item) => <tr key={item.id}><td><b>{item.contact_name}</b><small>{item.company}<br />{item.id}</small></td><td>{item.phone}<small>{item.wechat ? `微信：${item.wechat}` : "未填写微信"}<br />{item.email || "未填写邮箱"}</small></td><td>{item.city}<small>{item.cooperation_type}</small></td><td className="admin-partnership-proposal">{item.proposal}</td><td>{new Date(item.created_at).toLocaleString("zh-CN")}</td><td><select value={item.status} onChange={(event) => act({ action:"update-retail-partnership-status", id:item.id, status:event.target.value })}>{["待联系","洽谈中","已合作","已拒绝","已关闭"].map((status) => <option key={status}>{status}</option>)}</select></td></tr>) : <tr><td className="admin-empty" colSpan={6}>暂无零售合作申请</td></tr>}</tbody></table></div></section>}
        {tab === "marketing" && <div className="admin-marketing"><section className="admin-panel"><div className="admin-panel-title"><h2>优惠码</h2><span>{filtered.coupons.length} 个</span></div><form className="coupon-admin-form" onSubmit={saveCoupon}><input name="code" placeholder="优惠码，例如 SUMMER20" required /><select name="kind"><option value="percent">百分比</option><option value="fixed">固定金额（元）</option></select><input name="value" type="number" min="1" step="0.01" placeholder="折扣比例或金额" required /><input name="minimum" type="number" min="0" step="0.01" placeholder="最低消费（元）" /><input name="usageLimit" type="number" min="0" placeholder="限用次数，0不限" /><button>创建优惠码</button></form><div className="admin-table-wrap"><table><thead><tr><th>优惠码</th><th>方式</th><th>门槛</th><th>使用</th><th>状态</th></tr></thead><tbody>{filtered.coupons.map((coupon) => <tr key={coupon.id}><td><b>{coupon.code}</b></td><td>{coupon.kind === "percent" ? `${coupon.value}%` : formatCnyFromRub(coupon.value)}</td><td>{coupon.minimum ? formatCnyFromRub(coupon.minimum) : "无门槛"}</td><td>{coupon.used_count} / {coupon.usage_limit || "不限"}</td><td><select value={coupon.status} onChange={(event) => act({ action:"update-coupon-status", id:coupon.id, status:event.target.value })}><option value="active">启用</option><option value="disabled">停用</option></select></td></tr>)}</tbody></table></div></section><section className="admin-panel"><div className="admin-panel-title"><h2>礼品卡</h2><span>{filtered.giftCards.length} 张</span></div><div className="admin-table-wrap"><table><thead><tr><th>卡号</th><th>收件人</th><th>余额</th><th>来源订单</th><th>发送日期</th><th>状态</th></tr></thead><tbody>{filtered.giftCards.length ? filtered.giftCards.map((card) => <tr key={card.code}><td><b>{card.code}</b></td><td>{card.recipient_name}<small>{card.recipient_email}</small></td><td>{formatCnyFromRub(card.balance)}<small>初始 {formatCnyFromRub(card.initial_balance)}</small></td><td>{card.order_id}</td><td>{card.delivery_date || "立即"}</td><td><select value={card.status} onChange={(event) => act({ action:"update-gift-card-status", code:card.code, status:event.target.value })}><option value="active">有效</option><option value="used">已用完</option><option value="void">已作废</option></select></td></tr>) : <tr><td className="admin-empty" colSpan={6}>完成礼品卡订单后会在这里生成卡号</td></tr>}</tbody></table></div></section></div>}
        {tab === "subscribers" && <section className="admin-panel"><div className="admin-panel-title"><h2>邮件订阅名单</h2><div className="admin-panel-actions"><span>{filtered.subscribers.length} 位订阅用户</span><ExportLink type="subscribers" /></div></div><div className="admin-table-wrap"><table><thead><tr><th>邮箱</th><th>来源</th><th>订阅时间</th><th>状态</th></tr></thead><tbody>{filtered.subscribers.map((subscriber) => <tr key={subscriber.id}><td><b>{subscriber.email}</b></td><td>{subscriber.source === "homepage" ? "首页" : subscriber.source === "footer" ? "页脚" : subscriber.source}</td><td>{new Date(subscriber.subscribed_at).toLocaleString("zh-CN")}</td><td><select value={subscriber.status} onChange={(event) => act({ action:"update-subscriber-status", id:subscriber.id, status:event.target.value })}><option value="active">订阅中</option><option value="unsubscribed">已退订</option></select></td></tr>)}</tbody></table></div></section>}
        {tab === "admins" && <AdminUsersAdmin users={data.adminUsers} currentAdminId={viewer.id} onAct={act} />}
        {tab === "audit" && <AuditLogAdmin logs={data.auditLogs} />}
      </>}
    </section>
    {(creating || editing) && <ProductModal editing={editing} categories={data?.productCategories ?? []} inventoryOnly={Boolean(editing && !can("products.manage"))} onClose={() => { setCreating(false); setEditing(null); }} onSubmit={saveProduct} />}
    {importing && <ImportModal onClose={() => setImporting(false)} onImport={async (products) => { const ok = await act({ action: "bulk-import-products", products }); if (ok) setImporting(false); }} />}
    {selectedOrder && data && <OrderModal order={selectedOrder} items={data.orderItems.filter((item) => item.order_id === selectedOrder.id)} communicationCount={data.supportThreads.filter((thread) => thread.order_id === selectedOrder.id && !thread.deleted_at).length} canSupport={can("support.manage")} onSupport={() => void openLinkedSupport({ orderId: selectedOrder.id })} onClose={() => setSelectedOrder(null)} />}
    {selectedMember && data && <MemberModal member={selectedMember} orders={data.orders.filter((order) => order.member_id === selectedMember.id)} onClose={() => setSelectedMember(null)} />}
    {refundPayment && <RefundModal payment={refundPayment} onClose={() => setRefundPayment(null)} onSubmit={async (amountYuan, reason) => { const ok = await act({ action: "create-refund", paymentId: refundPayment.id, amountYuan, reason }); if (ok) setRefundPayment(null); }} />}
  </main>;
}
