"use client";

import { useState } from "react";
import Image from "next/image";
import type { GrowthSummary, SocialAccount, SocialProvider, SocialProviderState } from "./account-types";

function startSocialAuthorization(provider: SocialProvider, returnTo = "/account") {
  window.location.href = `/api/account/social/${provider}?mode=bind&returnTo=${encodeURIComponent(returnTo)}`;
}

export function SocialBindingPrompt({ accounts, providers, onProfile }: { accounts: SocialAccount[]; providers: SocialProviderState[]; onProfile: () => void }) {
  return <section className="member-welcome-bind"><div><p>邮箱认证成功</p><h2>欢迎加入 PÚSY CLUB</h2><span>你可以绑定一个常用账号，以后登录会更快捷；这一步可以跳过。</span></div><div>{providers.map((provider) => {
    const linked = accounts.some((account) => account.provider === provider.provider);
    return <button type="button" className={provider.provider} disabled={linked || !provider.configured} onClick={() => startSocialAuthorization(provider.provider, "/account?welcome=1")} key={provider.provider}><i>{provider.provider === "wechat" ? "微" : "支"}</i><span><b>{linked ? `已绑定${provider.label}` : `绑定${provider.label}`}</b><small>{linked ? "可用于快捷登录" : provider.configured ? "通过官方页面安全授权" : "等待平台配置"}</small></span></button>;
  })}<button type="button" className="skip" onClick={onProfile}>暂不绑定，完善资料 →</button></div></section>;
}

export function SocialAccountsPanel({ accounts, providers, onAct }: { accounts: SocialAccount[]; providers: SocialProviderState[]; onAct: (payload: Record<string, unknown>) => Promise<boolean> }) {
  return <div className="social-account-grid">{providers.map((provider) => {
    const account = accounts.find((item) => item.provider === provider.provider);
    return <article className={`${provider.provider} ${account ? "linked" : ""}`} key={provider.provider}><i>{provider.provider === "wechat" ? "微" : "支"}</i><div><b>{provider.label}</b><span>{account ? `已绑定 · ${new Date(account.created_at).toLocaleDateString("zh-CN")}` : provider.configured ? "尚未绑定" : "等待平台配置"}</span></div>{account ? <button type="button" onClick={() => { if (window.confirm(`确认解除${provider.label}绑定？邮箱登录不会受到影响。`)) void onAct({ action: "unlink-social", provider: provider.provider }); }}>解除绑定</button> : <button type="button" disabled={!provider.configured} onClick={() => startSocialAuthorization(provider.provider)}>{provider.configured ? "立即绑定" : "暂不可用"}</button>}</article>;
  })}</div>;
}

export function MemberGrowthPanel({ growth, onAct, onProfile }: { growth: GrowthSummary; onAct: (payload: Record<string, unknown>) => Promise<boolean>; onProfile: () => void }) {
  const [copyMessage, setCopyMessage] = useState("");
  async function copyInvite() {
    try { await navigator.clipboard.writeText(growth.referral.link); setCopyMessage("邀请链接已复制"); }
    catch { setCopyMessage("复制失败，请手动复制链接"); }
  }
  async function shareInvite() {
    if (!navigator.share) return copyInvite();
    try { await navigator.share({ title: "加入 PÚSY CLUB", text: `使用我的邀请码 ${growth.referral.code} 注册，完成首单双方都能获得积分。`, url: growth.referral.link }); }
    catch { /* 用户取消分享时不显示错误 */ }
  }
  return <div className="growth-member-stack">
    <section className="member-growth-hero"><div><p>MEMBER MISSIONS</p><h2>做喜欢的事，<br />顺便赚积分。</h2><span>签到、完善资料、分享真实体验或邀请好友，都能积累会员积分。</span></div><article><span>今日签到</span><b>{growth.checkin.completedToday ? `连续 ${growth.checkin.streak} 天` : "等待签到"}</b><button disabled={growth.checkin.completedToday} onClick={() => void onAct({ action: "daily-checkin" })}>{growth.checkin.completedToday ? "今天已签到" : "签到领积分"}</button></article></section>
    <section className="member-section"><div className="member-section-title"><div><p>{growth.tasks.filter((task) => task.completed).length} 项已完成</p><h2>会员任务中心</h2></div></div><div className="member-task-grid">{growth.tasks.map((task) => <article className={task.completed ? "completed" : ""} key={task.key}><i>{task.completed ? "✓" : "+"}</i><div><b>{task.title}</b><p>{task.description}</p>{task.repeatable && task.count ? <small>已成功完成 {task.count} 次</small> : null}</div><strong>+{task.points}</strong></article>)}</div></section>
    <section className="member-section referral-program"><div className="member-section-title"><div><p>好友完成首单后双方自动到账</p><h2>邀请好友奖励</h2></div><span>已奖励 {growth.referral.rewarded} 人</span></div><div className="referral-layout"><div className="referral-qr-card"><div className="referral-qr"><Image src="/api/account/referral-qr" alt="PÚSY CLUB 邀请二维码" width={440} height={440} unoptimized /></div><b>扫码加入 PÚSY CLUB</b><span>分享美丽，也分享礼遇</span></div><div className="referral-copy"><span>你的专属邀请码</span><strong>{growth.referral.code}</strong><div className="referral-rewards"><article><i>你</i><span><small>邀请奖励</small><b>+{growth.referral.inviterReward}</b><em>积分</em></span></article><article><i>TA</i><span><small>好友首单礼</small><b>+{growth.referral.friendReward}</b><em>积分</em></span></article></div><p>好友通过你的链接注册并完成首单，双方奖励将自动到账。</p><label>专属邀请链接<input readOnly value={growth.referral.link} onFocus={(event) => event.currentTarget.select()} /></label><div><button onClick={() => void copyInvite()}>复制邀请链接</button><button className="secondary" onClick={() => void shareInvite()}>分享给好友</button></div>{copyMessage && <small>{copyMessage}</small>}<div className="referral-status"><span><i />{growth.referral.pending} 位好友等待完成首单</span><span><i />{growth.referral.rewarded} 位好友已获得奖励</span></div></div></div></section>
    <section className="member-section"><div className="member-section-title"><div><p>生日、周年与等级专属资格</p><h2>本年度会员权益</h2></div></div><div className="member-benefit-grid">{growth.benefits.map((benefit) => <article className={benefit.granted ? "active" : ""} key={benefit.key}><i>{benefit.granted ? "✓" : "◇"}</i><b>{benefit.title}</b><p>{benefit.description}</p><span>{benefit.granted ? "已解锁" : benefit.configured ? "尚未解锁" : "需要完善生日资料"}</span>{!benefit.configured && <button onClick={onProfile}>完善资料</button>}</article>)}</div></section>
  </div>;
}
