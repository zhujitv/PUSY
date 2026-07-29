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

  return <main className="admin-login-page"><form className="admin-login-card" onSubmit={submit}><a href="/" className="admin-brand">PUSY.CN</a><p>中国区商城管理后台</p><h1>管理员登录</h1>{configured ? <label>管理员密码<input name="password" type="password" autoComplete="current-password" minLength={12} required autoFocus /></label> : <p className="member-auth-error" role="alert">后台尚未配置 ADMIN_PASSWORD 和 ADMIN_SESSION_SECRET，当前已安全关闭。</p>}{error && <p className="member-auth-error" role="alert">{error}</p>}<button disabled={!configured || submitting}>{submitting ? "正在验证…" : "安全登录"}</button></form></main>;
}
