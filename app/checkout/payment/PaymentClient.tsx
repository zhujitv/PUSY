"use client";
import { useCallback, useEffect, useState } from "react";
import QRCode from "qrcode";

type Payment = { id: string; order_id: string; provider: string; amount_fen: number; status: string; checkout_url?: string; code_url?: string; last_error?: string };

export function PaymentClient() {
  const [payment, setPayment] = useState<Payment | null>(null);
  const [qrImage, setQrImage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [params, setParams] = useState({ orderId: "", provider: "", token: "" });

  const load = useCallback(async (orderId: string, token: string, sync = false) => {
    const response = await fetch(`/api/payments?orderId=${encodeURIComponent(orderId)}&token=${encodeURIComponent(token)}${sync ? "&sync=1" : ""}`, { cache: "no-store" });
    const body = await response.json();
    if (!response.ok) { setError(body.error || "支付状态读取失败"); return null; }
    setPayment(body.payment); setError(body.payment.last_error || ""); return body.payment as Payment;
  }, []);

  const create = useCallback(async (orderId: string, provider: string, token: string) => {
    setBusy(true); setError("");
    const response = await fetch("/api/payments", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ orderId, provider, token }) });
    const body = await response.json(); setBusy(false);
    if (!response.ok) { setError(body.error || "支付发起失败"); await load(orderId, token); return; }
    if (body.redirectUrl) { window.location.href = body.redirectUrl; return; }
    await load(orderId, token);
  }, [load]);

  useEffect(() => { const values = new URLSearchParams(window.location.search); const orderId = values.get("orderId") ?? ""; const provider = values.get("provider") ?? ""; const token = values.get("token") ?? ""; queueMicrotask(() => { setParams({ orderId, provider, token }); if (orderId && token) void load(orderId, token).then((value) => { if (!value && provider) void create(orderId, provider, token); }); else setError("支付链接不完整，请返回订单重新发起支付"); }); }, [create, load]);
  useEffect(() => { if (!payment?.code_url) return; void QRCode.toDataURL(payment.code_url, { width: 320, margin: 2, errorCorrectionLevel: "M", color: { dark: "#111111", light: "#ffffff" } }).then(setQrImage); }, [payment?.code_url]);
  useEffect(() => { if (!params.orderId || !params.token || !payment || !["created","pending"].includes(payment.status)) return; const timer = window.setInterval(() => { void load(params.orderId, params.token, true).then((value) => { if (value?.status === "paid") window.location.href = "/checkout/success"; }); }, 5000); return () => window.clearInterval(timer); }, [load, params.orderId, params.token, payment]);

  const paid = payment?.status === "paid";
  return <main className="payment-page"><section><p>安全收银台</p><h1>{paid ? "支付成功" : "完成支付"}</h1><div className="payment-card">{payment ? <><div className="payment-order"><span>订单号<b>{payment.order_id}</b></span><strong>{(payment.amount_fen / 100).toFixed(2)} 元</strong></div>{paid ? <div className="payment-result success"><i>✓</i><h2>订单支付成功</h2><p>订单状态已经同步，可以在会员中心查看。</p><a href="/account">查看订单</a></div> : payment.provider === "wechat" ? <div className="wechat-payment"><span className="payment-channel">微信支付</span>{qrImage ? <img src={qrImage} alt="微信支付二维码" /> : <div className="qr-placeholder">正在生成二维码…</div>}<h2>请使用微信扫码支付</h2><p>二维码有效期约 30 分钟，支付完成后页面会自动更新。</p></div> : <div className="alipay-payment"><span className="payment-channel">支付宝</span><h2>前往支付宝完成付款</h2><p>支付结果以支付宝服务器通知和订单查询为准。</p>{payment.checkout_url && <a href={payment.checkout_url}>打开支付宝收银台</a>}</div>}</> : <div className="payment-result"><div className="payment-spinner" /><p>正在准备支付信息…</p></div>}{error && <div className="payment-error"><b>暂时无法发起支付</b><p>{error}</p>{params.orderId && params.provider && params.token && <button disabled={busy} onClick={() => create(params.orderId, params.provider, params.token)}>{busy ? "正在重试…" : "重新发起支付"}</button>}</div>}</div><div className="payment-help"><a href="/account">返回我的订单</a><span>支付遇到问题？请联系 help@PUSY.CN</span></div></section></main>;
}
