"use client";

import { useState } from "react";

const categories = ["订单咨询", "商品咨询", "配送问题", "支付问题", "售后问题", "会员与账号", "隐私与数据", "其他问题"];

export function ContactForm({ defaultCategory = "", defaultOrderId = "" }: { defaultCategory?: string; defaultOrderId?: string }) {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; id?: string } | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setResult(null);
    const form = event.currentTarget;
    try {
      const response = await fetch("/api/support", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(Object.fromEntries(new FormData(form).entries())),
      });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) {
        setResult({ ok: false, message: body.error || "提交失败，请稍后再试" });
        return;
      }
      setResult({ ok: true, message: body.message, id: body.id });
      form.reset();
    } catch {
      setResult({ ok: false, message: "网络连接失败，请检查网络后重试" });
    } finally {
      setBusy(false);
    }
  }

  return <form className="contact-service-form" onSubmit={submit}>
    <div className="contact-form-grid">
      <label>姓名<input name="name" autoComplete="name" maxLength={60} required /></label>
      <label>手机号码<input name="phone" type="tel" inputMode="numeric" autoComplete="tel" pattern="1[3-9][0-9]{9}" maxLength={11} placeholder="用于客服与您联系" required /></label>
      <label>问题类型<select name="category" defaultValue={categories.includes(defaultCategory) ? defaultCategory : ""} required><option value="" disabled>请选择</option>{categories.map((category) => <option key={category}>{category}</option>)}</select></label>
      <label>希望如何联系<select name="contactPreference" defaultValue="电话或短信" required><option>电话或短信</option><option>微信</option><option>电子邮箱</option></select></label>
      <label>微信号（选填）<input name="wechat" maxLength={60} placeholder="选择微信联系时请填写" /></label>
      <label>电子邮箱（选填）<input name="email" type="email" autoComplete="email" maxLength={160} placeholder="无需打开邮件客户端" /></label>
      <label className="full">订单号（选填）<input name="orderId" maxLength={64} defaultValue={defaultOrderId} placeholder="例如：PUSY-20260730-ABC123" /></label>
      <label className="full">问题说明<textarea name="message" rows={7} minLength={10} maxLength={4000} placeholder="请说明遇到的问题、期望处理方式及相关商品信息" required /></label>
      <label className="contact-form-trap" aria-hidden="true">网站<input name="website" tabIndex={-1} autoComplete="off" /></label>
    </div>
    <label className="contact-form-consent"><input type="checkbox" required />我同意 PUSY.CN 为处理本次咨询而使用以上联系信息，并已阅读<a href="/privacy">隐私政策</a>。</label>
    <button type="submit" disabled={busy}>{busy ? "正在提交…" : "提交客服工单"}</button>
    {result && <div className={`contact-form-result ${result.ok ? "success" : "error"}`} role="status" aria-live="polite">{result.ok && <b>提交成功</b>}<span>{result.message}</span>{result.id && <small>工单编号：{result.id}</small>}</div>}
  </form>;
}
