"use client";
import { useEffect, useMemo, useState } from "react";
import { formatCnyFromRub, products, type Product } from "../data/products";
import { useStore } from "../components/StoreProvider";

type Member = { id: number; name: string; email: string; phone: string; status: string; total_orders: number; total_spent: number; joined_at: string };
type Address = { id: number; label: string; recipient: string; phone: string; province: string; city: string; district: string; detail: string; postcode: string; is_default: number };
type Order = { id: string; total: number; discount: number; delivery: string; payment: string; address: string; status: string; item_count: number; created_at: string };
type OrderItem = { id: number; order_id: string; product_slug: string; product_name: string; quantity: number; unit_price: number };
type ReturnItem = { id: string; order_id: string; reason: string; details: string; status: string; created_at: string };
type AccountData = { member: Member; addresses: Address[]; orders: Order[]; orderItems: OrderItem[]; returns: ReturnItem[] };

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
  async function saveProfile(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); await act({ action: "update-profile", ...Object.fromEntries(new FormData(event.currentTarget).entries()) }); }
  async function saveAddress(event: React.FormEvent<HTMLFormElement>) { event.preventDefault(); const form = new FormData(event.currentTarget); const ok = await act({ action: "save-address", id: editingAddress?.id, isDefault: form.get("isDefault") === "on", ...Object.fromEntries(form.entries()) }); if (ok) { setEditingAddress(null); setCreatingAddress(false); } }
  const firstName = useMemo(() => data?.member.name || viewer, [data, viewer]);
  const savedProducts = accountProducts.filter((product) => wishlist.includes(product.slug));
  const nav = [["overview","账户总览"],["profile","个人资料"],["addresses","收货地址"],["wishlist","我的收藏"],["orders","我的订单"],["returns","售后进度"]];

  return <main className="member-page">
    <header className="member-hero"><div><p>PÚSY CLUB</p><h1>你好，{firstName}</h1><span>从这里管理个人资料、地址、订单和售后申请。</span></div><div className="member-identity"><i>✓</i><span>已验证账户<b>{email}</b></span><a href="/account/logout">退出登录</a></div></header>
    <div className="member-layout"><aside><nav>{nav.map(([key,label]) => <button key={key} className={tab === key ? "active" : ""} onClick={() => setTab(key)}>{label}</button>)}</nav><a href="/catalog/products">继续购物 →</a></aside><section className="member-content">
      {message && <div className="member-message">{message}</div>}
      {loading && !data ? <div className="member-loading">正在读取会员资料…</div> : data && <>
        {tab === "overview" && <div className="member-overview"><div className="member-stat-grid"><article><span>累计订单</span><b>{data.member.total_orders}</b></article><article><span>累计消费</span><b>{formatCnyFromRub(data.member.total_spent)}</b></article><article><span>收货地址</span><b>{data.addresses.length}</b></article><article><span>进行中售后</span><b>{data.returns.filter((item) => !["已拒绝","已关闭","已退款"].includes(item.status)).length}</b></article></div><section className="member-section"><div className="member-section-title"><h2>最近订单</h2><button onClick={() => setTab("orders")}>查看全部</button></div>{data.orders.length ? <OrderList orders={data.orders.slice(0, 3)} items={data.orderItems} /> : <Empty title="还没有订单" copy="完成第一笔订单后，可在这里持续查看配送状态。" href="/catalog/products" link="浏览商品" />}</section></div>}
        {tab === "profile" && <section className="member-section"><div className="member-section-title"><div><p>会员编号 #{data.member.id}</p><h2>个人资料</h2></div></div><form className="member-form" onSubmit={saveProfile}><label>姓名<input name="name" defaultValue={data.member.name} required /></label><label>手机号码<input name="phone" type="tel" defaultValue={data.member.phone} placeholder="+86 138 0000 0000" required /></label><label className="full">登录邮箱<input value={data.member.email} disabled /><small>登录邮箱已通过安全账户验证，不能在这里直接修改。</small></label><button>保存个人资料</button></form></section>}
        {tab === "addresses" && <section className="member-section"><div className="member-section-title"><div><p>结账时可快速选择</p><h2>收货地址</h2></div><button onClick={() => { setEditingAddress(null); setCreatingAddress(true); }}>＋ 新增地址</button></div>{data.addresses.length ? <div className="address-grid">{data.addresses.map((address) => <article key={address.id} className={address.is_default ? "default" : ""}><div><span>{address.label}</span>{Boolean(address.is_default) && <em>默认</em>}</div><h3>{address.recipient}</h3><p>{address.phone}</p><p>{address.province} {address.city} {address.district}<br />{address.detail} {address.postcode}</p><footer><button onClick={() => setEditingAddress(address)}>编辑</button>{!address.is_default && <button onClick={() => act({ action:"set-default-address", id:address.id })}>设为默认</button>}<button className="danger" onClick={() => act({ action:"delete-address", id:address.id })}>删除</button></footer></article>)}</div> : <Empty title="还没有收货地址" copy="保存常用地址，结账时填写会更轻松。" onClick={() => setCreatingAddress(true)} link="新增地址" />}</section>}
        {tab === "wishlist" && <section className="member-section"><div className="member-section-title"><div><p>{savedProducts.length} 件商品</p><h2>我的收藏</h2></div><a href="/catalog/products">继续发现</a></div>{savedProducts.length ? <div className="member-wishlist-grid">{savedProducts.map((product) => <article key={product.slug}><a href={`/products/${product.slug}`}><img src={product.image} alt={product.name} loading="lazy" /><h3>{product.name}</h3></a><p>{formatCnyFromRub(product.price)}</p><div><button disabled={!product.inventoryVerified || (product.stock ?? 0) < 1} onClick={() => addToCart(product)}>加入购物袋</button><button onClick={() => toggleWishlist(product.slug)}>移除</button></div></article>)}</div> : <Empty title="还没有收藏商品" copy="在商品卡片或详情页点击心形按钮，商品会保存在这里。" href="/catalog/products" link="浏览商品" />}</section>}
        {tab === "orders" && <section className="member-section"><div className="member-section-title"><div><p>{data.orders.length} 笔订单</p><h2>我的订单</h2></div></div>{data.orders.length ? <OrderList orders={data.orders} items={data.orderItems} /> : <Empty title="还没有订单" copy="你的线上订单会安全保存在这里。" href="/catalog/products" link="开始购物" />}</section>}
        {tab === "returns" && <section className="member-section"><div className="member-section-title"><div><p>{data.returns.length} 条记录</p><h2>售后进度</h2></div><a href="/return">申请退换货</a></div>{data.returns.length ? <div className="return-progress">{data.returns.map((item) => <article key={item.id}><div><b>{item.id}</b><span className={`return-status status-${item.status}`}>{item.status}</span></div><h3>{item.reason}</h3><p>关联订单：{item.order_id}</p>{item.details && <p>{item.details}</p>}<small>申请于 {new Date(item.created_at).toLocaleString("zh-CN")}</small></article>)}</div> : <Empty title="暂无售后记录" copy="如果商品需要处理，可通过在线申请提交订单信息。" href="/return" link="申请退换货" />}</section>}
      </>}
    </section></div>
    {(creatingAddress || editingAddress) && <AddressModal editing={editingAddress} onClose={() => { setCreatingAddress(false); setEditingAddress(null); }} onSubmit={saveAddress} />}
  </main>;
}

function OrderList({ orders, items }: { orders: Order[]; items: OrderItem[] }) { return <div className="member-order-list">{orders.map((order) => <details key={order.id}><summary><span><b>{order.id}</b><small>{new Date(order.created_at).toLocaleString("zh-CN")}</small></span><span>{order.item_count} 件商品</span><strong>{formatCnyFromRub(order.total)}</strong><em>{order.status}</em></summary><div className="member-order-detail"><p>{order.delivery} · {order.payment}</p><p>{order.address}</p>{items.filter((item) => item.order_id === order.id).map((item) => <div key={item.id}><span>{item.product_name}<small>数量 {item.quantity}</small></span><b>{formatCnyFromRub(item.unit_price * item.quantity)}</b></div>)}{order.discount > 0 && <p className="member-discount">订单优惠 −{formatCnyFromRub(order.discount)}</p>}</div></details>)}</div>; }

function Empty({ title, copy, href, link, onClick }: { title: string; copy: string; href?: string; link: string; onClick?: () => void }) { return <div className="member-empty"><h3>{title}</h3><p>{copy}</p>{href ? <a href={href}>{link} →</a> : <button onClick={onClick}>{link} →</button>}</div>; }

function AddressModal({ editing, onClose, onSubmit }: { editing: Address | null; onClose: () => void; onSubmit: (event:React.FormEvent<HTMLFormElement>) => void }) { return <div className="member-modal" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}><form onSubmit={onSubmit}><div className="member-section-title"><h2>{editing ? "编辑地址" : "新增地址"}</h2><button type="button" onClick={onClose}>×</button></div><div className="member-form"><label>地址标签<input name="label" defaultValue={editing?.label ?? "家"} /></label><label>收件人<input name="recipient" defaultValue={editing?.recipient} required /></label><label>手机号码<input name="phone" type="tel" defaultValue={editing?.phone} required /></label><label>省份<input name="province" defaultValue={editing?.province} required /></label><label>城市<input name="city" defaultValue={editing?.city} required /></label><label>区 / 县<input name="district" defaultValue={editing?.district} /></label><label className="full">详细地址<input name="detail" defaultValue={editing?.detail} required /></label><label>邮政编码<input name="postcode" defaultValue={editing?.postcode} /></label><label className="check"><input name="isDefault" type="checkbox" defaultChecked={Boolean(editing?.is_default)} /> 设为默认地址</label></div><button className="member-save">保存地址</button></form></div>; }
