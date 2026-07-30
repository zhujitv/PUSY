"use client";
import { useState } from "react";

export function ReturnForm() {
  const [message, setMessage] = useState("");
  const [success, setSuccess] = useState(false);
  const [busy, setBusy] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true); setMessage(""); setSuccess(false);
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await fetch("/api/returns", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const body = await response.json();
    setBusy(false);
    if (!response.ok) return setMessage(body.error || "提交失败，请稍后重试");
    setSuccess(true); setMessage(`申请已提交，售后单号：${body.id}。客服审核后会通过工单与你联系。`); event.currentTarget.reset();
  }

  return <form className="return-form" onSubmit={submit}>
    <h2>在线申请退换货</h2>
    <div className="return-form-grid"><label>订单号<input name="orderId" placeholder="例如：PUSY-2026…" required /></label><label>下单邮箱<input name="email" type="email" placeholder="用于核验订单" required /></label></div>
    <label>申请原因<select name="reason" required defaultValue=""><option value="" disabled>请选择</option><option>商品破损或存在质量问题</option><option>收到错误商品</option><option>商品与预期不符</option><option>其他原因</option></select></label>
    <label>补充说明<textarea name="details" rows={5} maxLength={1000} placeholder="请描述商品状态和您的诉求" /></label>
    <p className="return-evidence-note">请先填写说明并提交申请；需要补充照片、视频或物流凭证时，客服会通过工单告知提交方式。</p>
    {message && <p className={success ? "return-success" : "checkout-error"}>{message}</p>}
    <button disabled={busy}>{busy ? "正在提交…" : "提交售后申请"}</button>
  </form>;
}
