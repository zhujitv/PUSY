"use client";
import { useState } from "react";
import { PageShell } from "../components/SiteChrome";
import { formatCnyFromRub } from "../data/products";
import { useStore } from "../components/StoreProvider";

export default function GiftCardPage() {
  const [amount, setAmount] = useState(3000);
  const [recipient, setRecipient] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const { addToCart } = useStore();
  function addGift(event: React.FormEvent) {
    event.preventDefault();
    const details = [`收件人：${recipient}`, `邮箱：${email}`, deliveryDate ? `发送日期：${deliveryDate}` : "购买后立即发送", message ? `祝福：${message}` : ""].filter(Boolean).join("；");
    addToCart({ slug: `gift-card-${amount}-${Date.now()}`, name: `PÚSY 电子礼品卡 · 送给 ${recipient}`, price: amount, image: "/assets/41.webp", category: "礼品卡", description: details, stock: 1, inventoryVerified: true });
  }
  return <PageShell><main className="gift-page"><section className="gift-visual"><div className="gift-card-art"><span>púsy</span><small>PUSY.CN 中国礼品卡</small><b>{formatCnyFromRub(amount)}</b></div></section><section className="gift-copy"><p>送一份选择的自由</p><h1>PÚSY 礼品卡</h1><div className="gift-benefits" aria-label="礼品卡特点"><span><b>电子礼品卡</b><small>无需等待实体配送</small></span><span><b>邮件送达</b><small>可选择发送日期</small></span><span><b>灵活使用</b><small>余额可分多次使用</small></span></div><form className="gift-form" onSubmit={addGift}><div className="gift-amounts">{[1000, 3000, 5000, 10000].map((value) => <button type="button" className={amount === value ? "active" : ""} onClick={() => setAmount(value)} key={value}>{formatCnyFromRub(value)}</button>)}</div><p className="gift-desc">填写收件人姓名与邮箱后，记名电子礼品卡会发送至指定邮箱，可用于在 PUSY.CN 选购商品。</p><label>收件人姓名<input value={recipient} onChange={(event) => setRecipient(event.target.value)} required placeholder="例如：小美" /></label><label>收件人邮箱<input type="email" value={email} onChange={(event) => setEmail(event.target.value)} required placeholder="name@example.com" /></label><label>发送日期（留空则立即发送）<input type="date" value={deliveryDate} onChange={(event) => setDeliveryDate(event.target.value)} /></label><label>祝福语<textarea value={message} onChange={(event) => setMessage(event.target.value)} maxLength={160} rows={3} placeholder="写下一段祝福…" /><small>{message.length}/160</small></label><button className="gift-add">加入购物袋</button></form><details><summary>如何使用</summary><p>结账时输入礼品卡代码即可抵扣对应金额。余额可分多次使用，使用礼品卡购买商品发生退货时，退款原则上退回原礼品卡。</p></details><details><summary>有效期与退卡</summary><p>记名电子礼品卡不设有效期。退卡、余额返还及经营终止时的处理方式，按照中国发卡协议和适用的预付卡管理规定执行。</p></details></section></main></PageShell>;
}
