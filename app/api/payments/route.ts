import { getStoreDb } from "../../../db/store";
import { createPayment, syncPayment } from "../../../lib/payments/service";
import type { PaymentProviderName } from "../../../lib/payments/types";
import { sha256 } from "../../../lib/payments/crypto";

async function authorizePayment(orderId: string, token: string) {
  if (!orderId || !token) return false;
  const db = await getStoreDb();
  const order = await db.prepare("SELECT payment_token_hash FROM orders WHERE id = ?").bind(orderId).first<{ payment_token_hash: string }>();
  return Boolean(order?.payment_token_hash && order.payment_token_hash === await sha256(token));
}

export async function POST(request: Request) {
  try {
    const payload = await request.json() as { orderId?: string; provider?: string; token?: string };
    const provider = String(payload.provider ?? "") as PaymentProviderName;
    if (!payload.orderId || !["wechat", "alipay"].includes(provider)) return Response.json({ error: "请选择有效的订单和支付方式" }, { status: 400 });
    if (!await authorizePayment(payload.orderId, String(payload.token ?? ""))) return Response.json({ error: "支付访问凭证无效或已丢失" }, { status: 403 });
    const payment = await createPayment(payload.orderId, provider, new URL(request.url).origin, String(payload.token));
    return Response.json({ paymentId: payment?.id, orderId: payment?.order_id, status: payment?.status, redirectUrl: payment?.checkout_url, codeUrl: payment?.code_url }, { status: 201 });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "支付发起失败" }, { status: 503 });
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const orderId = url.searchParams.get("orderId") ?? "";
    if (!await authorizePayment(orderId, url.searchParams.get("token") ?? "")) return Response.json({ error: "支付访问凭证无效或已丢失" }, { status: 403 });
    const db = await getStoreDb();
    let payment = await db.prepare("SELECT id, order_id, provider, amount_fen, status, checkout_url, code_url, last_error, paid_at, created_at, updated_at FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1").bind(orderId).first<Record<string, unknown>>();
    if (!payment) return Response.json({ error: "尚未创建支付记录" }, { status: 404 });
    if (url.searchParams.get("sync") === "1" && ["created", "pending", "failed"].includes(String(payment.status))) payment = await syncPayment(String(payment.id)) as unknown as Record<string, unknown>;
    return Response.json({ payment });
  } catch (error) {
    return Response.json({ error: error instanceof Error ? error.message : "支付状态查询失败" }, { status: 500 });
  }
}
