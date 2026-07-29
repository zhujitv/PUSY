"use client";

import { useState } from "react";

export function AdminLoginClient({ configured }: { configured: boolean }) {
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    const form = new FormData(event.currentTarget);
    const response = await fetch("/api/admin/auth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: form.get("password") }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) { setError(body.error || "登录失败"); setSubmitting(false); return; }
    window.location.href = "/admin";
  }

  return <main className="admin-login-page"><section className="admin-login-intro"><div><a href="/" className="admin-brand">PUSY.CN</a><span>CHINA COMMERCE ADMIN</span></div><div><p>统一经营工作台</p><h1>让每一次订单、沟通与服务，都清晰可追踪。</h1></div><ul><li>订单与支付集中处理</li><li>客服邮件与售后联动</li><li>会员、商品及内容统一管理</li></ul></section><form className="admin-login-card" onSubmit={submit}><header><span>安全访问</span><h2>登录管理后台</h2><p>仅限已授权的 PUSY.CN 管理人员使用</p></header>{configured ? <label>管理员密码<div className="admin-login-input"><i aria-hidden="true">●</i><input name="password" type="password" autoComplete="current-password" minLength={8} placeholder="请输入管理员密码" required autoFocus /></div></label> : <p className="member-auth-error" role="alert">后台尚未配置 ADMIN_PASSWORD 和 ADMIN_SESSION_SECRET，当前已安全关闭。</p>}{error && <p className="member-auth-error" role="alert">{error}</p>}<button disabled={!configured || submitting}>{submitting ? "正在验证身份…" : "进入管理后台"}<span aria-hidden="true">→</span></button><small>登录会话采用安全 Cookie，仅在当前设备保持。</small></form></main>;
}
