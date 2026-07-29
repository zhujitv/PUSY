import { rsaSign, rsaVerify } from "./crypto";
import type { PaymentAdapter, PaymentStatus, ProviderConfig, QueryPaymentResult, RefundStatus } from "./types";

function gateway(mode: string) { return mode === "sandbox" ? "https://openapi-sandbox.dl.alipaydev.com/gateway.do" : "https://openapi.alipay.com/gateway.do"; }
const privateKey = () => process.env.ALIPAY_PRIVATE_KEY ?? "";
const publicKey = () => process.env.ALIPAY_PUBLIC_KEY ?? "";

function timestamp() {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Shanghai", year: "numeric", month: "2-digit", day: "2-digit", hour: "2-digit", minute: "2-digit", second: "2-digit", hour12: false }).formatToParts(new Date());
  const part = (type: Intl.DateTimeFormatPartTypes) => parts.find((item) => item.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")} ${part("hour")}:${part("minute")}:${part("second")}`;
}
function canonical(params: Record<string, string>) { return Object.keys(params).filter((key) => params[key] !== "" && key !== "sign" && key !== "sign_type").sort().map((key) => `${key}=${params[key]}`).join("&"); }
async function signedParams(config: ProviderConfig, method: string, bizContent: Record<string, unknown>, extra: Record<string, string> = {}) {
  const params: Record<string, string> = { app_id: config.app_id, method, format: "JSON", charset: "utf-8", sign_type: "RSA2", timestamp: timestamp(), version: "1.0", biz_content: JSON.stringify(bizContent), ...extra };
  params.sign = await rsaSign(canonical(params), privateKey());
  return params;
}
function responseSlice(raw: string, key: string) {
  const marker = `"${key}":`;
  const startMarker = raw.indexOf(marker);
  if (startMarker < 0) return "";
  const start = raw.indexOf("{", startMarker + marker.length);
  if (start < 0) return "";
  let depth = 0; let quoted = false; let escaped = false;
  for (let index = start; index < raw.length; index++) {
    const char = raw[index];
    if (escaped) { escaped = false; continue; }
    if (char === "\\" && quoted) { escaped = true; continue; }
    if (char === '"') { quoted = !quoted; continue; }
    if (quoted) continue;
    if (char === "{") depth++;
    if (char === "}" && --depth === 0) return raw.slice(start, index + 1);
  }
  return "";
}
async function api(config: ProviderConfig, method: string, bizContent: Record<string, unknown>) {
  const params = await signedParams(config, method, bizContent);
  const response = await fetch(gateway(config.mode), { method: "POST", headers: { "content-type": "application/x-www-form-urlencoded;charset=utf-8" }, body: new URLSearchParams(params) });
  const raw = await response.text();
  const parsed = JSON.parse(raw) as Record<string, unknown>;
  const responseKey = `${method.replaceAll(".", "_")}_response`;
  const content = responseSlice(raw, responseKey);
  const signature = String(parsed.sign ?? "");
  if (!content || !signature || !await rsaVerify(content, signature, publicKey())) throw new Error("支付宝应答验签失败");
  const result = parsed[responseKey] as Record<string, unknown>;
  if (!response.ok || String(result.code) !== "10000") throw new Error(String(result.sub_msg ?? result.msg ?? "支付宝请求失败"));
  return result;
}
function paymentStatus(value: string): PaymentStatus { return value === "TRADE_SUCCESS" || value === "TRADE_FINISHED" ? "paid" : value === "TRADE_CLOSED" ? "closed" : "pending"; }
function refundStatus(result: Record<string, unknown>): RefundStatus { return result.fund_change === "Y" ? "succeeded" : "processing"; }

export const alipayAdapter: PaymentAdapter = {
  configured(config) { return Boolean(config.enabled && config.app_id && config.merchant_id && privateKey() && publicKey()); },
  async create(config, input) {
    const params = await signedParams(config, "alipay.trade.page.pay", { out_trade_no: input.tradeNo, total_amount: (input.amountFen / 100).toFixed(2), subject: input.description.slice(0, 256), product_code: "FAST_INSTANT_TRADE_PAY", timeout_express: "30m" }, { notify_url: input.notifyUrl, return_url: input.returnUrl });
    return { status: "pending", checkoutUrl: `${gateway(config.mode)}?${new URLSearchParams(params).toString()}` };
  },
  async query(config, tradeNo): Promise<QueryPaymentResult> {
    const result = await api(config, "alipay.trade.query", { out_trade_no: tradeNo });
    return { status: paymentStatus(String(result.trade_status ?? "")), providerTransactionId: String(result.trade_no ?? "") || undefined, paidAt: String(result.send_pay_date ?? "") || undefined };
  },
  async refund(config, input) {
    const result = await api(config, "alipay.trade.refund", { out_trade_no: input.tradeNo, refund_amount: (input.amountFen / 100).toFixed(2), refund_reason: input.reason.slice(0, 256), out_request_no: input.refundNo });
    return { status: refundStatus(result), providerRefundId: String(result.trade_no ?? "") || undefined, message: String(result.msg ?? "") };
  },
  async queryRefund(config, refundNo, tradeNo) {
    const result = await api(config, "alipay.trade.fastpay.refund.query", { out_trade_no: tradeNo, out_request_no: refundNo });
    const amount = Number(result.refund_amount ?? 0);
    return { status: amount > 0 ? "succeeded" : "processing", providerRefundId: String(result.trade_no ?? "") || undefined };
  },
};

export async function verifyAlipayWebhook(request: Request) {
  const raw = await request.text();
  const params = Object.fromEntries(new URLSearchParams(raw).entries());
  const signature = params.sign ?? "";
  if (!signature || !await rsaVerify(canonical(params), signature, publicKey())) throw new Error("支付宝通知验签失败");
  return { eventId: `alipay:${params.notify_id || crypto.randomUUID()}`, eventType: params.notify_type || "trade_status_sync", body: raw, resource: params };
}
