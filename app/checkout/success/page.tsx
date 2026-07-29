"use client";
import { useEffect, useState } from "react";
import { PageShell } from "../../components/SiteChrome";
import type { Order } from "../../components/StoreProvider";
import { formatCnyFromRub } from "../../data/products";
export default function SuccessPage() { const [order, setOrder] = useState<Order | null>(null); useEffect(() => { queueMicrotask(() => { try { const value = localStorage.getItem("pusy-cn-last-order"); if (value) setOrder(JSON.parse(value)); } catch {} }); }, []); return <PageShell><main className="success-page"><span>✓</span><p>支付结果已确认</p><h1>谢谢你，{order?.customer || "欢迎来到 PÚSY"}</h1><div><p>订单编号 <b>{order?.id || "正在读取"}</b></p>{order && <p>订单金额 <b>{formatCnyFromRub(order.total)}</b></p>}<p>订单状态和支付结果已同步，你可以在会员中心查看后续配送进度。</p></div><a className="primary-link" href="/account">查看我的订单</a><a className="text-link" href="/catalog/products">继续购物</a></main></PageShell>; }
