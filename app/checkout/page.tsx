"use client";
import { useState } from "react";
import Image from "next/image";
import { PageShell } from "../components/SiteChrome";
import { useStore } from "../components/StoreProvider";
import { formatCnyFromRub, getProduct } from "../data/products";

export default function CheckoutPage() {
  const { cart, subtotal, clearCart } = useStore();
  const [delivery, setDelivery] = useState("标准快递");
  const [payment, setPayment] = useState("支付宝");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [discount, setDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState("");
  const shipping = delivery === "门店自提" || subtotal >= 5000 ? 0 : delivery === "顺丰速运" ? 590 : 390;
  const finalTotal = Math.max(0, subtotal + shipping - discount);
  async function applyCoupon() { setCouponMessage("正在验证…"); const response = await fetch("/api/promotions/validate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: couponCode, subtotal }) }); const body = await response.json(); if (response.ok && body.valid) { setAppliedCoupon(body.code); setDiscount(body.discount); setCouponMessage(`${body.message}，已优惠 ${formatCnyFromRub(body.discount)}`); } else { setAppliedCoupon(""); setDiscount(0); setCouponMessage(body.message || body.error || "优惠码不可用"); } }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cart.length || submitting) return;
    setSubmitting(true);
    setSubmitError("");
    const form = new FormData(event.currentTarget);
    const order = { id: "", createdAt: new Date().toISOString(), total: finalTotal, items: cart, customer: String(form.get("name") ?? ""), delivery };
    const payload = { ...order, email: String(form.get("email") ?? ""), phone: String(form.get("phone") ?? ""), address: [form.get("province"), form.get("city"), form.get("address"), form.get("postcode")].filter(Boolean).join(" "), payment, couponCode: appliedCoupon };
    const response = await fetch("/api/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    if (!response.ok) { const body = await response.json().catch(() => ({})); setSubmitError(body.error || "订单创建失败，请稍后再试"); setSubmitting(false); return; }
    const result = await response.json();
    const createdOrderId = String(result.orderId ?? "");
    const savedOrder = { ...order, id: createdOrderId, total: Number(result.total ?? order.total) };
    window.localStorage.setItem("pusy-cn-last-order", JSON.stringify(savedOrder));
    clearCart();
    const provider = payment === "微信支付" ? "wechat" : "alipay";
    const paymentToken = String(result.paymentToken ?? "");
    const paymentResponse = await fetch("/api/payments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderId: createdOrderId, provider, token: paymentToken }) });
    const paymentResult = await paymentResponse.json().catch(() => ({}));
    if (paymentResponse.ok && paymentResult.redirectUrl) { window.location.href = paymentResult.redirectUrl; return; }
    window.location.href = `/checkout/payment?orderId=${encodeURIComponent(createdOrderId)}&provider=${provider}`;
  }
  if (!cart.length) return <PageShell><main className="commerce-page"><header><p>安全结账</p><h1>结账</h1></header><section className="large-empty"><h2>没有待结算商品</h2><a className="primary-link" href="/catalog/products">返回商品目录</a></section></main></PageShell>;
  return <PageShell><main className="checkout-page"><form onSubmit={submit}><section><p className="step-label">01 / 联系信息</p><h1>完成订单</h1><div className="form-grid"><label>姓名<input name="name" required autoComplete="name" /></label><label>手机号码<input name="phone" type="tel" required autoComplete="tel" inputMode="tel" pattern="1[3-9][0-9]{9}" title="请输入11位中国大陆手机号码" /></label><label className="full">电子邮箱<input name="email" type="email" required autoComplete="email" /></label></div></section><section><p className="step-label">02 / 收货地址</p><div className="form-grid"><label>省份<input name="province" required autoComplete="address-level1" /></label><label>城市<input name="city" required autoComplete="address-level2" /></label><label className="full">详细地址<input name="address" required autoComplete="street-address" /></label><label>邮政编码<input name="postcode" inputMode="numeric" autoComplete="postal-code" /></label></div></section><section><p className="step-label">03 / 配送方式</p><div className="option-list">{["标准快递", "顺丰速运", "门店自提"].map((item) => <label className={delivery === item ? "selected" : ""} key={item}><input type="radio" name="delivery" value={item} checked={delivery === item} onChange={() => setDelivery(item)} /><span>{item}<small>{item === "门店自提" ? "免费" : item === "顺丰速运" ? formatCnyFromRub(590) : subtotal >= 5000 ? "免费" : formatCnyFromRub(390)}</small></span></label>)}</div></section><section><p className="step-label">04 / 优惠码</p><div className="coupon-entry"><input value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} placeholder="输入优惠码" /><button type="button" onClick={applyCoupon}>使用</button></div>{couponMessage && <p className={discount ? "coupon-success" : "coupon-message"}>{couponMessage}</p>}</section><section><p className="step-label">05 / 支付方式</p><div className="option-list payment-options">{["支付宝", "微信支付"].map((item) => <label className={payment === item ? "selected" : ""} key={item}><input type="radio" name="payment" value={item} checked={payment === item} onChange={() => setPayment(item)} /><span>{item}<small>人民币安全支付</small></span></label>)}</div></section><section className="checkout-consents"><p className="step-label">06 / 订单确认</p><label><input type="checkbox" required /><span>我已阅读并同意<a href="/oferta" target="_blank" rel="noopener noreferrer">用户服务与销售条款</a>及<a href="/privacy" target="_blank" rel="noopener noreferrer">隐私政策</a>。</span></label><label><input type="checkbox" required /><span>我已知悉：化妆品等商品的一次性密封包装拆除或损坏后，可能不适用七日无理由退货；质量问题仍依法处理。查看<a href="/return" target="_blank" rel="noopener noreferrer">退换货政策</a>。</span></label></section>{submitError && <p className="checkout-error">{submitError}</p>}<button className="checkout-submit" disabled={submitting}>{submitting ? "正在创建订单…" : `确认订单并支付 · ${formatCnyFromRub(finalTotal)}`}</button><p className="demo-note">订单将按后台启用的微信支付或支付宝渠道进入安全收银台；未配置完整时不会发起扣款。</p></form><aside className="checkout-summary"><h2>你的订单</h2>{cart.map((line) => { const product = line.product ?? getProduct(line.slug); return <article key={line.slug}><Image src={product.image} alt="" width={100} height={104} sizes="70px" /><span>{product.name}<small>数量 {line.quantity}</small></span><b>{formatCnyFromRub(product.price * line.quantity)}</b></article>; })}<div><p><span>商品</span><b>{formatCnyFromRub(subtotal)}</b></p><p><span>配送</span><b>{shipping ? formatCnyFromRub(shipping) : "免费"}</b></p>{discount > 0 && <p className="discount-line"><span>优惠 {appliedCoupon}</span><b>−{formatCnyFromRub(discount)}</b></p>}<p className="summary-total"><span>合计</span><b>{formatCnyFromRub(finalTotal)}</b></p></div></aside></main></PageShell>;
}
