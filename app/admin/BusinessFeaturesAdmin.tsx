"use client";

import { formatCnyFromRub } from "../data/products";
import type { AdminInvoice, AnalyticsData } from "./admin-types";

export type { AdminInvoice, AnalyticsData } from "./admin-types";

const invoiceStatusLabels: Record<string, string> = { pending: "待审核", processing: "开票中", issued: "已开具", rejected: "已驳回", cancelled: "已取消" };

export function InvoiceAdmin({ invoices, onAct }: { invoices: AdminInvoice[]; onAct: (payload: Record<string, unknown>) => Promise<boolean> }) {
  const pending = invoices.filter((invoice) => invoice.status === "pending").length;
  const issued = invoices.filter((invoice) => invoice.status === "issued").length;
  return <div className="invoice-admin-stack">
    <section className="invoice-summary"><article><span>全部申请</span><b>{invoices.length}</b></article><article><span>待审核</span><b>{pending}</b></article><article><span>已开具</span><b>{issued}</b></article><article><span>待开票金额</span><b>{formatCnyFromRub(invoices.filter((item) => ["pending", "processing"].includes(item.status)).reduce((sum, item) => sum + Number(item.amount), 0))}</b></article></section>
    <section className="admin-panel"><div className="admin-panel-title"><div><h2>电子发票申请</h2><p>审核抬头和税号，开具后填写发票号码与安全下载地址。</p></div></div>
      <div className="invoice-list">{invoices.length ? invoices.map((invoice) => <details key={invoice.id} open={invoice.status === "pending"}>
        <summary><div><b>{invoice.title}</b><small>{invoice.id} · 订单 {invoice.order_id} · {invoice.customer}</small></div><strong>{formatCnyFromRub(invoice.amount)}</strong><span className={`invoice-status status-${invoice.status}`}>{invoiceStatusLabels[invoice.status]}</span></summary>
        <form onSubmit={(event) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); void onAct({ action: "update-invoice", id: invoice.id, ...values }); }}>
          <div className="invoice-customer-info"><p><span>发票类型</span><b>{invoice.invoice_type === "company" ? "企业发票" : "个人发票"}</b></p><p><span>税号</span><b>{invoice.tax_number || "不适用"}</b></p><p><span>接收邮箱</span><b>{invoice.recipient_email}</b></p><p><span>申请时间</span><b>{new Date(invoice.requested_at).toLocaleString("zh-CN")}</b></p></div>
          <div className="admin-form-grid"><label>处理状态<select name="status" defaultValue={invoice.status}>{Object.entries(invoiceStatusLabels).map(([value, label]) => <option value={value} key={value}>{label}</option>)}</select></label><label>发票号码<input name="invoiceNumber" defaultValue={invoice.invoice_number} placeholder="开具后填写" /></label><label className="full">电子发票下载地址<input name="fileUrl" defaultValue={invoice.file_url} placeholder="https://… 或站内 /… 地址" /></label><label className="full">驳回原因<textarea name="rejectionReason" defaultValue={invoice.rejection_reason} rows={2} placeholder="驳回时客户可在会员中心看到" /></label><label className="full">内部备注<textarea name="adminNote" defaultValue={invoice.admin_note} rows={2} placeholder="仅后台可见" /></label></div>
          <button className="admin-save">保存发票处理结果</button>
        </form>
      </details>) : <p className="admin-empty">还没有发票申请</p>}</div>
    </section>
  </div>;
}

function percentage(value: number, total: number) { return total > 0 ? Math.round(value / total * 100) : 0; }

export function AnalyticsAdmin({ analytics }: { analytics: AnalyticsData }) {
  const statuses = analytics.orderStatuses.map((item) => ({ ...item, count: Number(item.count), revenue: Number(item.revenue) }));
  const totalOrders = statuses.reduce((sum, item) => sum + item.count, 0);
  const successful = statuses.filter((item) => !["待付款", "支付失败", "已取消", "已退款"].includes(item.status)).reduce((sum, item) => sum + item.count, 0);
  const maxStatus = Math.max(1, ...statuses.map((item) => item.count));
  const purchasingMembers = Number(analytics.customers.purchasing_members ?? 0);
  const repeatMembers = Number(analytics.customers.repeat_members ?? 0);
  const totalReturns = Number(analytics.returns.total_returns ?? 0);
  return <div className="analytics-admin-stack">
    <section className="analytics-kpis"><article><span>订单成交率</span><b>{percentage(successful, totalOrders)}%</b><small>{successful} / {totalOrders} 笔</small></article><article><span>复购会员率</span><b>{percentage(repeatMembers, purchasingMembers)}%</b><small>{repeatMembers} 位复购会员</small></article><article><span>近 30 天新会员</span><b>{Number(analytics.customers.new_members_30d ?? 0)}</b><small>累计 {Number(analytics.customers.total_members ?? 0)} 位</small></article><article><span>售后申请率</span><b>{percentage(totalReturns, Math.max(successful, 1))}%</b><small>近 30 天 {Number(analytics.returns.returns_30d ?? 0)} 笔售后</small></article></section>
    <div className="analytics-grid">
      <section className="admin-panel"><div className="admin-panel-title"><div><h2>订单状态结构</h2><p>识别付款流失与待履约订单</p></div></div><div className="analytics-bars">{statuses.map((item) => <div key={item.status}><span>{item.status}</span><i><b style={{ width: `${Math.max(3, item.count / maxStatus * 100)}%` }} /></i><strong>{item.count}</strong></div>)}</div></section>
      <section className="admin-panel"><div className="admin-panel-title"><div><h2>热销商品排行</h2><p>按成交商品数量排序</p></div></div><div className="analytics-products">{analytics.topProducts.length ? analytics.topProducts.map((item, index) => <article key={item.product_slug}><em>{String(index + 1).padStart(2, "0")}</em><div><b>{item.product_name}</b><small>{item.product_slug}</small></div><span>{Number(item.quantity)} 件</span><strong>{formatCnyFromRub(Number(item.revenue))}</strong></article>) : <p className="admin-empty">暂无成交商品数据</p>}</div></section>
    </div>
    <section className="admin-panel analytics-guidance"><div><span>经营提示</span><h2>{percentage(successful, totalOrders) < 70 ? "优先检查待付款订单和支付失败原因" : percentage(repeatMembers, purchasingMembers) < 20 ? "成交稳定，可以加强老客户复购运营" : "订单与复购表现健康，继续关注热销商品库存"}</h2></div><p>数据来自真实订单、会员和售后记录，不包含尚未接入的站外访问流量。</p></section>
  </div>;
}
