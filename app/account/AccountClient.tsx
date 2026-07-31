"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { formatCnyFromRub, products, type Product } from "../data/products";
import { useStore } from "../components/StoreProvider";

type Member = { id: number; name: string; email: string; phone: string; email_verified: number; phone_verified: number; status: string; total_orders: number; total_spent: number; points_balance: number; lifetime_points: number; tier: string; joined_at: string };
type MemberProfile = { member_id: number; nickname: string; gender: string; birthday: string; wechat: string; province: string; city: string; occupation: string; skin_type: string; skin_concerns: string; preferred_categories: string; bio: string; email_marketing: number; sms_marketing: number; updated_at: string };
type Address = { id: number; label: string; recipient: string; phone: string; province: string; city: string; district: string; detail: string; postcode: string; is_default: number };
type Order = { id: string; total: number; discount: number; delivery: string; payment: string; address: string; status: string; item_count: number; created_at: string };
type OrderItem = { id: number; order_id: string; product_slug: string; product_name: string; quantity: number; unit_price: number };
type ReturnItem = { id: string; order_id: string; reason: string; details: string; status: string; request_type: string; refund_id?: string; return_carrier?: string; return_tracking_number?: string; resolution?: string; created_at: string };
type Shipment = { id: string; order_id: string; carrier_name: string; tracking_number: string; status: string; tracking_url: string; shipped_at: string };
type ShipmentEvent = { id: number; shipment_id: string; event_time: string; status: string; description: string; location: string };
type Invoice = { id: string; order_id: string; invoice_type: string; title: string; tax_number: string; recipient_email: string; amount: number; status: string; invoice_number: string; file_url: string; rejection_reason: string; requested_at: string; issued_at?: string };
type PointsEntry = { id: number; points: number; balance_after: number; reason: string; created_at: string };
type MemberCoupon = { id: number; code: string; kind: string; value: number; minimum: number; ends_at?: string; status: string; assigned_at: string };
type ProductAlert = { id: number; product_slug: string; product_name: string; image: string; alert_type: string; target_price?: number; price: number; stock: number; last_notified_at?: string; created_at: string };
type MemberTag = { id: number; name: string; color: string };
type SocialProvider = "wechat" | "alipay";
type SocialAccount = { provider: SocialProvider; created_at: string; updated_at: string };
type SocialProviderState = { provider: SocialProvider; label: string; configured: boolean };
type GrowthTask = { key: string; title: string; description: string; points: number; completed: boolean; repeatable?: boolean; count?: number };
type MemberBenefit = { key: string; title: string; description: string; configured: boolean; granted: boolean };
type GrowthSummary = { tasks: GrowthTask[]; checkin: { completedToday: boolean; streak: number }; referral: { code: string; link: string; pending: number; rewarded: number; friendReward: number; inviterReward: number }; benefits: MemberBenefit[] };
type AccountData = { member: Member; profile: MemberProfile; addresses: Address[]; orders: Order[]; orderItems: OrderItem[]; returns: ReturnItem[]; invoices: Invoice[]; pointsLedger: PointsEntry[]; coupons: MemberCoupon[]; productAlerts: ProductAlert[]; tags: MemberTag[]; shipments: Shipment[]; shipmentEvents: ShipmentEvent[]; socialAccounts: SocialAccount[]; socialProviders: SocialProviderState[]; growth: GrowthSummary };

export function AccountClient({ viewer, email, showWelcome = false, socialStatus = "", socialProvider = "" }: { viewer: string; email: string; showWelcome?: boolean; socialStatus?: string; socialProvider?: string }) {
  const { wishlist, toggleWishlist, addToCart } = useStore();
  const [tab, setTab] = useState("overview");
  const [data, setData] = useState<AccountData | null>(null);
  const [editingAddress, setEditingAddress] = useState<Address | null>(null);
  const [creatingAddress, setCreatingAddress] = useState(false);
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(true);
  const [accountProducts, setAccountProducts] = useState<Product[]>(products);

  async function load() {
    setLoading(true);
    const response = await fetch("/api/account", { cache: "no-store" });
    const body = await response.json();
    if (response.ok) setData(body); else setMessage(body.error || "会员资料加载失败");
    setLoading(false);
  }
  useEffect(() => { queueMicrotask(() => { void load(); }); fetch("/api/products", { cache: "no-store" }).then((response) => response.ok ? response.json() : null).then((body) => { if (body?.products) setAccountProducts(body.products); }).catch(() => {}); }, []);
  async function act(payload: Record<string, unknown>) {
    setMessage("正在保存…");
    const response = await fetch("/api/account", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(payload) });
    const body = await response.json();
    if (!response.ok) { setMessage(body.error || "保存失败"); return false; }
    setMessage(body.message || "已保存"); await load(); return true;
  }
  async function saveProfile(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    await act({
      action: "update-profile",
      ...Object.fromEntries(form.entries()),
      skinConcerns: form.getAll("skinConcerns"),
      preferredCategories: form.getAll("preferredCategories"),
      emailMarketing: form.get("emailMarketing") === "on",
      smsMarketing: form.get("smsMarketing") === "on",
    });
  }
  async function saveAddress(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const ok = await act({ action: "save-address", id: editingAddress?.id, isDefault: form.get("isDefault") === "on", ...Object.fromEntries(form.entries()) }); if (ok) { setEditingAddress(null); setCreatingAddress(false); } }
  const firstName = useMemo(() => data?.profile.nickname || data?.member.name || viewer, [data, viewer]);
  const savedProducts = accountProducts.filter((product) => wishlist.includes(product.slug));
  const nav = [
    { key: "overview", label: "账户总览", icon: "⌂" },
    { key: "club", label: "会员权益", icon: "◇" },
    { key: "growth", label: "任务与邀请", icon: "✦" },
    { key: "profile", label: "个人资料", icon: "◯" },
    { key: "addresses", label: "收货地址", icon: "⌖" },
    { key: "wishlist", label: "我的收藏", icon: "♡" },
    { key: "orders", label: "我的订单", icon: "▤" },
    { key: "invoices", label: "发票管理", icon: "票" },
    { key: "returns", label: "售后进度", icon: "↺" },
  ];
  const socialLabel = socialProvider === "wechat" ? "微信" : socialProvider === "alipay" ? "支付宝" : "第三方账号";
  const socialFeedback = socialStatus === "bound" ? `${socialLabel}绑定成功，以后可以使用该账号快捷登录。`
    : socialStatus === "failed" ? `${socialLabel}绑定失败，请重新尝试。`
      : socialStatus === "cancelled" ? `已取消${socialLabel}授权。`
        : socialStatus === "not-configured" ? `${socialLabel}授权尚未完成平台配置。` : "";

  return <main className="member-page">
    <header className="member-hero"><div className="member-hero-copy"><p>PÚSY CLUB · MEMBER SPACE</p><h1>你好，{firstName}</h1><span>你的美妆偏好、会员礼遇与每一次订单，都在这里妥善管理。</span><div><button onClick={() => setTab("club")}>查看会员礼遇</button><button onClick={() => setTab("growth")}>去赚积分</button></div></div><div className="member-identity"><i>✓</i><span>邮箱已验证<b>{email}</b></span><a href="/account/logout">退出登录</a></div></header>
    <div className="member-layout"><aside><div className="member-aside-brand"><span>P</span><div><b>PÚSY CLUB</b><small>专属会员空间</small></div></div><nav>{nav.map((item) => <button key={item.key} className={tab === item.key ? "active" : ""} onClick={() => setTab(item.key)}><i aria-hidden="true">{item.icon}</i><span>{item.label}</span></button>)}</nav><a href="/catalog/products">继续探索商品 <span>→</span></a></aside><section className="member-content">
      {message && <div className="member-message">{message}</div>}
      {socialFeedback && <div className={`member-message ${socialStatus === "bound" ? "success" : ""}`}>{socialFeedback}</div>}
      {loading && !data ? <div className="member-loading">正在读取会员资料…</div> : data && <>
        {tab === "overview" && <div className="member-overview">{showWelcome && <SocialBindingPrompt accounts={data.socialAccounts} providers={data.socialProviders} onProfile={() => setTab("profile")} />}<section className={`member-overview-lead tier-${data.member.tier}`}><div><p>MY PÚSY CLUB</p><h2>{tierName(data.member.tier)}</h2><span>每一次购买、签到与分享，都在累积下一份专属礼遇。</span><button onClick={() => setTab("club")}>查看等级权益 <i>→</i></button></div><div><span>当前可用积分</span><b>{data.member.points_balance}</b><small>累计获得 {data.member.lifetime_points} 积分</small></div></section><div className="member-stat-grid"><article><span>会员等级</span><b>{tierName(data.member.tier)}</b><small>查看专属礼遇</small></article><article><span>累计订单</span><b>{data.member.total_orders}</b><small>完整购买记录</small></article><article><span>累计消费</span><b>{formatCnyFromRub(data.member.total_spent)}</b><small>会员消费总额</small></article><article><span>今日签到</span><b>{data.growth.checkin.completedToday ? `${data.growth.checkin.streak} 天` : "待签到"}</b><small>{data.growth.checkin.completedToday ? "连续签到中" : "签到即可领取积分"}</small></article></div><div className="member-quick-grid"><button onClick={() => setTab("growth")}><i>01</i><span><b>会员任务</b><small>{data.growth.tasks.filter((task) => task.completed).length}/{data.growth.tasks.length} 项已完成</small></span><em>→</em></button><button onClick={() => setTab("profile")}><i>02</i><span><b>完善美妆档案</b><small>获得更合适的商品推荐</small></span><em>→</em></button><button onClick={() => setTab("wishlist")}><i>03</i><span><b>我的收藏</b><small>{savedProducts.length} 件心仪商品</small></span><em>→</em></button></div><section className="member-section member-recent-orders"><div className="member-section-title"><div><p>ORDER HISTORY</p><h2>最近订单</h2></div><button onClick={() => setTab("orders")}>查看全部</button></div>{data.orders.length ? <OrderList orders={data.orders.slice(0, 3)} items={data.orderItems} /> : <Empty title="还没有订单" copy="完成第一笔订单后，可在这里持续查看配送状态。" href="/catalog/products" link="浏览商品" />}</section></div>}
        {tab === "club" && <MembershipPanel data={data} onAct={act} />}
        {tab === "growth" && <MemberGrowthPanel growth={data.growth} onAct={act} onProfile={() => setTab("profile")} />}
        {tab === "profile" && <ProfilePanel member={data.member} profile={data.profile} socialAccounts={data.socialAccounts} socialProviders={data.socialProviders} onSubmit={saveProfile} onPhoneVerified={() => void load()} onAct={act} />}
        {tab === "addresses" && <section className="member-section"><div className="member-section-title"><div><p>结账时可快速选择</p><h2>收货地址</h2></div><button onClick={() => { setEditingAddress(null); setCreatingAddress(true); }}>＋ 新增地址</button></div>{data.addresses.length ? <div className="address-grid">{data.addresses.map((address) => <article key={address.id} className={address.is_default ? "default" : ""}><div><span>{address.label}</span>{Boolean(address.is_default) && <em>默认</em>}</div><h3>{address.recipient}</h3><p>{address.phone}</p><p>{address.province} {address.city} {address.district}<br />{address.detail} {address.postcode}</p><footer><button onClick={() => setEditingAddress(address)}>编辑</button>{!address.is_default && <button onClick={() => act({ action:"set-default-address", id:address.id })}>设为默认</button>}<button className="danger" onClick={() => act({ action:"delete-address", id:address.id })}>删除</button></footer></article>)}</div> : <Empty title="还没有收货地址" copy="保存常用地址，结账时填写会更轻松。" onClick={() => setCreatingAddress(true)} link="新增地址" />}</section>}
        {tab === "wishlist" && <section className="member-section"><div className="member-section-title"><div><p>{savedProducts.length} 件商品</p><h2>我的收藏</h2></div><a href="/catalog/products">继续发现</a></div>{savedProducts.length ? <div className="member-wishlist-grid">{savedProducts.map((product) => <article key={product.slug}><a href={`/products/${product.slug}`}><Image src={product.image} alt={product.name} width={700} height={727} sizes="(max-width: 700px) 50vw, 25vw" /><h3>{product.name}</h3></a><p>{formatCnyFromRub(product.price)}</p><div><button disabled={!product.inventoryVerified || (product.stock ?? 0) < 1} onClick={() => addToCart(product)}>加入购物袋</button><button onClick={() => toggleWishlist(product.slug)}>移除</button></div></article>)}</div> : <Empty title="还没有收藏商品" copy="在商品卡片或详情页点击心形按钮，商品会保存在这里。" href="/catalog/products" link="浏览商品" />}</section>}
        {tab === "orders" && <section className="member-section"><div className="member-section-title"><div><p>{data.orders.length} 笔订单</p><h2>我的订单</h2></div></div>{data.orders.length ? <OrderList orders={data.orders} items={data.orderItems} shipments={data.shipments} shipmentEvents={data.shipmentEvents} onAct={act} /> : <Empty title="还没有订单" copy="你的线上订单会安全保存在这里。" href="/catalog/products" link="开始购物" />}</section>}
        {tab === "invoices" && <InvoicePanel invoices={data.invoices} orders={data.orders} email={data.member.email} name={data.member.name} onAct={act} />}
        {tab === "returns" && <section className="member-section"><div className="member-section-title"><div><p>{data.returns.length} 条记录</p><h2>售后进度</h2></div><a href="/return">申请退换货</a></div>{data.returns.length ? <div className="return-progress">{data.returns.map((item) => <article key={item.id}><div><b>{item.id}</b><span className={`return-status status-${item.status}`}>{item.status}</span></div><h3>{item.request_type === "exchange" ? "换货" : item.request_type === "reship" ? "补寄" : "退货退款"} · {item.reason}</h3><p>关联订单：{item.order_id}</p>{item.details && <p>{item.details}</p>}{item.resolution && <p>处理说明：{item.resolution}</p>}{item.refund_id && <p>关联退款单：{item.refund_id}</p>}{item.return_tracking_number ? <p>退回物流：{item.return_carrier} · {item.return_tracking_number}</p> : ["待审核","已批准"].includes(item.status) && <form className="member-return-logistics" onSubmit={(event) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); void act({ action: "update-return-logistics", returnId: item.id, carrier: values.carrier, trackingNumber: values.trackingNumber }); }}><input name="carrier" placeholder="退回物流公司" required /><input name="trackingNumber" placeholder="退回物流单号" required /><button>保存物流</button></form>}<small>申请于 {new Date(item.created_at).toLocaleString("zh-CN")}</small></article>)}</div> : <Empty title="暂无售后记录" copy="如果商品需要处理，可通过在线申请提交订单信息。" href="/return" link="申请退换货" />}</section>}
      </>}
    </section></div>
    {(creatingAddress || editingAddress) && <AddressModal editing={editingAddress} onClose={() => { setCreatingAddress(false); setEditingAddress(null); }} onSubmit={saveAddress} />}
  </main>;
}

const skinConcerns = ["补水保湿", "控油净肤", "敏感修护", "提亮肤色", "抗老紧致", "痘肌护理"];
const preferredCategories = ["彩妆", "护肤", "身体护理", "头发护理", "眉妆", "配件"];

function parseSelections(value: string) {
  try { const parsed = JSON.parse(value); return Array.isArray(parsed) ? parsed.map(String) : []; } catch { return []; }
}

const tierNames: Record<string, string> = { bronze: "新锐会员", silver: "银卡会员", gold: "金卡会员", diamond: "钻石会员" };
function tierName(value: string) { return tierNames[value] ?? "新锐会员"; }
const tierSteps = [{ key: "bronze", minimum: 0 }, { key: "silver", minimum: 500 }, { key: "gold", minimum: 2000 }, { key: "diamond", minimum: 5000 }];

function startSocialAuthorization(provider: SocialProvider, returnTo = "/account") {
  window.location.href = `/api/account/social/${provider}?mode=bind&returnTo=${encodeURIComponent(returnTo)}`;
}

function SocialBindingPrompt({ accounts, providers, onProfile }: { accounts: SocialAccount[]; providers: SocialProviderState[]; onProfile: () => void }) {
  return <section className="member-welcome-bind"><div><p>邮箱认证成功</p><h2>欢迎加入 PÚSY CLUB</h2><span>你可以绑定一个常用账号，以后登录会更快捷；这一步可以跳过。</span></div><div>{providers.map((provider) => {
    const linked = accounts.some((account) => account.provider === provider.provider);
    return <button type="button" className={provider.provider} disabled={linked || !provider.configured} onClick={() => startSocialAuthorization(provider.provider, "/account?welcome=1")} key={provider.provider}><i>{provider.provider === "wechat" ? "微" : "支"}</i><span><b>{linked ? `已绑定${provider.label}` : `绑定${provider.label}`}</b><small>{linked ? "可用于快捷登录" : provider.configured ? "通过官方页面安全授权" : "等待平台配置"}</small></span></button>;
  })}<button type="button" className="skip" onClick={onProfile}>暂不绑定，完善资料 →</button></div></section>;
}

function SocialAccountsPanel({ accounts, providers, onAct }: { accounts: SocialAccount[]; providers: SocialProviderState[]; onAct: (payload: Record<string, unknown>) => Promise<boolean> }) {
  return <div className="social-account-grid">{providers.map((provider) => {
    const account = accounts.find((item) => item.provider === provider.provider);
    return <article className={`${provider.provider} ${account ? "linked" : ""}`} key={provider.provider}><i>{provider.provider === "wechat" ? "微" : "支"}</i><div><b>{provider.label}</b><span>{account ? `已绑定 · ${new Date(account.created_at).toLocaleDateString("zh-CN")}` : provider.configured ? "尚未绑定" : "等待平台配置"}</span></div>{account ? <button type="button" onClick={() => { if (window.confirm(`确认解除${provider.label}绑定？邮箱登录不会受到影响。`)) void onAct({ action: "unlink-social", provider: provider.provider }); }}>解除绑定</button> : <button type="button" disabled={!provider.configured} onClick={() => startSocialAuthorization(provider.provider)}>{provider.configured ? "立即绑定" : "暂不可用"}</button>}</article>;
  })}</div>;
}

function MemberGrowthPanel({ growth, onAct, onProfile }: { growth: GrowthSummary; onAct: (payload: Record<string, unknown>) => Promise<boolean>; onProfile: () => void }) {
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
    <section className="member-section referral-program"><div className="member-section-title"><div><p>好友完成首单后双方自动到账</p><h2>邀请好友奖励</h2></div><span>已奖励 {growth.referral.rewarded} 人</span></div><div className="referral-layout"><div className="referral-qr"><Image src="/api/account/referral-qr" alt="PÚSY CLUB 邀请二维码" width={440} height={440} unoptimized /></div><div className="referral-copy"><span>你的专属邀请码</span><strong>{growth.referral.code}</strong><p>好友完成首单后，你获得 <b>{growth.referral.inviterReward} 积分</b>，好友获得 <b>{growth.referral.friendReward} 积分</b>。</p><label>专属邀请链接<input readOnly value={growth.referral.link} onFocus={(event) => event.currentTarget.select()} /></label><div><button onClick={() => void copyInvite()}>复制链接</button><button className="secondary" onClick={() => void shareInvite()}>分享邀请</button></div>{copyMessage && <small>{copyMessage}</small>}<footer><span>{growth.referral.pending} 位好友等待完成首单</span><span>{growth.referral.rewarded} 位好友已完成奖励</span></footer></div></div></section>
    <section className="member-section"><div className="member-section-title"><div><p>生日、周年与等级专属资格</p><h2>本年度会员权益</h2></div></div><div className="member-benefit-grid">{growth.benefits.map((benefit) => <article className={benefit.granted ? "active" : ""} key={benefit.key}><i>{benefit.granted ? "✓" : "◇"}</i><b>{benefit.title}</b><p>{benefit.description}</p><span>{benefit.granted ? "已解锁" : benefit.configured ? "尚未解锁" : "需要完善生日资料"}</span>{!benefit.configured && <button onClick={onProfile}>完善资料</button>}</article>)}</div></section>
  </div>;
}

function MembershipPanel({ data, onAct }: { data: AccountData; onAct: (payload: Record<string, unknown>) => Promise<boolean> }) {
  const currentIndex = Math.max(0, tierSteps.findIndex((item) => item.key === data.member.tier));
  const next = tierSteps[currentIndex + 1];
  const currentMinimum = tierSteps[currentIndex].minimum;
  const progress = next ? Math.min(100, Math.round((data.member.lifetime_points - currentMinimum) / (next.minimum - currentMinimum) * 100)) : 100;
  return <div className="membership-stack">
    <section className={`membership-card tier-${data.member.tier}`}>
      <header><div><strong>PÚSY</strong><span>BEAUTY CLUB</span></div><small>MEMBER SINCE {new Date(data.member.joined_at).getFullYear()}</small></header>
      <div className="membership-card-tier"><span>MEMBERSHIP TIER</span><h2>{tierName(data.member.tier)}</h2><p>{data.member.name}</p></div>
      <div className="membership-card-points"><span>AVAILABLE POINTS</span><b>{data.member.points_balance}</b><small>可用积分</small></div>
      <footer><div><span>累计积分 {data.member.lifetime_points}</span><span>{next ? `距 ${tierName(next.key)} 还需 ${Math.max(0, next.minimum - data.member.lifetime_points)} 分` : "已达到最高等级"}</span></div><i><em style={{ width: `${progress}%` }} /></i></footer>
    </section>
    <section className="member-section"><div className="member-section-title"><div><p>每消费 1 元积 1 分</p><h2>等级权益</h2></div></div><div className="tier-benefit-grid">{tierSteps.map((item) => <article className={item.minimum <= data.member.lifetime_points ? "active" : ""} key={item.key}><b>{tierName(item.key)}</b><span>{item.minimum} 积分起</span><p>{item.key === "bronze" ? "基础积分与会员服务" : item.key === "silver" ? "补货与活动优先提醒" : item.key === "gold" ? "专属优惠券与新品体验" : "最高等级专属权益"}</p></article>)}</div></section>
    <section className="member-section"><div className="member-section-title"><div><p>{data.coupons.filter((item) => item.status === "available").length} 张可用</p><h2>我的优惠券</h2></div></div>{data.coupons.length ? <div className="member-coupon-grid">{data.coupons.map((coupon) => <article key={coupon.id} className={coupon.status}><strong>{coupon.kind === "percent" ? `${coupon.value}%` : formatCnyFromRub(coupon.value)}</strong><div><b>{coupon.code}</b><span>{coupon.minimum ? `满 ${formatCnyFromRub(coupon.minimum)} 可用` : "无门槛"}</span><small>{coupon.ends_at ? `有效期至 ${new Date(coupon.ends_at).toLocaleDateString("zh-CN")}` : "长期有效"}</small></div><em>{coupon.status === "available" ? "可使用" : "已使用"}</em></article>)}</div> : <p className="member-empty-inline">暂时没有专属优惠券</p>}</section>
    <section className="member-section"><div className="member-section-title"><div><p>补货与降价动态</p><h2>商品提醒</h2></div></div>{data.productAlerts.length ? <div className="member-alert-list">{data.productAlerts.map((alert) => <article key={alert.id}><Image src={alert.image} alt="" width={72} height={76} /><div><a href={`/products/${alert.product_slug}`}>{alert.product_name}</a><span>{alert.alert_type === "restock" ? "补货通知" : "降价通知"} · 当前 {formatCnyFromRub(alert.price)}</span></div><button onClick={() => void onAct({ action: "remove-product-alert", id: alert.id })}>取消</button></article>)}</div> : <p className="member-empty-inline">在商品详情页可开启补货或降价提醒</p>}</section>
    <section className="member-section"><div className="member-section-title"><div><p>最近 50 条</p><h2>积分明细</h2></div></div>{data.pointsLedger.length ? <div className="points-ledger">{data.pointsLedger.map((entry) => <div key={entry.id}><span><b>{entry.reason}</b><small>{new Date(entry.created_at).toLocaleString("zh-CN")}</small></span><strong className={entry.points > 0 ? "positive" : ""}>{entry.points > 0 ? "+" : ""}{entry.points}</strong><em>余额 {entry.balance_after}</em></div>)}</div> : <p className="member-empty-inline">完成订单后，积分明细会显示在这里</p>}</section>
  </div>;
}

function ProfilePanel({ member, profile, socialAccounts, socialProviders, onSubmit, onPhoneVerified, onAct }: { member: Member; profile: MemberProfile; socialAccounts: SocialAccount[]; socialProviders: SocialProviderState[]; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void; onPhoneVerified: () => void; onAct: (payload: Record<string, unknown>) => Promise<boolean> }) {
  const selectedConcerns = parseSelections(profile.skin_concerns);
  const selectedCategories = parseSelections(profile.preferred_categories);
  const completionValues = [member.name, member.phone, profile.nickname, profile.gender, profile.birthday, profile.province, profile.city, profile.skin_type];
  const completion = Math.round((completionValues.filter(Boolean).length / completionValues.length) * 100);
  const tier = tierName(member.tier);
  const initial = (profile.nickname || member.name || "P").slice(0, 1).toUpperCase();

  return <section className="member-section member-profile-section">
    <div className="profile-summary">
      <div className="profile-avatar" aria-hidden="true">{initial}</div>
      <div><p>PÚSY CLUB 会员</p><h2>{profile.nickname || member.name}</h2><span>{tier} · 加入于 {new Date(member.joined_at).toLocaleDateString("zh-CN")}</span></div>
      <div className="profile-completion"><span>资料完整度 <b>{completion}%</b></span><div><i style={{ width: `${completion}%` }} /></div><small>{completion === 100 ? "资料已经完善" : "完善资料，获得更合适的商品推荐"}</small></div>
    </div>
    <form className="profile-form" onSubmit={onSubmit}>
      <fieldset><legend><span>01</span><div><b>基本资料</b><small>用于账户识别、配送联系和会员服务</small></div></legend><div className="member-form">
        <label>昵称<input name="nickname" maxLength={30} defaultValue={profile.nickname} placeholder="希望我们如何称呼你" /></label>
        <label>真实姓名<input name="name" maxLength={50} autoComplete="name" defaultValue={member.name} required /></label>
        <PhoneVerification member={member} onVerified={onPhoneVerified} />
        <label>性别<select name="gender" defaultValue={profile.gender}><option value="">请选择</option><option value="female">女</option><option value="male">男</option><option value="undisclosed">不愿透露</option></select></label>
        <label>出生日期<input name="birthday" type="date" max={new Date().toISOString().slice(0, 10)} defaultValue={profile.birthday} /></label>
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

function OrderList({ orders, items, shipments = [], shipmentEvents = [], onAct }: { orders: Order[]; items: OrderItem[]; shipments?: Shipment[]; shipmentEvents?: ShipmentEvent[]; onAct?: (payload: Record<string, unknown>) => Promise<boolean> }) { return <div className="member-order-list">{orders.map((order) => { const shipment = shipments.find((item) => item.order_id === order.id); const events = shipmentEvents.filter((item) => item.shipment_id === shipment?.id); const cancellable = ["待付款", "支付失败", "待处理", "已确认", "配货中"].includes(order.status); return <details key={order.id}><summary><span><b>{order.id}</b><small>{new Date(order.created_at).toLocaleString("zh-CN")}</small></span><span>{order.item_count} 件商品</span><strong>{formatCnyFromRub(order.total)}</strong><em>{order.status}</em></summary><div className="member-order-detail"><p>{order.delivery} · {order.payment}</p><p>{order.address}</p>{items.filter((item) => item.order_id === order.id).map((item) => <div key={item.id}><span>{item.product_name}<small>数量 {item.quantity}</small></span><b>{formatCnyFromRub(item.unit_price * item.quantity)}</b></div>)}{order.discount > 0 && <p className="member-discount">订单优惠 −{formatCnyFromRub(order.discount)}</p>}{shipment && <section className="member-shipment"><b>{shipment.carrier_name} · {shipment.tracking_number}</b><span>{shipment.status}</span>{shipment.tracking_url && <a href={shipment.tracking_url} target="_blank" rel="noopener noreferrer">查询物流 →</a>}{events.slice(0, 5).map((event) => <p key={event.id}><time>{new Date(event.event_time).toLocaleString("zh-CN")}</time> {event.status} · {event.description}{event.location ? `（${event.location}）` : ""}</p>)}</section>}{cancellable && onAct && <button className="member-order-cancel" onClick={() => { const reason = window.prompt("请输入取消订单原因", "不再需要"); if (reason) void onAct({ action: "cancel-order", orderId: order.id, reason }); }}>取消订单</button>}{["已发货", "已完成", "部分退款"].includes(order.status) && <a className="member-order-return" href={`/return?orderId=${encodeURIComponent(order.id)}`}>申请售后</a>}</div></details>; })}</div>; }

const invoiceStatusLabels: Record<string, string> = { pending: "待审核", processing: "开票中", issued: "已开具", rejected: "已驳回", cancelled: "已取消" };

function InvoicePanel({ invoices, orders, email, name, onAct }: { invoices: Invoice[]; orders: Order[]; email: string; name: string; onAct: (payload: Record<string, unknown>) => Promise<boolean> }) {
  const requestedOrders = new Set(invoices.filter((item) => !["rejected", "cancelled"].includes(item.status)).map((item) => item.order_id));
  const eligible = orders.filter((order) => !["待付款", "支付失败", "已取消", "已退款"].includes(order.status) && !requestedOrders.has(order.id));
  return <section className="member-section invoice-member-section"><div className="member-section-title"><div><p>电子发票将发送至申请邮箱</p><h2>发票管理</h2></div><span>{invoices.length} 条申请</span></div>
    {invoices.length > 0 && <div className="member-invoice-list">{invoices.map((invoice) => <article key={invoice.id}><div><span>{invoice.invoice_type === "company" ? "企业发票" : "个人发票"}</span><b>{invoice.title}</b><small>{invoice.id} · 订单 {invoice.order_id}</small></div><strong>{formatCnyFromRub(invoice.amount)}</strong><em className={`invoice-status status-${invoice.status}`}>{invoiceStatusLabels[invoice.status] ?? invoice.status}</em>{invoice.rejection_reason && <p>原因：{invoice.rejection_reason}</p>}{invoice.status === "issued" && invoice.file_url && <a href={invoice.file_url} target="_blank" rel="noopener noreferrer">下载电子发票 →</a>}</article>)}</div>}
    <div className="invoice-request-list"><h3>可申请开票的订单</h3>{eligible.length ? eligible.map((order) => <details key={order.id}><summary><span><b>{order.id}</b><small>{new Date(order.created_at).toLocaleDateString("zh-CN")} · {order.status}</small></span><strong>{formatCnyFromRub(order.total)}</strong><em>申请开票</em></summary><form onSubmit={(event) => { event.preventDefault(); const form = event.currentTarget; const values = Object.fromEntries(new FormData(form).entries()); void onAct({ action: "request-invoice", orderId: order.id, ...values }).then((ok) => { if (ok) form.reset(); }); }}><label>发票类型<select name="invoiceType" defaultValue="personal"><option value="personal">个人发票</option><option value="company">企业发票</option></select></label><label>发票抬头<input name="title" defaultValue={name} maxLength={120} required /></label><label>企业税号<input name="taxNumber" maxLength={30} placeholder="个人发票可不填" /></label><label>接收邮箱<input name="recipientEmail" type="email" defaultValue={email} maxLength={160} required /></label><button>提交发票申请</button></form></details>) : <p className="member-empty-inline">当前没有新的可开票订单</p>}</div>
  </section>;
}

function Empty({ title, copy, href, link, onClick }: { title: string; copy: string; href?: string; link: string; onClick?: () => void }) { return <div className="member-empty"><h3>{title}</h3><p>{copy}</p>{href ? <a href={href}>{link} →</a> : <button onClick={onClick}>{link} →</button>}</div>; }

function AddressModal({ editing, onClose, onSubmit }: { editing: Address | null; onClose: () => void; onSubmit: (event:React.FormEvent<HTMLFormElement>) => void }) { return <div className="member-modal" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><form onSubmit={onSubmit}><div className="member-section-title"><h2>{editing ? "编辑地址" : "新增地址"}</h2><button type="button" onClick={onClose}>×</button></div><div className="member-form"><label>地址标签<input name="label" defaultValue={editing?.label ?? "家"} /></label><label>收件人<input name="recipient" defaultValue={editing?.recipient} required /></label><label>手机号码<input name="phone" type="tel" defaultValue={editing?.phone} required /></label><label>省份<input name="province" defaultValue={editing?.province} required /></label><label>城市<input name="city" defaultValue={editing?.city} required /></label><label>区 / 县<input name="district" defaultValue={editing?.district} /></label><label className="full">详细地址<input name="detail" defaultValue={editing?.detail} required /></label><label>邮政编码<input name="postcode" defaultValue={editing?.postcode} /></label><label className="check"><input name="isDefault" type="checkbox" defaultChecked={Boolean(editing?.is_default)} /> 设为默认地址</label></div><button className="member-save">保存地址</button></form></div>; }
