import { getStoreDb } from "../../../db/store";
import { createPayment, syncPayment } from "../../../lib/payments/service";
import type { PaymentProviderName } from "../../../lib/payments/types";
import { sha256 } from "../../../lib/payments/crypto";
import { allowRequest, allowRequestForIdentity, hasTrustedOrigin, privateJson, rateLimitResponse, safeServerError } from "../../../lib/request-security";
import { getPreviewMemberIdentity } from "../../../lib/preview-member-auth";

const PAYMENT_COOKIE = "pusy-payment-access";

function cookieToken(request: Request, orderId: string) {
  const part = (request.headers.get("cookie") ?? "").split(";").map((value) => value.trim()).find((value) => value.startsWith(`${PAYMENT_COOKIE}=`));
  if (!part) return "";
  try {
    const value = decodeURIComponent(part.slice(PAYMENT_COOKIE.length + 1));
    const separator = value.indexOf(".");
    return value.slice(0, separator) === orderId ? value.slice(separator + 1) : "";
  } catch { return ""; }
}

function paymentCookie(orderId: string, token: string) {
  const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";
  return `${PAYMENT_COOKIE}=${encodeURIComponent(`${orderId}.${token}`)}; Path=/; HttpOnly; SameSite=Lax; Max-Age=1800${secure}`;
}

async function authorizePayment(orderId: string, token: string) {
  if (!orderId || !token) return false;
  const db = await getStoreDb();
  const order = await db.prepare("SELECT payment_token_hash FROM orders WHERE id = ?").bind(orderId).first<{ payment_token_hash: string }>();
  return Boolean(order?.payment_token_hash && order.payment_token_hash === await sha256(token));
}

export async function POST(request: Request) {
  try {
    if (!hasTrustedOrigin(request)) return privateJson({ error: "请求来源无效" }, { status: 403 });
    const payload = await request.json() as { action?: string; orderId?: string; provider?: string; token?: string; paymentPassword?: string };
    const provider = String(payload.provider ?? "") as PaymentProviderName;
    const orderId = String(payload.orderId ?? "");
    const token = String(payload.token ?? "") || cookieToken(request, orderId);
    if (payload.action === "sync") {
      if (!await allowRequest(request, "sync-payment", 70, 10 * 60)) return rateLimitResponse();
      if (!await authorizePayment(orderId, token)) return privateJson({ error: "支付访问凭证无效或已过期" }, { status: 403 });
      if (!await allowRequestForIdentity("sync-payment-order", orderId, 70, 10 * 60)) return rateLimitResponse();
      const db = await getStoreDb();
      const payment = await db.prepare("SELECT id, order_id, provider, amount_fen, wallet_amount_fen, external_amount_fen, wallet_status, status, checkout_url, code_url, last_error, paid_at, created_at, updated_at FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1").bind(orderId).first<Record<string, unknown>>();
      if (!payment) return privateJson({ error: "尚未创建支付记录" }, { status: 404 });
      const current = ["created", "pending", "failed"].includes(String(payment.status)) ? await syncPayment(String(payment.id)) : payment;
      return privateJson({ payment: current });
    }
    if (!await allowRequest(request, "create-payment", 15, 10 * 60)) return rateLimitResponse();
    if (!orderId || !["wechat", "alipay"].includes(provider)) return privateJson({ error: "请选择有效的订单和支付方式" }, { status: 400 });
    if (!await authorizePayment(orderId, token)) return privateJson({ error: "支付访问凭证无效或已丢失" }, { status: 403 });
    try {
      const viewer = await getPreviewMemberIdentity();
      const payment = await createPayment(orderId, provider, new URL(request.url).origin, { memberId: viewer?.memberId, paymentPassword: String(payload.paymentPassword ?? "") });
      return privateJson({ paymentId: payment?.id, orderId: payment?.order_id, status: payment?.status, amountFen: payment?.amount_fen, walletAmountFen: payment?.wallet_amount_fen, externalAmountFen: payment?.external_amount_fen, redirectUrl: payment?.checkout_url, codeUrl: payment?.code_url }, { status: 201, headers: { "set-cookie": paymentCookie(orderId, token) } });
    } catch (error) {
      const raw = error instanceof Error ? error.message : "";
      const safe = /支付时限|尚未启用|未配置完整|支付密码|会员账户|余额|其他渠道/.test(raw);
      const status = /锁定/.test(raw) ? 423 : /余额发生变化|其他渠道/.test(raw) ? 409 : /支付密码|会员账户/.test(raw) ? 400 : 503;
      if (status !== 503) return privateJson({ error: safe ? raw : "支付发起失败，请稍后再试" }, { status, headers: { "set-cookie": paymentCookie(orderId, token) } });
      return privateJson({ error: safe ? raw : "支付发起失败，请稍后再试" }, { status: 503, headers: { "set-cookie": paymentCookie(orderId, token) } });
    }
  } catch (error) {
    return safeServerError(error instanceof Error && /支付时限/.test(error.message) ? error.message : "支付发起失败，请稍后再试", 503);
  }
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const orderId = url.searchParams.get("orderId") ?? "";
    if (!await authorizePayment(orderId, cookieToken(request, orderId))) return privateJson({ error: "支付访问凭证无效或已过期" }, { status: 403 });
    const db = await getStoreDb();
    const payment = await db.prepare("SELECT id, order_id, provider, amount_fen, wallet_amount_fen, external_amount_fen, wallet_status, status, checkout_url, code_url, last_error, paid_at, created_at, updated_at FROM payments WHERE order_id = ? ORDER BY created_at DESC LIMIT 1").bind(orderId).first<Record<string, unknown>>();
    if (!payment) return privateJson({ error: "尚未创建支付记录" }, { status: 404 });
    return privateJson({ payment });
  } catch {
    return safeServerError("支付状态查询失败，请稍后再试");
  }
}
