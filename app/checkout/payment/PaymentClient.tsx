"use client";
import { useCallback, useEffect, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";

type Payment = { id: string; order_id: string; provider: string; amount_fen: number; wallet_amount_fen: number; external_amount_fen: number; status: string; checkout_url?: string; code_url?: string; last_error?: string };
type Wallet = { availableBalanceFen: number; status: string; paymentPasswordSet: boolean };

export function PaymentClient() {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [qrImage, setQrImage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [params, setParams] = useState({ orderId: "", provider: "" });
  const [wallet, setWallet] = useState<Wallet | null>(null);
  const [paymentPassword, setPaymentPassword] = useState("");

  const load = useCallback(async (orderId: string, sync = false) => {
    const response = sync
      ? await fetch("/api/payments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "sync", orderId }) })
      : await fetch(`/api/payments?orderId=${encodeURIComponent(orderId)}`, { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) { setError(body.error || "支付状态读取失败"); return null; }
    setPayment(body.payment); setError(body.payment.last_error || ""); return body.payment as Payment;
  }, []);

  const create = useCallback(async (orderId: string, provider: string) => {
    setBusy(true); setError("");
    const response = await fetch("/api/payments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderId, provider, paymentPassword }) });
    const body = await response.json(); setBusy(false);
    if (!response.ok) { setError(body.error || "支付发起失败"); await load(orderId); return; }
    if (body.redirectUrl) { window.location.assign(body.redirectUrl); return; }
    await load(orderId);
  }, [load, paymentPassword]);

  useEffect(() => { const values = new URLSearchParams(window.location.search); const orderId = values.get("orderId") ?? ""; const provider = values.get("provider") ?? ""; queueMicrotask(() => { setParams({ orderId, provider }); if (orderId) void load(orderId); else setError("支付链接不完整，请返回订单重新发起支付"); }); fetch("/api/account/wallet", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((body) => setWallet(body?.summary ?? null)).catch(() => {}); }, [load]);
  useEffect(() => { if (!payment?.code_url) return; void QRCode.toDataURL(payment.code_url, { width: 320, margin: 2, errorCorrectionLevel: "M", color: { dark: "#111111", light: "#ffffff" } }).then(setQrImage); }, [payment?.code_url]);
  useEffect(() => { if (!params.orderId || !payment || !["created","pending"].includes(payment.status)) return; const timer = window.setInterval(() => { void load(params.orderId, true).then((value) => { if (value?.status === "paid") window.location.assign(`/checkout/success?orderId=${encodeURIComponent(params.orderId)}`); }); }, 10000); return () => window.clearInterval(timer); }, [load, params.orderId, payment]);

  const paid = payment?.status === "paid";
  return <main className="payment-page"><section><p>安全收银台</p><h1>{paid ? "支付成功" : "完成支付"}</h1><div className="payment-card">{payment ? <><div className="payment-order"><span>订单号<b>{payment.order_id}</b></span><strong>{(payment.amount_fen / 100).toFixed(2)} 元</strong>{payment.wallet_amount_fen > 0 && <small>账户余额 {(payment.wallet_amount_fen / 100).toFixed(2)} 元 · 渠道支付 {(payment.external_amount_fen / 100).toFixed(2)} 元</small>}</div>{paid ? <div className="payment-result success"><i>✓</i><h2>订单支付成功</h2><p>订单状态已经同步，可以在会员中心查看。</p><a href="/account">查看订单</a></div> : payment.provider === "wechat" ? <div className="wechat-payment"><span className="payment-channel">微信支付</span>{qrImage ? <Image src={qrImage} alt="微信支付二维码" width={320} height={320} unoptimized /> : <div className="qr-placeholder">正在生成二维码…</div>}<h2>请使用微信扫码支付</h2><p>二维码有效期约 30 分钟，支付完成后页面会自动更新。</p></div> : <div className="alipay-payment"><span className="payment-channel">支付宝</span><h2>前往支付宝完成付款</h2><p>支付结果以支付宝服务器通知和订单查询为准。</p>{payment.checkout_url && <a href={payment.checkout_url}>打开支付宝收银台</a>}</div>}</> : <div className="payment-result"><div className="payment-spinner" /><p>正在准备支付信息…</p></div>}{error && <div className="payment-error"><b>暂时无法读取支付状态</b><p>{error}</p>{wallet && wallet.availableBalanceFen > 0 && <label className="payment-password-retry">支付密码<input value={paymentPassword} onChange={(event) => setPaymentPassword(event.target.value.replace(/\D/g, "").slice(0, 6))} type="password" inputMode="numeric" placeholder={wallet.paymentPasswordSet ? "请输入 6 位支付密码" : "请先在财务中心设置"} disabled={!wallet.paymentPasswordSet} /></label>}{wallet && wallet.availableBalanceFen > 0 && !wallet.paymentPasswordSet && <a href="/account?tab=finance">前往财务中心设置支付密码</a>}{params.orderId && params.provider && <button disabled={busy || Boolean(wallet && wallet.availableBalanceFen > 0 && (!wallet.paymentPasswordSet || paymentPassword.length !== 6))} onClick={() => create(params.orderId, params.provider)}>{busy ? "正在重试…" : "重新发起支付"}</button>}</div>}</div><div className="payment-help"><a href="/account">返回我的订单</a><a href={`/contact?category=支付问题${params.orderId ? `&orderId=${encodeURIComponent(params.orderId)}` : ""}`}>支付遇到问题？提交客服工单</a></div></section></main>;
}
