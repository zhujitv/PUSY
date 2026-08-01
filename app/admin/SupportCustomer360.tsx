"use client";

import { formatCnyFromRub } from "../data/products";
import type { SupportCustomerOrder, SupportCustomerReturn, SupportThread } from "./support-types";

const tierLabels: Record<string, string> = { bronze: "青铜会员", silver: "白银会员", gold: "黄金会员", diamond: "钻石会员" };

export function Customer360({ thread, orders, returns, previousTickets }: { thread: SupportThread; orders: SupportCustomerOrder[]; returns: SupportCustomerReturn[]; previousTickets: number }) {
  const tags = (thread.member_tags || "").split(",").map((tag) => tag.trim()).filter(Boolean);
  return <aside className="support-customer-360">
    <header><span>客户 360</span><h3>{thread.member_name || thread.customer_name || "访客客户"}</h3><p>{thread.member_id ? `会员 #${thread.member_id}` : "尚未绑定会员账号"}</p></header>
    <section className="support-customer-summary">
      <div><span>会员等级</span><b>{tierLabels[thread.member_tier || ""] || "普通客户"}</b></div>
      <div><span>积分余额</span><b>{thread.member_points_balance ?? 0}</b></div>
      <div><span>累计订单</span><b>{thread.member_total_orders ?? orders.length}</b></div>
      <div><span>累计消费</span><b>{formatCnyFromRub(thread.member_total_spent ?? 0)}</b></div>
    </section>
    <section><h4>联系方式</h4><p>{thread.customer_phone || "未填写手机"}</p><p>{thread.customer_wechat ? `微信：${thread.customer_wechat}` : "未填写微信"}</p><p>{thread.customer_email || "未填写邮箱"}</p></section>
    <section><h4>客户标签</h4><div className="support-customer-tags">{tags.length ? tags.map((tag) => <span key={tag}>{tag}</span>) : <small>暂无标签</small>}</div></section>
    <section><h4>最近订单</h4><div className="support-customer-history">{orders.slice(0, 5).map((order) => <article key={order.id}><div><b>{order.id}</b><time>{new Date(order.created_at).toLocaleDateString("zh-CN")}</time></div><p>{order.status} · {formatCnyFromRub(order.total)}</p>{order.tracking_number && <small>{order.carrier_name} {order.tracking_number} · {order.shipment_status}</small>}</article>)}{!orders.length && <small>暂无订单记录</small>}</div></section>
    <section><h4>售后记录</h4><div className="support-customer-history">{returns.slice(0, 4).map((item) => <article key={item.id}><div><b>{item.id}</b><time>{new Date(item.created_at).toLocaleDateString("zh-CN")}</time></div><p>{item.status} · {item.reason}</p></article>)}{!returns.length && <small>暂无售后记录</small>}</div></section>
    <div className="support-customer-footer"><span>历史工单</span><b>{previousTickets} 个</b></div>
  </aside>;
}
