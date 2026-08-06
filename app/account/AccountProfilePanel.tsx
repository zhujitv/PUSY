"use client";

import { useState } from "react";
import { parseSelections, preferredCategories, skinConcerns, tierName } from "./account-config";
import { SocialAccountsPanel } from "./AccountSocialGrowth";
import type { Member, MemberProfile, SocialAccount, SocialProviderState } from "./account-types";

export function ProfilePanel({ member, profile, socialAccounts, socialProviders, onSubmit, onPhoneVerified, onAct }: { member: Member; profile: MemberProfile; socialAccounts: SocialAccount[]; socialProviders: SocialProviderState[]; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void; onPhoneVerified: () => void; onAct: (payload: Record<string, unknown>) => Promise<boolean> }) {
  const selectedConcerns = parseSelections(profile.skin_concerns);
  const selectedCategories = parseSelections(profile.preferred_categories);
  const completionValues = [member.name, member.phone, profile.nickname, profile.gender, profile.birthday, profile.province, profile.city, profile.skin_type];
  const completion = Math.round((completionValues.filter(Boolean).length / completionValues.length) * 100);
  const tier = tierName(member.tier);
  const initial = (profile.nickname || member.name || "P").slice(0, 1).toUpperCase();
  const [avatar, setAvatar] = useState(profile.avatar_url || "");
  const [avatarError, setAvatarError] = useState("");
  const [profileLoadedAt] = useState(() => Date.now());
  const nextNicknameDate = profile.nickname_updated_at ? new Date(new Date(profile.nickname_updated_at).getTime() + 30 * 86400000) : null;
  const nicknameLocked = Boolean(nextNicknameDate && nextNicknameDate.getTime() > profileLoadedAt);

  function chooseAvatar(file?: File) {
    setAvatarError("");
    if (!file) return;
    if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) { setAvatarError("仅支持 JPG、PNG 或 WebP 图片"); return; }
    if (file.size > 450 * 1024) { setAvatarError("头像图片不能超过 450KB"); return; }
    const reader = new FileReader();
    reader.onload = () => setAvatar(String(reader.result ?? ""));
    reader.onerror = () => setAvatarError("头像读取失败，请重新选择");
    reader.readAsDataURL(file);
  }

  return <section className="member-section member-profile-section">
    <div className="profile-summary">
      <div className={`profile-avatar ${avatar ? "has-image" : ""}`} aria-hidden="true">{avatar ? <img src={avatar} alt="" /> : initial}</div>
      <div><p>PÚSY CLUB 会员</p><h2>{profile.nickname || member.name}</h2><span>{tier} · 加入于 {new Date(member.joined_at).toLocaleDateString("zh-CN")}</span></div>
      <div className="profile-completion"><span>资料完整度 <b>{completion}%</b></span><div><i style={{ width: `${completion}%` }} /></div><small>{completion === 100 ? "资料已经完善" : "完善资料，获得更合适的商品推荐"}</small></div>
    </div>
    <form className="profile-form" onSubmit={onSubmit}>
      <fieldset><legend><span>01</span><div><b>基本资料</b><small>用于账户识别、配送联系和会员服务</small></div></legend><div className="member-form">
        <div className="profile-avatar-editor full"><div className={`profile-avatar-preview ${avatar ? "has-image" : ""}`}>{avatar ? <img src={avatar} alt="头像预览" /> : initial}</div><div><b>个性化头像</b><span>支持 JPG、PNG、WebP，不超过 450KB</span><div><label>选择图片<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(event) => chooseAvatar(event.target.files?.[0])} /></label>{avatar && <button type="button" onClick={() => setAvatar("")}>移除头像</button>}</div>{avatarError && <small role="alert">{avatarError}</small>}</div><input type="hidden" name="avatarUrl" value={avatar} /></div>
        <label>昵称<input name="nickname" maxLength={30} minLength={2} defaultValue={profile.nickname} disabled={nicknameLocked} placeholder="希望我们如何称呼你" /><small>{nicknameLocked && nextNicknameDate ? `冷却中，下次可于 ${nextNicknameDate.toLocaleDateString("zh-CN")} 修改` : `修改昵称将扣除 500 积分，当前可用 ${member.points_balance} 积分`}</small>{nicknameLocked && <input type="hidden" name="nickname" value={profile.nickname} />}</label>
        <label>真实姓名<input name="name" maxLength={50} autoComplete="name" defaultValue={member.name} required /></label>
        <PhoneVerification member={member} onVerified={onPhoneVerified} />
        <label>性别<select name="gender" defaultValue={profile.gender}><option value="">请选择</option><option value="female">女</option><option value="male">男</option><option value="undisclosed">不愿透露</option></select></label>
        <label>出生日期<input name="birthday" type="date" max={new Date(profileLoadedAt).toISOString().slice(0, 10)} defaultValue={profile.birthday} /></label>
        <label className="full">登录邮箱<input value={member.email} disabled /><small>登录邮箱已完成验证。如需更换，请联系客户服务进行身份核验。</small></label>
      </div></fieldset>

      <fieldset><legend><span>02</span><div><b>账号与登录</b><small>邮箱是主认证方式，微信与支付宝绑定均为选填</small></div></legend><SocialAccountsPanel accounts={socialAccounts} providers={socialProviders} onAct={onAct} /></fieldset>

      <fieldset><legend><span>03</span><div><b>美妆档案</b><small>选填，用于优化商品推荐，不影响正常购物</small></div></legend><div className="member-form">
        <label>肤质<select name="skinType" defaultValue={profile.skin_type}><option value="">请选择</option><option value="normal">中性肌</option><option value="dry">干性肌</option><option value="oily">油性肌</option><option value="combination">混合肌</option><option value="sensitive">敏感肌</option></select></label>
        <div className="profile-choice full"><span>主要护理诉求</span><div>{skinConcerns.map((item) => <label key={item}><input type="checkbox" name="skinConcerns" value={item} defaultChecked={selectedConcerns.includes(item)} />{item}</label>)}</div></div>
        <div className="profile-choice full"><span>感兴趣的品类</span><div>{preferredCategories.map((item) => <label key={item}><input type="checkbox" name="preferredCategories" value={item} defaultChecked={selectedCategories.includes(item)} />{item}</label>)}</div></div>
      </div></fieldset>

      <fieldset><legend><span>04</span><div><b>联系与偏好</b><small>补充常用地区与联系方式</small></div></legend><div className="member-form">
        <label>所在省份<input name="province" maxLength={30} autoComplete="address-level1" defaultValue={profile.province} placeholder="例如：上海市" /></label>
        <label>所在城市<input name="city" maxLength={30} autoComplete="address-level2" defaultValue={profile.city} placeholder="例如：上海市" /></label>
        <label>微信号<input name="wechat" maxLength={50} defaultValue={profile.wechat} placeholder="选填" /></label>
        <label>职业<input name="occupation" maxLength={50} autoComplete="organization-title" defaultValue={profile.occupation} placeholder="选填" /></label>
        <label className="full">个人简介<textarea name="bio" maxLength={200} defaultValue={profile.bio} placeholder="可以写下你的风格偏好，最多 200 字" /></label>
        <div className="profile-consent full"><label><input name="emailMarketing" type="checkbox" defaultChecked={Boolean(profile.email_marketing)} /><span><b>邮件新品通知</b><small>接收新品、补货和会员活动信息</small></span></label><label><input name="smsMarketing" type="checkbox" defaultChecked={Boolean(profile.sms_marketing)} /><span><b>短信会员通知</b><small>接收会员活动和专属权益提醒</small></span></label></div>
      </div></fieldset>
      <footer className="profile-form-footer"><p>你的资料将用于提供会员服务，可随时回来修改。</p><button type="submit">保存全部资料</button></footer>
    </form>
  </section>;
}

function PhoneVerification({ member, onVerified }: { member: Member; onVerified: () => void }) {
  const [phone, setPhone] = useState(member.phone);
  const [code, setCode] = useState("");
  const [challengeId, setChallengeId] = useState("");
  const [message, setMessage] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(action: "request-phone-code" | "verify-phone") {
    setBusy(true);
    setMessage("");
    const response = await fetch("/api/account/auth", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action, phone, code, challengeId }) });
    const body = await response.json().catch(() => ({}));
    if (response.ok && action === "request-phone-code") setChallengeId(body.challengeId || "");
    if (response.ok && action === "verify-phone") { setChallengeId(""); setCode(""); onVerified(); }
    setMessage(body.message || body.error || (response.ok ? "操作成功" : "操作失败"));
    setBusy(false);
  }

  return <div className="phone-verification full">
    <label>手机号码（选填） <small>{member.phone_verified ? "已验证，用于配送和售后联系" : "不影响邮箱登录，可稍后验证"}</small><input type="tel" maxLength={20} autoComplete="tel" value={phone} onChange={(event) => { setPhone(event.target.value); setChallengeId(""); }} placeholder="请输入中国大陆手机号" /></label>
    <div><button type="button" disabled={busy || !phone} onClick={() => void submit("request-phone-code")}>{busy ? "处理中…" : member.phone_verified && phone === member.phone ? "更换并验证" : "发送短信验证码"}</button>{challengeId && <><input aria-label="手机验证码" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(event) => setCode(event.target.value)} placeholder="6 位验证码" /><button type="button" disabled={busy || code.length !== 6} onClick={() => void submit("verify-phone")}>确认验证</button></>}</div>
    {message && <small role="status">{message}</small>}
  </div>;
}
