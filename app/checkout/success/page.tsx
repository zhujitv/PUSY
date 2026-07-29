import type { Metadata } from "next";
import { headers } from "next/headers";
import { PageShell } from "../../components/SiteChrome";
import { getStoreDb } from "../../../db/store";
import { sha256 } from "../../../lib/payments/crypto";

export const metadata: Metadata = { title: "支付结果｜PUSY.CN", robots: { index: false, follow: false } };
export const dynamic = "force-dynamic";

function paymentToken(cookieHeader: string, orderId: string) {
  const part = cookieHeader.split(";").map((value) => value.trim()).find((value) => value.startsWith("pusy-payment-access="));
  if (!part) return "";
  try {
    const value = decodeURIComponent(part.slice("pusy-payment-access=".length));
    const separator = value.indexOf(".");
    return value.slice(0, separator) === orderId ? value.slice(separator + 1) : "";
  } catch { return ""; }
}

export default async function SuccessPage({ searchParams }: { searchParams: Promise<{ orderId?: string }> }) {
  const orderId = String((await searchParams).orderId ?? "");
  const token = paymentToken((await headers()).get("cookie") ?? "", orderId);
  const db = await getStoreDb();
  const order = orderId && token ? await db.prepare("SELECT id, customer, total, payment_token_hash, status FROM orders WHERE id = ? LIMIT 1").bind(orderId).first<{ id: string; customer: string; total: number; payment_token_hash: string; status: string }>() : null;
  const authorized = Boolean(order && order.payment_token_hash === await sha256(token));
  const confirmed = authorized && order && ["已确认", "配货中", "已发货", "已完成", "部分退款", "已退款"].includes(order.status);
  return <PageShell><main className="success-page"><span>{confirmed ? "✓" : "…"}</span><p>{confirmed ? "支付结果已确认" : "尚未确认支付结果"}</p><h1>{confirmed ? `谢谢你，${order?.customer}` : "请返回支付页面查询最新状态"}</h1>{authorized && order ? <div><p>订单编号 <b>{order.id}</b></p><p>订单状态 <b>{order.status}</b></p><p>支付结果以支付平台服务器通知为准。</p></div> : <div><p>支付链接无效或已经过期。</p></div>}<a className="primary-link" href={authorized ? "/account" : "/checkout/payment"}>{authorized ? "查看我的订单" : "返回支付页面"}</a><a className="text-link" href="/catalog/products">继续购物</a></main></PageShell>;
}
