"use client";

import { useEffect, useState } from "react";
import type { WalletLedgerEntry, WalletSummary } from "../../lib/wallet/types";

type WalletData = { summary: WalletSummary; ledger: WalletLedgerEntry[] };
type SecretKind = "account" | "payment";

function money(fen: number) { return new Intl.NumberFormat("zh-CN", { style: "currency", currency: "CNY" }).format(fen / 100); }

function SecurityForm({ kind, isSet, onSaved }: { kind: SecretKind; isSet: boolean; onSaved: () => void }) {
  const [challengeId, setChallengeId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);
  const label = kind === "payment" ? "支付密码" : "账户密码";

  async function requestCode() {
    setBusy(true); setMessage("正在发送…");
    const response = await fetch("/api/account/wallet", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: `request-${kind}-code` }) });
    const body = await response.json().catch(() => ({}));
    if (response.ok) setChallengeId(String(body.challengeId ?? ""));
    setMessage(body.message || body.error || "操作失败"); setBusy(false);
  }

  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setBusy(true); setMessage("正在验证并保存…");
    const values = Object.fromEntries(new FormData(event.currentTarget).entries());
    if (values.newPassword !== values.confirmPassword) { setMessage(`两次输入的${label}不一致`); setBusy(false); return; }
    const response = await fetch("/api/account/wallet", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: `set-${kind}-password`, challengeId, ...values }) });
    const body = await response.json().catch(() => ({}));
    setMessage(body.message || body.error || "操作失败"); setBusy(false);
    if (response.ok) { setChallengeId(""); event.currentTarget.reset(); onSaved(); }
  }

  return <form className="finance-security-form" onSubmit={submit}>
    <div><h3>{isSet ? `修改${label}` : `设置${label}`}</h3><span>{kind === "payment" ? "余额支付时必须验证，6 位数字且不能与账户密码相同。" : "用于密码登录，至少 10 位并同时包含字母和数字。"}</span></div>
    {isSet && <label>当前{label}<input name="currentPassword" type="password" inputMode={kind === "payment" ? "numeric" : undefined} autoComplete="current-password" required /></label>}
    <label>新{label}<input name="newPassword" type="password" inputMode={kind === "payment" ? "numeric" : undefined} autoComplete="new-password" minLength={kind === "payment" ? 6 : 10} maxLength={kind === "payment" ? 6 : 72} pattern={kind === "payment" ? "[0-9]{6}" : "(?=.*[A-Za-z])(?=.*[0-9]).{10,72}"} required /></label>
    <label>确认新{label}<input name="confirmPassword" type="password" inputMode={kind === "payment" ? "numeric" : undefined} autoComplete="new-password" required /></label>
    <label>邮箱验证码<div className="finance-code-field"><input name="code" inputMode="numeric" maxLength={6} pattern="[0-9]{6}" required /><button type="button" onClick={requestCode} disabled={busy}>获取验证码</button></div></label>
    {message && <p role="status">{message}</p>}
    <button disabled={busy || !challengeId}>{isSet ? `确认修改${label}` : `确认设置${label}`}</button>
  </form>;
}

export function AccountFinancePanel() {
  const [data, setData] = useState<WalletData | null>(null);
  const [error, setError] = useState("");
  async function load() {
    const response = await fetch("/api/account/wallet", { cache: "no-store" });
    const body = await response.json().catch(() => ({}));
    if (response.ok) setData(body); else setError(body.error || "财务中心加载失败");
  }
  useEffect(() => { queueMicrotask(() => void load()); }, []);
  if (!data) return <section className="member-section"><h2>财务中心</h2><p>{error || "正在加载账户余额…"}</p></section>;
  return <div className="member-finance">
    <section className="finance-balance-card"><div><p>ACCOUNT BALANCE</p><h2>账户余额</h2><b>{money(data.summary.availableBalanceFen)}</b><span>支付订单时自动优先使用</span></div><div><span>冻结金额<b>{money(data.summary.frozenBalanceFen)}</b></span><span>账户状态<b>{data.summary.status === "active" ? "正常" : "已冻结"}</b></span></div></section>
    <section className="member-section"><div className="member-section-title"><div><p>PAYMENT SECURITY</p><h2>支付与账户安全</h2></div></div><div className="finance-security-grid"><SecurityForm kind="account" isSet={data.summary.accountPasswordSet} onSaved={load} /><SecurityForm kind="payment" isSet={data.summary.paymentPasswordSet} onSaved={load} /></div></section>
    <section className="member-section"><div className="member-section-title"><div><p>{data.ledger.length} 条记录</p><h2>余额明细</h2></div></div>{data.ledger.length ? <div className="finance-ledger">{data.ledger.map((entry) => <article key={entry.id}><div><b>{entry.note || "余额变动"}</b><span>{entry.order_id ? `订单 ${entry.order_id}` : entry.reference_id}</span></div><strong className={entry.amount_fen >= 0 ? "credit" : "debit"}>{entry.amount_fen >= 0 ? "+" : "−"}{money(Math.abs(entry.amount_fen))}</strong><time>{new Date(entry.created_at).toLocaleString("zh-CN")}</time></article>)}</div> : <p className="finance-empty">暂无余额变动记录。</p>}</section>
  </div>;
}
