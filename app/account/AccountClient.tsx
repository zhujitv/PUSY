"use client";
import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import { formatCnyFromRub, products, type Product } from "../data/products";
import { useStore } from "../components/StoreProvider";

type Member = { id: number; name: string; email: string; phone: string; status: string; total_orders: number; total_spent: number; joined_at: string };
type MemberProfile = { member_id: number; nickname: string; gender: string; birthday: string; wechat: string; province: string; city: string; occupation: string; skin_type: string; skin_concerns: string; preferred_categories: string; bio: string; email_marketing: number; sms_marketing: number; updated_at: string };
type Address = { id: number; label: string; recipient: string; phone: string; province: string; city: string; district: string; detail: string; postcode: string; is_default: number };
type Order = { id: string; total: number; discount: number; delivery: string; payment: string; address: string; status: string; item_count: number; created_at: string };
type OrderItem = { id: number; order_id: string; product_slug: string; product_name: string; quantity: number; unit_price: number };
type ReturnItem = { id: string; order_id: string; reason: string; details: string; status: string; created_at: string };
type Invoice = { id: string; order_id: string; invoice_type: string; title: string; tax_number: string; recipient_email: string; amount: number; status: string; invoice_number: string; file_url: string; rejection_reason: string; requested_at: string; issued_at?: string };
type AccountData = { member: Member; profile: MemberProfile; addresses: Address[]; orders: Order[]; orderItems: OrderItem[]; returns: ReturnItem[]; invoices: Invoice[] };

export function AccountClient({ viewer, email }: { viewer: string; email: string }) {
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
    setMessage("已保存"); await load(); return true;
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
  const nav = [["overview","账户总览"],["profile","个人资料"],["addresses","收货地址"],["wishlist","我的收藏"],["orders","我的订单"],["invoices","发票管理"],["returns","售后进度"]];

  return <main className="member-page">
    <header className="member-hero"><div><p>PÚSY CLUB</p><h1>你好，{firstName}</h1><span>从这里管理个人资料、地址、订单和售后申请。</span></div><div className="member-identity"><i>✓</i><span>已验证账户<b>{email}</b></span><a href="/account/logout">退出登录</a></div></header>
    <div className="member-layout"><aside><nav>{nav.map(([key,label]) => <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{label}</button>)}</nav><a href="/catalog/products">继续购物 →</a></aside><section className="member-content">
      {message && <div className="member-message">{message}</div>}
      {loading && !data ? <div className="member-loading">正在读取会员资料…</div> : data && <>
        {tab === "overview" && <div className="member-overview"><div className="member-stat-grid"><article><span>累计订单</span><b>{data.member.total_orders}</b></article><article><span>累计消费</span><b>{formatCnyFromRub(data.member.total_spent)}</b></article><article><span>收货地址</span><b>{data.addresses.length}</b></article><article><span>进行中售后</span><b>{data.returns.filter((item) => !["已拒绝","已关闭","已退款"].includes(item.status)).length}</b></article></div><section className="member-section"><div className="member-section-title"><h2>最近订单</h2><button onClick={() => setTab("orders")}>查看全部</button></div>{data.orders.length ? <OrderList orders={data.orders.slice(0, 3)} items={data.orderItems} /> : <Empty title="还没有订单" copy="完成第一笔订单后，可在这里持续查看配送状态。" href="/catalog/products" link="浏览商品" />}</section></div>}
        {tab === "profile" && <ProfilePanel member={data.member} profile={data.profile} onSubmit={saveProfile} />}
        {tab === "addresses" && <section className="member-section"><div className="member-section-title"><div><p>结账时可快速选择</p><h2>收货地址</h2></div><button onClick={() => { setEditingAddress(null); setCreatingAddress(true); }}>＋ 新增地址</button></div>{data.addresses.length ? <div className="address-grid">{data.addresses.map((address) => <article key={address.id} className={address.is_default ? "default" : ""}><div><span>{address.label}</span>{Boolean(address.is_default) && <em>默认</em>}</div><h3>{address.recipient}</h3><p>{address.phone}</p><p>{address.province} {address.city} {address.district}<br />{address.detail} {address.postcode}</p><footer><button onClick={() => setEditingAddress(address)}>编辑</button>{!address.is_default && <button onClick={() => act({ action:"set-default-address", id:address.id })}>设为默认</button>}<button className="danger" onClick={() => act({ action:"delete-address", id:address.id })}>删除</button></footer></article>)}</div> : <Empty title="还没有收货地址" copy="保存常用地址，结账时填写会更轻松。" onClick={() => setCreatingAddress(true)} link="新增地址" />}</section>}
        {tab === "wishlist" && <section className="member-section"><div className="member-section-title"><div><p>{savedProducts.length} 件商品</p><h2>我的收藏</h2></div><a href="/catalog/products">继续发现</a></div>{savedProducts.length ? <div className="member-wishlist-grid">{savedProducts.map((product) => <article key={product.slug}><a href={`/products/${product.slug}`}><Image src={product.image} alt={product.name} width={700} height={727} sizes="(max-width: 700px) 50vw, 25vw" /><h3>{product.name}</h3></a><p>{formatCnyFromRub(product.price)}</p><div><button disabled={!product.inventoryVerified || (product.stock ?? 0) < 1} onClick={() => addToCart(product)}>加入购物袋</button><button onClick={() => toggleWishlist(product.slug)}>移除</button></div></article>)}</div> : <Empty title="还没有收藏商品" copy="在商品卡片或详情页点击心形按钮，商品会保存在这里。" href="/catalog/products" link="浏览商品" />}</section>}
        {tab === "orders" && <section className="member-section"><div className="member-section-title"><div><p>{data.orders.length} 笔订单</p><h2>我的订单</h2></div></div>{data.orders.length ? <OrderList orders={data.orders} items={data.orderItems} /> : <Empty title="还没有订单" copy="你的线上订单会安全保存在这里。" href="/catalog/products" link="开始购物" />}</section>}
        {tab === "invoices" && <InvoicePanel invoices={data.invoices} orders={data.orders} email={data.member.email} name={data.member.name} onAct={act} />}
        {tab === "returns" && <section className="member-section"><div className="member-section-title"><div><p>{data.returns.length} 条记录</p><h2>售后进度</h2></div><a href="/return">申请退换货</a></div>{data.returns.length ? <div className="return-progress">{data.returns.map((item) => <article key={item.id}><div><b>{item.id}</b><span className={`return-status status-${item.status}`}>{item.status}</span></div><h3>{item.reason}</h3><p>关联订单：{item.order_id}</p>{item.details && <p>{item.details}</p>}<small>申请于 {new Date(item.created_at).toLocaleString("zh-CN")}</small></article>)}</div> : <Empty title="暂无售后记录" copy="如果商品需要处理，可通过在线申请提交订单信息。" href="/return" link="申请退换货" />}</section>}
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

function ProfilePanel({ member, profile, onSubmit }: { member: Member; profile: MemberProfile; onSubmit: (event: React.FormEvent<HTMLFormElement>) => void }) {
  const selectedConcerns = parseSelections(profile.skin_concerns);
  const selectedCategories = parseSelections(profile.preferred_categories);
  const completionValues = [member.name, member.phone, profile.nickname, profile.gender, profile.birthday, profile.province, profile.city, profile.skin_type];
  const completion = Math.round((completionValues.filter(Boolean).length / completionValues.length) * 100);
  const tier = member.status === "vip" ? "VIP 会员" : "普通会员";
  const initial = (profile.nickname || member.name || "P").slice(0, 1).toUpperCase();

  return <section className="member-section member-profile-section">
    <div className="profile-summary">
      <div className="profile-avatar" aria-hidden="true">{initial}</div>
      <div><p>会员编号 #{member.id}</p><h2>{profile.nickname || member.name}</h2><span>{tier} · 加入于 {new Date(member.joined_at).toLocaleDateString("zh-CN")}</span></div>
      <div className="profile-completion"><span>资料完整度 <b>{completion}%</b></span><div><i style={{ width: `${completion}%` }} /></div><small>{completion === 100 ? "资料已经完善" : "完善资料，获得更合适的商品推荐"}</small></div>
    </div>
    <form className="profile-form" onSubmit={onSubmit}>
      <fieldset><legend><span>01</span><div><b>基本资料</b><small>用于账户识别、配送联系和会员服务</small></div></legend><div className="member-form">
        <label>昵称<input name="nickname" maxLength={30} defaultValue={profile.nickname} placeholder="希望我们如何称呼你" /></label>
        <label>真实姓名<input name="name" maxLength={50} autoComplete="name" defaultValue={member.name} required /></label>
        <label>手机号码<input name="phone" type="tel" maxLength={20} autoComplete="tel" defaultValue={member.phone} placeholder="+86 138 0000 0000" required /></label>
        <label>性别<select name="gender" defaultValue={profile.gender}><option value="">请选择</option><option value="female">女</option><option value="male">男</option><option value="undisclosed">不愿透露</option></select></label>
        <label>出生日期<input name="birthday" type="date" max={new Date().toISOString().slice(0, 10)} defaultValue={profile.birthday} /></label>
        <label className="full">登录邮箱<input value={member.email} disabled /><small>登录邮箱已完成验证。如需更换，请联系客户服务进行身份核验。</small></label>
      </div></fieldset>

      <fieldset><legend><span>02</span><div><b>美妆档案</b><small>选填，用于优化商品推荐，不影响正常购物</small></div></legend><div className="member-form">
        <label>肤质<select name="skinType" defaultValue={profile.skin_type}><option value="">请选择</option><option value="normal">中性肌</option><option value="dry">干性肌</option><option value="oily">油性肌</option><option value="combination">混合肌</option><option value="sensitive">敏感肌</option></select></label>
        <div className="profile-choice full"><span>主要护理诉求</span><div>{skinConcerns.map((item) => <label key={item}><input type="checkbox" name="skinConcerns" value={item} defaultChecked={selectedConcerns.includes(item)} />{item}</label>)}</div></div>
        <div className="profile-choice full"><span>感兴趣的品类</span><div>{preferredCategories.map((item) => <label key={item}><input type="checkbox" name="preferredCategories" value={item} defaultChecked={selectedCategories.includes(item)} />{item}</label>)}</div></div>
      </div></fieldset>

      <fieldset><legend><span>03</span><div><b>联系与偏好</b><small>补充常用地区与联系方式</small></div></legend><div className="member-form">
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

function OrderList({ orders, items }: { orders: Order[]; items: OrderItem[] }) { return <div className="member-order-list">{orders.map((order) => <details key={order.id}><summary><span><b>{order.id}</b><small>{new Date(order.created_at).toLocaleString("zh-CN")}</small></span><span>{order.item_count} 件商品</span><strong>{formatCnyFromRub(order.total)}</strong><em>{order.status}</em></summary><div className="member-order-detail"><p>{order.delivery} · {order.payment}</p><p>{order.address}</p>{items.filter((item) => item.order_id === order.id).map((item) => <div key={item.id}><span>{item.product_name}<small>数量 {item.quantity}</small></span><b>{formatCnyFromRub(item.unit_price * item.quantity)}</b></div>)}{order.discount > 0 && <p className="member-discount">订单优惠 −{formatCnyFromRub(order.discount)}</p>}</div></details>)}</div>; }

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
