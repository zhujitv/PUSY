"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { formatCnyFromRub, products, type Product } from "../data/products";
import { useStore } from "../components/StoreProvider";
import { tierName } from "./account-config";
import type { AccountData, Address } from "./account-types";
import { AddressModal, Empty } from "./AccountCommonComponents";
import { MembershipPanel } from "./AccountMembershipPanel";
import { InvoicePanel, OrderList } from "./AccountOrderInvoiceComponents";
import { ProfilePanel } from "./AccountProfilePanel";
import { MemberGrowthPanel, SocialBindingPrompt } from "./AccountSocialGrowth";
import { AccountFinancePanel } from "./AccountFinancePanel";

export function AccountClient({ viewer, email, showWelcome = false, socialStatus = "", socialProvider = "", initialTab = "overview" }: { viewer: string; email: string; showWelcome?: boolean; socialStatus?: string; socialProvider?: string; initialTab?: string }) {
  const { wishlist, toggleWishlist, addToCart } = useStore();
  const [tab, setTab] = useState(initialTab);
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
    { key: "finance", label: "财务中心", icon: "¥" },
    { key: "returns", label: "售后进度", icon: "↺" },
  ];
  const socialLabel = socialProvider === "wechat" ? "微信" : socialProvider === "alipay" ? "支付宝" : "第三方账号";
  const socialFeedback = socialStatus === "bound" ? `${socialLabel}绑定成功，以后可以使用该账号快捷登录。`
    : socialStatus === "failed" ? `${socialLabel}绑定失败，请重新尝试。`
      : socialStatus === "cancelled" ? `已取消${socialLabel}授权。`
        : socialStatus === "not-configured" ? `${socialLabel}授权尚未完成平台配置。` : "";

  return <main className="member-page">
    <header className="member-hero"><div className="member-hero-copy"><p>PÚSY CLUB · MEMBER SPACE</p><h1>你好，{firstName}</h1><span>你的美妆偏好、会员礼遇与每一次订单，都在这里妥善管理。</span><div><button onClick={() => setTab("club")}>查看会员礼遇</button><button onClick={() => setTab("growth")}>去赚积分</button></div></div><div className="member-identity"><i>✓</i><span>邮箱已验证<b>{email}</b></span><a href="/account/logout">退出登录</a></div></header>
    <div className="member-layout"><aside><div className="member-aside-brand"><span>P</span><div><b>PÚSY CLUB</b><small>专属会员空间</small></div></div><nav>{nav.map((item) => <button key={item.key} className={tab === item.key ? "active" : ""} onClick={() => setTab(item.key)}><i aria-hidden="true">{item.icon}</i><span>{item.label}</span></button>)}</nav><a href="/community/me">我的社区主页 <span>→</span></a><a className="member-shop-link" href="/catalog/products">继续探索商品 <span>→</span></a></aside><section className="member-content">
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
        {tab === "finance" && <AccountFinancePanel />}
        {tab === "returns" && <section className="member-section"><div className="member-section-title"><div><p>{data.returns.length} 条记录</p><h2>售后进度</h2></div><a href="/contact?category=售后问题">申请退换货</a></div>{data.returns.length ? <div className="return-progress">{data.returns.map((item) => <article key={item.id}><div><b>{item.id}</b><span className={`return-status status-${item.status}`}>{item.status}</span></div><h3>{item.request_type === "exchange" ? "换货" : item.request_type === "reship" ? "补寄" : "退货退款"} · {item.reason}</h3><p>关联订单：{item.order_id}</p>{item.details && <p>{item.details}</p>}{item.resolution && <p>处理说明：{item.resolution}</p>}{item.refund_id && <p>关联退款单：{item.refund_id}</p>}{item.return_tracking_number ? <p>退回物流：{item.return_carrier} · {item.return_tracking_number}</p> : ["待审核","已批准"].includes(item.status) && <form className="member-return-logistics" onSubmit={(event) => { event.preventDefault(); const values = Object.fromEntries(new FormData(event.currentTarget).entries()); void act({ action: "update-return-logistics", returnId: item.id, carrier: values.carrier, trackingNumber: values.trackingNumber }); }}><input name="carrier" placeholder="退回物流公司" required /><input name="trackingNumber" placeholder="退回物流单号" required /><button>保存物流</button></form>}<small>申请于 {new Date(item.created_at).toLocaleString("zh-CN")}</small></article>)}</div> : <Empty title="暂无售后记录" copy="如果商品需要处理，可通过在线客服选择交易订单。" href="/contact?category=售后问题" link="申请退换货" />}</section>}
      </>}
    </section></div>
    {(creatingAddress || editingAddress) && <AddressModal editing={editingAddress} onClose={() => { setCreatingAddress(false); setEditingAddress(null); }} onSubmit={saveAddress} />}
  </main>;
}
