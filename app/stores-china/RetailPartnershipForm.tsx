"use client";

import { useState } from "react";

export function RetailPartnershipForm() {
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ ok: boolean; message: string; id?: string } | null>(null);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setResult(null);
    const form = event.currentTarget;
    const payload = Object.fromEntries(new FormData(form).entries());
    try {
      const response = await fetch("/api/retail-partnerships", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(payload),
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

  return (
    <form className="retail-partnership-form" onSubmit={submit}>
      <div className="retail-form-grid">
        <label>联系人姓名<input name="contactName" autoComplete="name" maxLength={40} required /></label>
        <label>手机号码<input name="phone" type="tel" inputMode="numeric" autoComplete="tel" pattern="1[3-9][0-9]{9}" maxLength={11} placeholder="用于接收合作联系" required /></label>
        <label>公司 / 门店名称<input name="company" autoComplete="organization" maxLength={100} required /></label>
        <label>所在城市<input name="city" autoComplete="address-level2" maxLength={60} placeholder="例如：上海市" required /></label>
        <label>合作类型<select name="cooperationType" defaultValue="" required><option value="" disabled>请选择</option><option>线下门店</option><option>电商平台</option><option>区域经销</option><option>企业采购</option><option>其他合作</option></select></label>
        <label>微信号（选填）<input name="wechat" maxLength={60} /></label>
        <label className="full">电子邮箱（选填）<input name="email" type="email" autoComplete="email" maxLength={120} placeholder="没有设置邮箱可留空" /></label>
        <label className="full">合作方案<textarea name="proposal" rows={5} maxLength={1500} placeholder="请简要介绍公司、渠道资源、计划销售区域及合作设想" required /></label>
        <label className="retail-form-trap" aria-hidden="true">网站<input name="website" tabIndex={-1} autoComplete="off" /></label>
      </div>
      <label className="retail-form-consent"><input type="checkbox" required /> 我同意 PUSY.CN 为处理本次合作咨询而使用以上联系信息，并已阅读<a href="/privacy">隐私政策</a>。</label>
      <button type="submit" disabled={busy}>{busy ? "正在提交…" : "提交合作申请"}</button>
      {result && <div className={`retail-form-result ${result.ok ? "success" : "error"}`} role="status">{result.ok && <b>提交成功</b>}<span>{result.message}</span>{result.id && <small>受理编号：{result.id}</small>}</div>}
    </form>
  );
}
