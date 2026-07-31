"use client";

import { useState } from "react";

type Mode = "login" | "register";
type SocialProvider = "wechat" | "alipay";
type ProviderState = { provider: SocialProvider; label: string; configured: boolean };

export function MemberAuthClient({ referralCode = "", providers, socialStatus = "", socialProvider = "" }: { referralCode?: string; providers: ProviderState[]; socialStatus?: string; socialProvider?: string }) {
  const [mode, setMode] = useState<Mode>("login");
  const [bindingProvider, setBindingProvider] = useState<"none" | SocialProvider>("none");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [requestingCode, setRequestingCode] = useState(false);
  const [challengeId, setChallengeId] = useState("");
  const [prefillEmail, setPrefillEmail] = useState("");

  async function requestCode(event: React.MouseEvent<HTMLButtonElement>) {
    const form = event.currentTarget.form;
    if (!form) return;
    const requiredFields = mode === "register" ? ["name", "email"] : ["identifier"];
    for (const name of requiredFields) {
      const field = form.elements.namedItem(name);
      if (field instanceof HTMLInputElement && !field.reportValidity()) return;
    }
    const phone = form.elements.namedItem("phone");
    if (mode === "register" && phone instanceof HTMLInputElement && phone.value.trim() && !/^1[3-9]\d{9}$/.test(phone.value.replace(/[\s-]/g, ""))) {
      phone.setCustomValidity("请输入有效的中国大陆手机号，或留空稍后绑定");
      phone.reportValidity();
      phone.setCustomValidity("");
      return;
    }
    setRequestingCode(true);
    setError("");
    setMessage("");
    const payload = Object.fromEntries(new FormData(form).entries());
    const response = await fetch("/api/account/auth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "request-code", mode, ...payload }) });
    const body = await response.json().catch(() => ({}));
    if (!response.ok) {
      if (body.code === "registration-required") {
        setPrefillEmail(String(payload.identifier ?? ""));
        setMode("register");
      }
      setError(body.error || "验证码发送失败");
    } else { setChallengeId(body.challengeId || ""); setMessage(body.message || "验证码已发送"); }
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
    if (mode === "register" && bindingProvider !== "none") {
      window.location.href = `/api/account/social/${bindingProvider}?mode=bind&returnTo=${encodeURIComponent("/account?welcome=1")}`;
    } else {
      window.location.href = mode === "register" ? "/account?welcome=1" : "/account";
    }
  }

  function switchMode(nextMode: Mode) {
    setMode(nextMode);
    setError("");
    setMessage("");
    setChallengeId("");
    setBindingProvider("none");
  }

  const providerLabel = providers.find((item) => item.provider === socialProvider)?.label ?? "第三方账号";
  const socialNotice = socialStatus === "not-linked" ? `${providerLabel}尚未绑定会员，请先使用邮箱登录后再绑定。`
    : socialStatus === "not-configured" ? `${providerLabel}登录尚未配置完成，请先使用邮箱验证码登录。`
      : socialStatus === "cancelled" ? `已取消${providerLabel}授权。`
        : socialStatus === "failed" ? `${providerLabel}授权失败，请重试或使用邮箱验证码登录。`
          : socialStatus === "login-required" ? "请先登录会员账户，再绑定第三方账号。" : "";

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
        <span>{mode === "login" ? "使用已验证的邮箱登录，也可使用已经绑定的微信或支付宝。" : "使用邮箱验证码完成注册，手机号无需填写。"}</span>
      </div>
      {socialNotice && <p className="member-auth-social-notice" role="status">{socialNotice}</p>}
      <form className="member-auth-form" onSubmit={submit}>
        {mode === "register" && <>
          <label>姓名<input name="name" autoComplete="name" placeholder="请输入姓名" required /></label>
          <label>电子邮箱<input name="email" type="email" autoComplete="email" placeholder="name@example.com" defaultValue={prefillEmail} required /></label>
          <label>手机号码（选填）<input name="phone" type="tel" inputMode="numeric" autoComplete="tel" placeholder="可在会员中心稍后绑定" /></label>
          <label>邀请码（选填）<input name="referralCode" defaultValue={referralCode} maxLength={20} placeholder="好友分享链接会自动填写" /></label>
        </>}
        {mode === "login" && <label>邮箱地址<input name="identifier" type="email" autoComplete="username" placeholder="请输入注册邮箱" required /></label>}
        <label>验证码
          <div className="member-code-field">
            <input name="code" inputMode="numeric" autoComplete="one-time-code" maxLength={6} placeholder="6 位验证码" required />
            <button type="button" disabled={requestingCode} onClick={requestCode}>{requestingCode ? "正在发送…" : "获取验证码"}</button>
          </div>
        </label>
        {mode === "register" && <fieldset className="member-auth-bind-choice"><legend>注册后绑定（选填）</legend><p>绑定后可使用对应账号快捷登录；也可以跳过，稍后在会员中心设置。</p><div>
          <label className={bindingProvider === "none" ? "active" : ""}><input type="radio" name="bindingProvider" value="none" checked={bindingProvider === "none"} onChange={() => setBindingProvider("none")} /><span><i>✓</i><b>暂不绑定</b><small>仅使用邮箱登录</small></span></label>
          {providers.map((provider) => <label className={bindingProvider === provider.provider ? `active ${provider.provider}` : provider.provider} key={provider.provider}><input type="radio" name="bindingProvider" value={provider.provider} disabled={!provider.configured} checked={bindingProvider === provider.provider} onChange={() => setBindingProvider(provider.provider)} /><span><i>{provider.provider === "wechat" ? "微" : "支"}</i><b>绑定{provider.label}</b><small>{provider.configured ? "注册后前往安全授权" : "等待平台配置"}</small></span></label>)}
        </div></fieldset>}
        {mode === "register" && <label className="member-auth-consent"><input name="consent" type="checkbox" required /> <span>我已阅读并同意<a href="/oferta">用户服务协议</a>和<a href="/privacy">隐私政策</a>。</span></label>}
        {error && <p className="member-auth-error" role="alert">{error}</p>}
        {message && <p className="member-auth-message">{message}</p>}
        <button className="member-auth-submit" disabled={submitting || !challengeId}>{submitting ? "正在处理…" : mode === "login" ? "登录" : "注册并登录"}</button>
      </form>
      {mode === "login" && <div className="member-social-login"><span>或使用已绑定账号登录</span><div>{providers.map((provider) => <button type="button" className={provider.provider} disabled={!provider.configured} onClick={() => { window.location.href = `/api/account/social/${provider.provider}?mode=login`; }} key={provider.provider}><i>{provider.provider === "wechat" ? "微" : "支"}</i>{provider.configured ? `${provider.label}登录` : `${provider.label}待配置`}</button>)}</div></div>}
      <button className="member-auth-switch" type="button" onClick={() => switchMode(mode === "login" ? "register" : "login")}>
        {mode === "login" ? "还不是会员？立即注册 →" : "已经是会员？返回登录 →"}
      </button>
    </section>
  </main>;
}
