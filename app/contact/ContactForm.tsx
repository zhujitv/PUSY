"use client";

import { useMemo, useState } from "react";
import { formatCnyFromRub } from "../data/products";

const categories = ["订单咨询", "商品咨询", "配送问题", "支付问题", "售后问题", "会员与账号", "隐私与数据", "其他问题"];

type ReturnOrderItem = { id: number; productSlug: string; productName: string; quantity: number; unitPrice: number; returnable: boolean };
type ReturnOrder = {
  id: string;
  customer: string;
  phone: string;
  email: string;
  total: number;
  delivery: string;
  status: string;
  createdAt: string;
  shipmentStatus: string | null;
  deliveredAt: string | null;
  existingReturnId: string | null;
  noReasonEligible: boolean;
  noReasonState: string;
  noReasonLabel: string;
  items: ReturnOrderItem[];
};

type FormResult = { ok: boolean; message: string; id?: string; returnId?: string };

export function ContactForm({ defaultCategory = "", defaultOrderId = "", defaultName = "", defaultEmail = "" }: { defaultCategory?: string; defaultOrderId?: string; defaultName?: string; defaultEmail?: string }) {
  const initialCategory = categories.includes(defaultCategory) ? defaultCategory : "";
  const [category, setCategory] = useState(initialCategory);
  const [email, setEmail] = useState(defaultEmail);
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<FormResult | null>(null);
  const [lookupBusy, setLookupBusy] = useState(false);
  const [lookupMessage, setLookupMessage] = useState("");
  const [lookupStage, setLookupStage] = useState<"idle" | "code" | "ready">("idle");
  const [challengeId, setChallengeId] = useState("");
  const [code, setCode] = useState("");
  const [orders, setOrders] = useState<ReturnOrder[]>([]);
  const [selectedOrderId, setSelectedOrderId] = useState("");
  const [selectedItems, setSelectedItems] = useState<Record<number, number>>({});
  const [requestType, setRequestType] = useState("refund");
  const [reason, setReason] = useState("");
  const [sealedConditionConfirmed, setSealedConditionConfirmed] = useState(false);
  const isAfterSales = category === "售后问题";
  const selectedOrder = useMemo(() => orders.find((order) => order.id === selectedOrderId) ?? null, [orders, selectedOrderId]);

  function chooseOrder(order: ReturnOrder) {
    setSelectedOrderId(order.id);
    setSelectedItems(Object.fromEntries(order.items.filter((item) => item.returnable).map((item) => [item.id, item.quantity])));
    if (!order.noReasonEligible && reason === "seven-day-no-reason") setReason("");
  }

  function applyOrders(payload: { email?: string; orders?: ReturnOrder[]; message?: string }) {
    const available = Array.isArray(payload.orders) ? payload.orders : [];
    setEmail(payload.email || email);
    setOrders(available);
    setLookupStage("ready");
    setLookupMessage(payload.message || (available.length ? `已找到 ${available.length} 笔订单` : "暂时没有可申请售后的交易订单"));
    const preferred = available.find((order) => order.id === defaultOrderId && !order.existingReturnId && order.items.some((item) => item.returnable))
      ?? available.find((order) => !order.existingReturnId && order.items.some((item) => item.returnable));
    if (preferred) chooseOrder(preferred);
    else { setSelectedOrderId(""); setSelectedItems({}); }
  }

  async function returnRequest(payload: Record<string, unknown>) {
    const response = await fetch("/api/returns", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const body = await response.json().catch(() => ({}));
    return { response, body };
  }

  async function lookupOrders() {
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email.trim())) { setLookupMessage("请先填写有效的下单邮箱"); return; }
    setLookupBusy(true); setLookupMessage(""); setResult(null);
    try {
      const lookup = await returnRequest({ action: "lookup-orders", email });
      if (lookup.response.ok) { applyOrders(lookup.body); return; }
      if (lookup.response.status !== 401 || lookup.body.code !== "email-verification-required") { setLookupMessage(lookup.body.error || "暂时无法查询订单"); return; }
      const requested = await returnRequest({ action: "request-order-code", email });
      if (!requested.response.ok) { setLookupMessage(requested.body.error || "验证码发送失败，请稍后重试"); return; }
      setChallengeId(requested.body.challengeId || "");
      setLookupStage("code");
      setLookupMessage(requested.body.message || "验证码已发送至下单邮箱");
    } catch { setLookupMessage("网络连接失败，请检查网络后重试"); }
    finally { setLookupBusy(false); }
  }

  async function verifyCode() {
    if (!/^\d{6}$/.test(code)) { setLookupMessage("请输入邮件中的 6 位验证码"); return; }
    setLookupBusy(true); setLookupMessage("");
    try {
      const verified = await returnRequest({ action: "verify-order-code", email, challengeId, code });
      if (!verified.response.ok) { setLookupMessage(verified.body.error || "验证码校验失败"); return; }
      setCode("");
      applyOrders(verified.body);
    } catch { setLookupMessage("网络连接失败，请检查网络后重试"); }
    finally { setLookupBusy(false); }
  }

  function resetLookup() {
    setLookupStage("idle"); setChallengeId(""); setCode(""); setOrders([]); setSelectedOrderId(""); setSelectedItems({}); setLookupMessage(""); setReason(""); setSealedConditionConfirmed(false);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setResult(null);
    const form = event.currentTarget;
    const values = Object.fromEntries(new FormData(form).entries());
    try {
      const endpoint = isAfterSales ? "/api/returns" : "/api/support";
      const payload: Record<string, unknown> = isAfterSales ? {
        ...values,
        action: "submit-return",
        orderId: selectedOrderId,
        requestType,
        reason,
        details: values.message,
        sealedConditionConfirmed,
        items: Object.entries(selectedItems).map(([orderItemId, quantity]) => ({ orderItemId: Number(orderItemId), quantity })),
      } : values;
      const response = await fetch(endpoint, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) { setResult({ ok: false, message: body.error || "提交失败，请稍后再试" }); return; }
      setResult({ ok: true, message: body.message, id: body.id, returnId: body.returnId });
      form.reset();
      setCategory(initialCategory);
      setEmail(defaultEmail);
      resetLookup();
      setRequestType("refund");
    } catch { setResult({ ok: false, message: "网络连接失败，请检查网络后重试" }); }
    finally { setBusy(false); }
  }

  return <form className="contact-service-form" onSubmit={submit}>
    <div className="contact-form-grid">
      <label>姓名<input name="name" autoComplete="name" maxLength={60} defaultValue={defaultName} required /></label>
      <label>手机号码<input name="phone" type="tel" inputMode="numeric" autoComplete="tel" pattern="1[3-9][0-9]{9}" maxLength={11} placeholder="用于客服与您联系" required /></label>
      <label>问题类型<select name="category" value={category} onChange={(event) => { setCategory(event.target.value); setResult(null); }} required><option value="" disabled>请选择</option>{categories.map((item) => <option key={item}>{item}</option>)}</select></label>
      <label>希望如何联系<select name="contactPreference" defaultValue="电话或短信" required><option>电话或短信</option><option>微信</option><option>电子邮箱</option></select></label>
      <label>微信号（选填）<input name="wechat" maxLength={60} placeholder="选择微信联系时请填写" /></label>
      <label>{isAfterSales ? "下单邮箱" : "电子邮箱（选填）"}<input name="email" type="email" autoComplete="email" maxLength={160} value={email} readOnly={isAfterSales && lookupStage === "ready"} onChange={(event) => { setEmail(event.target.value); if (lookupStage !== "idle") resetLookup(); }} placeholder={isAfterSales ? "用于验证并自动查询订单" : "无需打开邮件客户端"} required={isAfterSales} /></label>
      {!isAfterSales && <label className="full">订单号（选填）<input name="orderId" maxLength={64} defaultValue={defaultOrderId} placeholder="例如：PUSY-20260730-ABC123" /></label>}
      <label className="full">{isAfterSales ? "补充说明（选填）" : "问题说明"}<textarea name="message" rows={isAfterSales ? 5 : 7} minLength={isAfterSales ? undefined : 10} maxLength={4000} placeholder={isAfterSales ? "可补充商品状态、问题经过及期望处理方式" : "请说明遇到的问题、期望处理方式及相关商品信息"} required={!isAfterSales} /></label>
      <label className="contact-form-trap" aria-hidden="true">网站<input name="website" tabIndex={-1} autoComplete="off" /></label>
    </div>

    {isAfterSales && <fieldset className="contact-after-sales">
      <legend><span>售后订单</span><b>验证邮箱并选择订单</b></legend>
      <div className="contact-order-lookup"><div><b>{lookupStage === "ready" ? "订单身份已验证" : "系统自动调用交易订单"}</b><p>{lookupStage === "ready" ? `已验证 ${email}` : "会员登录后可直接查询；未登录客户将通过下单邮箱接收验证码。"}</p></div>{lookupStage === "ready" ? <button type="button" onClick={resetLookup}>更换邮箱</button> : <button type="button" disabled={lookupBusy} onClick={() => void lookupOrders()}>{lookupBusy ? "正在查询…" : "验证并查询订单"}</button>}</div>
      {lookupStage === "code" && <div className="contact-code-row"><label>邮箱验证码<input value={code} onChange={(event) => setCode(event.target.value.replace(/\D/g, "").slice(0, 6))} inputMode="numeric" autoComplete="one-time-code" placeholder="6 位验证码" /></label><button type="button" disabled={lookupBusy || code.length !== 6} onClick={() => void verifyCode()}>{lookupBusy ? "正在验证…" : "确认并显示订单"}</button></div>}
      {lookupMessage && <p className="contact-lookup-message" role="status" aria-live="polite">{lookupMessage}</p>}

      {lookupStage === "ready" && orders.length > 0 && <div className="contact-order-list" aria-label="可申请售后的订单">
        {orders.map((order) => {
          const unavailable = Boolean(order.existingReturnId) || !order.items.some((item) => item.returnable);
          return <label className={`contact-order-option ${selectedOrderId === order.id ? "selected" : ""} ${unavailable ? "disabled" : ""}`} key={order.id}>
            <input type="radio" name="selectedReturnOrder" checked={selectedOrderId === order.id} disabled={unavailable} onChange={() => chooseOrder(order)} />
            <span><b>{order.id}</b><small>{new Date(order.createdAt).toLocaleDateString("zh-CN")} · {order.status} · {order.items.reduce((sum, item) => sum + item.quantity, 0)} 件商品</small></span>
            <strong>{formatCnyFromRub(order.total)}</strong>
            <em className={order.noReasonEligible ? "eligible" : "review"}>{order.noReasonEligible ? "七日窗口内 · 待完好性审核" : order.noReasonLabel}</em>
          </label>;
        })}
      </div>}

      {selectedOrder && <div className="contact-return-details">
        <header><div><span>已选订单</span><b>{selectedOrder.id}</b></div><p>{selectedOrder.noReasonLabel}</p></header>
        <div className="contact-return-items"><h3>选择需要售后的商品</h3>{selectedOrder.items.map((item) => <article className={!item.returnable ? "disabled" : ""} key={item.id}><label><input type="checkbox" checked={selectedItems[item.id] !== undefined} disabled={!item.returnable} onChange={(event) => setSelectedItems((current) => { const next = { ...current }; if (event.target.checked) next[item.id] = 1; else delete next[item.id]; return next; })} /><span><b>{item.productName}</b><small>{item.returnable ? `购买数量 ${item.quantity}` : "电子礼品卡不适用实物退换货流程"}</small></span></label>{item.returnable && selectedItems[item.id] !== undefined && <label className="contact-return-quantity">申请数量<select aria-label={`${item.productName}申请数量`} value={selectedItems[item.id]} onChange={(event) => setSelectedItems((current) => ({ ...current, [item.id]: Number(event.target.value) }))}>{Array.from({ length: item.quantity }, (_, index) => <option value={index + 1} key={index + 1}>{index + 1}</option>)}</select></label>}</article>)}</div>
        <div className="contact-return-choice"><label>售后诉求<select value={requestType} disabled={reason === "seven-day-no-reason"} onChange={(event) => setRequestType(event.target.value)}><option value="refund">退货退款</option><option value="exchange">换货</option><option value="reship">漏发 / 错发补寄</option></select></label><label>申请原因<select value={reason} onChange={(event) => { const next = event.target.value; setReason(next); if (next === "seven-day-no-reason") setRequestType("refund"); }} required><option value="" disabled>请选择</option><option value="seven-day-no-reason" disabled={!selectedOrder.noReasonEligible}>七日无理由退货{!selectedOrder.noReasonEligible ? "（当前不可选）" : ""}</option><option value="quality">商品存在质量问题</option><option value="damaged">运输破损</option><option value="wrong-item">收到错误商品</option><option value="missing-item">商品漏发</option><option value="other">其他售后问题</option></select></label></div>
        {reason === "seven-day-no-reason" && <label className="contact-sealed-confirm"><input type="checkbox" checked={sealedConditionConfirmed} onChange={(event) => setSealedConditionConfirmed(event.target.checked)} required /><span><b>确认商品保持完好</b><small>商品必要的一次性密封包装未拆除或损坏，商品、配件、赠品和标签将一并退回。系统识别时间窗口不代表自动批准，仍需客服审核商品完好情况。</small></span></label>}
        <p className="contact-return-legal">质量问题、错发、漏发或运输破损不受七日无理由时间窗口的单独限制，请按实际情况选择原因。</p>
      </div>}
    </fieldset>}

    <label className="contact-form-consent"><input type="checkbox" required />我同意 PUSY.CN 为处理本次咨询而使用以上联系信息，并已阅读<a href="/privacy">隐私政策</a>。</label>
    <button type="submit" disabled={busy || (isAfterSales && (!selectedOrderId || !reason || !Object.keys(selectedItems).length))}>{busy ? "正在提交…" : isAfterSales ? "提交售后申请" : "提交客服工单"}</button>
    {result && <div className={`contact-form-result ${result.ok ? "success" : "error"}`} role="status" aria-live="polite">{result.ok && <b>提交成功</b>}<span>{result.message}</span>{result.returnId && <small>售后单号：{result.returnId}</small>}{result.id && <small>客服工单：{result.id}</small>}</div>}
  </form>;
}
