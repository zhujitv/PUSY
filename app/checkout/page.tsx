"use client";
import { useEffect, useState } from "react";
import Image from "next/image";
import { PageShell } from "../components/SiteChrome";
import { useStore } from "../components/StoreProvider";
import { formatCnyFromRub, getProduct } from "../data/products";
import { calculateShippingFee, ELECTRONIC_DELIVERY, FREE_STANDARD_SHIPPING_THRESHOLD, SF_DELIVERY, STANDARD_DELIVERY } from "../../lib/shipping";
import type { WalletSummary } from "../../lib/wallet/types";

export default function CheckoutPage() {
  const { cart, subtotal, physicalSubtotal, requiresShipping, clearCart } = useStore();
  const [delivery, setDelivery] = useState<typeof STANDARD_DELIVERY | typeof SF_DELIVERY>(STANDARD_DELIVERY);
  const [payment, setPayment] = useState("支付宝");
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState("");
  const [couponCode, setCouponCode] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState("");
  const [discount, setDiscount] = useState(0);
  const [couponMessage, setCouponMessage] = useState("");
  const [wallet, setWallet] = useState<WalletSummary | null>(null);
  const [paymentPassword, setPaymentPassword] = useState("");
  const actualDelivery = requiresShipping ? delivery : ELECTRONIC_DELIVERY;
  const shipping = calculateShippingFee(actualDelivery, physicalSubtotal);
  const finalTotal = Math.max(0, subtotal + shipping - discount);
  const totalFen = Math.round(finalTotal * 12);
  const walletAmountFen = Math.min(totalFen, wallet?.status === "active" ? wallet.availableBalanceFen : 0);
  const externalAmountFen = totalFen - walletAmountFen;
  useEffect(() => { fetch("/api/account/wallet", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((body) => setWallet(body?.summary ?? null)).catch(() => {}); }, []);
  async function applyCoupon() { setCouponMessage("正在验证…"); const response = await fetch("/api/promotions/validate", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ code: couponCode, subtotal }) }); const body = await response.json(); if (response.ok && body.valid) { setAppliedCoupon(body.code); setDiscount(body.discount); setCouponMessage(`${body.message}，已优惠 ${formatCnyFromRub(body.discount)}`); } else { setAppliedCoupon(""); setDiscount(0); setCouponMessage(body.message || body.error || "优惠码不可用"); } }
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!cart.length || submitting) return;
    if (walletAmountFen > 0 && !wallet?.paymentPasswordSet) { setSubmitError("账户有可用余额，请先在财务中心设置支付密码"); return; }
    if (walletAmountFen > 0 && !/^\d{6}$/.test(paymentPassword)) { setSubmitError("请输入 6 位支付密码以使用账户余额"); return; }
    setSubmitting(true);
    setSubmitError("");
    const form = new FormData(event.currentTarget);
    const order = { id: "", createdAt: new Date().toISOString(), total: finalTotal, items: cart, customer: String(form.get("name") ?? ""), delivery: actualDelivery };
    const payload = { ...order, email: String(form.get("email") ?? ""), phone: String(form.get("phone") ?? ""), address: requiresShipping ? [form.get("province"), form.get("city"), form.get("address"), form.get("postcode")].filter(Boolean).join(" ") : "", payment, couponCode: appliedCoupon };
    const response = await fetch("/api/orders", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    if (!response.ok) { const body = await response.json().catch(() => ({})); setSubmitError(body.error || "订单创建失败，请稍后再试"); setSubmitting(false); return; }
    const result = await response.json();
    const createdOrderId = String(result.orderId ?? "");
    const savedOrder = { ...order, id: createdOrderId, total: Number(result.total ?? order.total) };
    window.localStorage.setItem("pusy-cn-last-order", JSON.stringify(savedOrder));
    const provider = payment === "微信支付" ? "wechat" : "alipay";
    const paymentToken = String(result.paymentToken ?? "");
    const paymentResponse = await fetch("/api/payments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderId: createdOrderId, provider, token: paymentToken, paymentPassword }) });
    const paymentResult = await paymentResponse.json().catch(() => ({}));
    if (!paymentResponse.ok) { clearCart(); window.location.assign(`/checkout/payment?orderId=${encodeURIComponent(createdOrderId)}&provider=${provider}`); return; }
    clearCart();
    if (paymentResult.redirectUrl) { window.location.assign(paymentResult.redirectUrl); return; }
    window.location.assign(`/checkout/payment?orderId=${encodeURIComponent(createdOrderId)}&provider=${provider}`);
  }
  if (!cart.length) return <PageShell><main className="commerce-page"><header><p>安全结账</p><h1>结账</h1></header><section className="large-empty"><h2>没有待结算商品</h2><a className="primary-link" href="/catalog/products">返回商品目录</a></section></main></PageShell>;
  return <PageShell><main className="checkout-page"><form onSubmit={submit}><section><p className="step-label">01 / 联系信息</p><h1>完成订单</h1><div className="form-grid"><label>姓名<input name="name" required autoComplete="name" /></label><label>手机号码<input name="phone" type="tel" required autoComplete="tel" inputMode="tel" pattern="1[3-9][0-9]{9}" title="请输入11位中国大陆手机号码" /></label><label className="full">电子邮箱<input name="email" type="email" required autoComplete="email" /></label></div></section>{requiresShipping ? <><section><p className="step-label">02 / 收货地址</p><div className="form-grid"><label>省份<input name="province" required autoComplete="address-level1" /></label><label>城市<input name="city" required autoComplete="address-level2" /></label><label className="full">详细地址<input name="address" required autoComplete="street-address" /></label><label>邮政编码<input name="postcode" inputMode="numeric" autoComplete="postal-code" /></label></div></section><section><p className="step-label">03 / 配送方式</p><div className="option-list">{([STANDARD_DELIVERY, SF_DELIVERY] as const).map((item) => { const fee = calculateShippingFee(item, physicalSubtotal); return <label className={delivery === item ? "selected" : ""} key={item}><input type="radio" name="delivery" value={item} checked={delivery === item} onChange={() => setDelivery(item)} /><span>{item}<small>{fee ? formatCnyFromRub(fee) : `实体商品满 ${formatCnyFromRub(FREE_STANDARD_SHIPPING_THRESHOLD)} 免费`}</small></span></label>; })}</div></section></> : <section className="digital-delivery-note"><p className="step-label">02 / 电子交付</p><h2>无需填写收货地址</h2><p>本单仅含电子礼品卡，支付完成后将按礼品卡中填写的收件人邮箱发送，不收取配送费。</p></section>}<section><p className="step-label">04 / 优惠码</p><div className="coupon-entry"><input value={couponCode} onChange={(event) => setCouponCode(event.target.value.toUpperCase())} placeholder="输入优惠码" /><button type="button" onClick={applyCoupon}>使用</button></div>{couponMessage && <p className={discount ? "coupon-success" : "coupon-message"}>{couponMessage}</p>}</section><section><p className="step-label">05 / 支付方式</p>{walletAmountFen > 0 && <div className="wallet-payment-summary"><div><b>账户余额优先</b><span>本次使用 ¥{(walletAmountFen / 100).toFixed(2)}</span></div>{externalAmountFen > 0 && <p>剩余 ¥{(externalAmountFen / 100).toFixed(2)} 将通过所选支付方式完成组合支付。</p>}{wallet?.paymentPasswordSet ? <label>支付密码<input value={paymentPassword} onChange={(event) => setPaymentPassword(event.target.value.replace(/\D/g, "").slice(0, 6))} type="password" inputMode="numeric" autoComplete="off" pattern="[0-9]{6}" placeholder="请输入 6 位支付密码" required /></label> : <p>使用余额前，请先<a href="/account?tab=finance">前往财务中心设置支付密码</a>。</p>}</div>}<div className="option-list payment-options">{["支付宝", "微信支付"].map((item) => <label className={payment === item ? "selected" : ""} key={item}><input type="radio" name="payment" value={item} checked={payment === item} onChange={() => setPayment(item)} /><span>{item}<small>{externalAmountFen > 0 ? `组合支付 ¥${(externalAmountFen / 100).toFixed(2)}` : "余额足额时不会扣款"}</small></span></label>)}</div></section><section className="checkout-consents"><p className="step-label">06 / 订单确认</p><label><input type="checkbox" required /><span>我已阅读并同意<a href="/oferta" target="_blank" rel="noopener noreferrer">用户服务与销售条款</a>及<a href="/privacy" target="_blank" rel="noopener noreferrer">隐私政策</a>。</span></label><label><input type="checkbox" required /><span>我已知悉：化妆品等商品的一次性密封包装拆除或损坏后，可能不适用七日无理由退货；质量问题仍依法处理。查看<a href="/return" target="_blank" rel="noopener noreferrer">退换货政策</a>。</span></label></section>{submitError && <p className="checkout-error">{submitError}</p>}<button className="checkout-submit" disabled={submitting}>{submitting ? "正在创建订单…" : `确认订单并支付 · ${formatCnyFromRub(finalTotal)}`}</button><p className="demo-note">账户余额会自动优先使用；余额不足时，再由微信或支付宝完成剩余金额。</p></form><aside className="checkout-summary"><h2>你的订单</h2>{cart.map((line) => { const product = line.product ?? getProduct(line.slug); return <article key={line.slug}><Image src={product.image} alt="" width={100} height={104} sizes="70px" /><span>{product.name}<small>数量 {line.quantity}</small></span><b>{formatCnyFromRub(product.price * line.quantity)}</b></article>; })}<div><p><span>商品</span><b>{formatCnyFromRub(subtotal)}</b></p><p><span>配送</span><b>{shipping ? formatCnyFromRub(shipping) : "免费"}</b></p>{discount > 0 && <p className="discount-line"><span>优惠 {appliedCoupon}</span><b>−{formatCnyFromRub(discount)}</b></p>}<p className="summary-total"><span>合计</span><b>{formatCnyFromRub(finalTotal)}</b></p></div></aside></main></PageShell>;
}
