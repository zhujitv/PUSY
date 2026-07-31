"use client";

import { useState } from "react";

type Mode = "login" | "register";

export function MemberAuthClient({ referralCode = "" }: { referralCode?: string }) {
  const [mode, setMode] = useState<Mode>("login");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [requestingCode, setRequestingCode] = useState(false);
  const [challengeId, setChallengeId] = useState("");

  async function requestCode(event: React.MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    if (!form || !form.reportValidity()) return;
    setRequestingCode(true);
    setError("");
    setMessage("");
    const payload = Object.fromEntries(new FormData(form).entries());
    const response = await fetch("/api/account/auth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "request-code", mode, ...payload }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) setError(body.error || "验证码发送失败");
    else { setChallengeId(body.challengeId || ""); setMessage(body.message || "验证码已发送"); }
    setRequestingCode(false);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSubmitting(true);
    setError("");
    setMessage("");
    const payload = Object.fromEntries(new FormData(event.currentTarget).entries());
    const response = await fetch("/api/account/auth", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ action: mode, challengeId, ...payload }),
    });
    const body = await response.json();
    if (!response.ok) {
      setError(body.error || "操作失败，请稍后重试");
      setSubmitting(false);
      return;
    }
    setMessage(body.message || "操作成功");
    window.location.href = "/account";
  }

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setError("");
    setMessage("");
    setChallengeId("");
  }

  return <main className="member-auth-page">
    <section className="member-auth-intro">
      <p>PÚSY CLUB</p>
      <h1>成为会员，<br />让每次购买<br />更简单。</h1>
      <ul>
        <li>查询订单与配送进度</li>
        <li>管理常用收货地址</li>
        <li>查看退换货与退款状态</li>
        <li>接收会员专属活动通知</li>
      </ul>
    </section>
    <section className="member-auth-card">
      <div className="member-auth-tabs" role="tablist" aria-label="会员登录与注册">
        <button type="button" role="tab" aria-selected={mode === "login"} className={mode === "login" ? "active" : ""} onClick={() => switchMode("login")}>会员登录</button>
        <button type="button" role="tab" aria-selected={mode === "register"} className={mode === "register" ? "active" : ""} onClick={() => switchMode("register")}>注册会员</button>
      </div>
      <div className="member-auth-heading">
        <p>{mode === "login" ? "欢迎回来" : "加入 PÚSY CLUB"}</p>
        <h2>{mode === "login" ? "登录会员账户" : "创建会员账户"}</h2>
        <span>{mode === "login" ? "使用已验证的手机号或邮箱登录。" : "邮箱验证完成后即可进入会员中心，手机号可在个人资料中验证。"}</span>
      </div>
      <form className="member-auth-form" onSubmit={submit}>
        {mode === "register" && <>
          <label>姓名<input name="name" autoComplete="name" placeholder="请输入姓名" required /></label>
          <label>手机号码<input name="phone" type="tel" inputMode="numeric" autoComplete="tel" placeholder="请输入中国大陆手机号" required /></label>
          <label>电子邮箱<input name="email" type="email" autoComplete="email" placeholder="name@example.com" required /></label>
          <label>邀请码（选填）<input name="referralCode" defaultValue={referralCode} maxLength={20} placeholder="好友分享链接会自动填写" /></label>
        </>}
        {mode === "login" && <label>手机号或邮箱<input name="identifier" autoComplete="username" placeholder="请输入手机号或邮箱" required /></label>}
        <label>验证码
          <div className="member-code-field">
            <input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="6 位验证码" required />
            <button type="button" disabled={requestingCode} onClick={requestCode}>{requestingCode ? "正在发送…" : "获取验证码"}</button>
          </div>
        </label>
        {mode === "register" && <label className="member-auth-consent"><input name="consent" type="checkbox" required /> <span>我已阅读并同意<a href="/oferta">用户服务协议</a>和<a href="/privacy">隐私政策</a>。</span></label>}
        {error && <p className="member-auth-error" role="alert">{error}</p>}
        {message && <p className="member-auth-message">{message}</p>}
        <button className="member-auth-submit" disabled={submitting || !challengeId}>{submitting ? "正在处理…" : mode === "login" ? "登录" : "注册并登录"}</button>
      </form>
      <button className="member-auth-switch" type="button" onClick={() => switchMode(mode === "login" ? "register" : "login")}>
        {mode === "login" ? "还不是会员？立即注册 →" : "已经是会员？返回登录 →"}
      </button>
    </section>
  </main>;
}
