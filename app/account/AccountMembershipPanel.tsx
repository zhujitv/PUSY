"use client";

import Image from "next/image";
import { formatCnyFromRub } from "../data/products";
import { tierName, tierSteps } from "./account-config";
import type { AccountData } from "./account-types";

export function MembershipPanel({ data, onAct }: { data: AccountData; onAct: (payload: Record<string, unknown>) => Promise<boolean> }) {
  const currentIndex = Math.max(0, tierSteps.findIndex((item) => item.key === data.member.tier));
  const next = tierSteps[currentIndex + 1];
  const currentMinimum = tierSteps[currentIndex].minimum;
  const progress = next ? Math.min(100, Math.round((data.member.lifetime_points - currentMinimum) / (next.minimum - currentMinimum) * 100)) : 100;
  return <div className="membership-stack">
    <section className={`membership-card tier-${data.member.tier}`}>
      <header><div><strong>PÚSY</strong><span>BEAUTY CLUB</span></div><small>MEMBER SINCE {new Date(data.member.joined_at).getFullYear()}</small></header>
      <div className="membership-card-tier"><span>MEMBERSHIP TIER</span><h2>{tierName(data.member.tier)}</h2><p>{data.member.name}</p></div>
      <div className="membership-card-points"><span>AVAILABLE POINTS</span><b>{data.member.points_balance}</b><small>可用积分</small></div>
      <footer><div><span>累计积分 {data.member.lifetime_points}</span><span>{next ? `距 ${tierName(next.key)} 还需 ${Math.max(0, next.minimum - data.member.lifetime_points)} 分` : "已达到最高等级"}</span></div><i><em style={{ width: `${progress}%` }} /></i></footer>
    </section>
    <section className="member-section"><div className="member-section-title"><div><p>每消费 1 元积 1 分</p><h2>等级权益</h2></div></div><div className="tier-benefit-grid">{tierSteps.map((item) => <article className={item.minimum <= data.member.lifetime_points ? "active" : ""} key={item.key}><b>{tierName(item.key)}</b><span>{item.minimum} 积分起</span><p>{item.key === "bronze" ? "基础积分与会员服务" : item.key === "silver" ? "补货与活动优先提醒" : item.key === "gold" ? "专属优惠券与新品体验" : "最高等级专属权益"}</p></article>)}</div></section>
    <section className="member-section"><div className="member-section-title"><div><p>{data.coupons.filter((item) => item.status === "available").length} 张可用</p><h2>我的优惠券</h2></div></div>{data.coupons.length ? <div className="member-coupon-grid">{data.coupons.map((coupon) => <article key={coupon.id} className={coupon.status}><strong>{coupon.kind === "percent" ? `${coupon.value}%` : formatCnyFromRub(coupon.value)}</strong><div><b>{coupon.code}</b><span>{coupon.minimum ? `满 ${formatCnyFromRub(coupon.minimum)} 可用` : "无门槛"}</span><small>{coupon.ends_at ? `有效期至 ${new Date(coupon.ends_at).toLocaleDateString("zh-CN")}` : "长期有效"}</small></div><em>{coupon.status === "available" ? "可使用" : "已使用"}</em></article>)}</div> : <p className="member-empty-inline">暂时没有专属优惠券</p>}</section>
    <section className="member-section"><div className="member-section-title"><div><p>补货与降价动态</p><h2>商品提醒</h2></div></div>{data.productAlerts.length ? <div className="member-alert-list">{data.productAlerts.map((alert) => <article key={alert.id}><Image src={alert.image} alt="" width={72} height={76} /><div><a href={`/products/${alert.product_slug}`}>{alert.product_name}</a><span>{alert.alert_type === "restock" ? "补货通知" : "降价通知"} · 当前 {formatCnyFromRub(alert.price)}</span></div><button onClick={() => void onAct({ action: "remove-product-alert", id: alert.id })}>取消</button></article>)}</div> : <p className="member-empty-inline">在商品详情页可开启补货或降价提醒</p>}</section>
    <section className="member-section"><div className="member-section-title"><div><p>最近 50 条</p><h2>积分明细</h2></div></div>{data.pointsLedger.length ? <div className="points-ledger">{data.pointsLedger.map((entry) => <div key={entry.id}><span><b>{entry.reason}</b><small>{new Date(entry.created_at).toLocaleString("zh-CN")}</small></span><strong className={entry.points > 0 ? "positive" : ""}>{entry.points > 0 ? "+" : ""}{entry.points}</strong><em>余额 {entry.balance_after}</em></div>)}</div> : <p className="member-empty-inline">完成订单后，积分明细会显示在这里</p>}</section>
  </div>;
}
