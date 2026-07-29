import { aesGcmDecrypt, rsaSign, rsaVerify } from "./crypto";
import type { PaymentAdapter, PaymentStatus, ProviderConfig, QueryPaymentResult, RefundStatus } from "./types";

const baseUrl = "https://api.mch.weixin.qq.com";
const privateKey = () => process.env.WECHAT_PAY_PRIVATE_KEY ?? "";
const publicKey = () => process.env.WECHAT_PAY_PUBLIC_KEY ?? "";
const apiV3Key = () => process.env.WECHAT_PAY_API_V3_KEY ?? "";

function nonce() { return crypto.randomUUID().replaceAll("-", ""); }
function paymentStatus(value: string): PaymentStatus {
  return value === "SUCCESS" ? "paid" : value === "REFUND" ? "refunded" : value === "CLOSED" || value === "REVOKED" ? "closed" : value === "PAYERROR" ? "failed" : "pending";
}
function refundStatus(value: string): RefundStatus { return value === "SUCCESS" ? "succeeded" : value === "CLOSED" || value === "ABNORMAL" ? "failed" : "processing"; }

async function request(config: ProviderConfig, method: "GET" | "POST", path: string, payload?: unknown) {
  const body = payload === undefined ? "" : JSON.stringify(payload);
  const timestamp = Math.floor(Date.now() / 1000).toString();
  const random = nonce();
  const signature = await rsaSign(`${method}\n${path}\n${timestamp}\n${random}\n${body}\n`, privateKey());
  const authorization = `WECHATPAY2-SHA256-RSA2048 mchid="${config.merchant_id}",nonce_str="${random}",signature="${signature}",timestamp="${timestamp}",serial_no="${config.certificate_serial}"`;
  const response = await fetch(`${baseUrl}${path}`, { method, headers: { authorization, accept: "application/json", "content-type": "application/json", "user-agent": "PUSY-CN-Payments/1.0" }, body: method === "POST" ? body : undefined });
  const raw = await response.text();
  const responseTimestamp = response.headers.get("wechatpay-timestamp") ?? "";
  const responseNonce = response.headers.get("wechatpay-nonce") ?? "";
  const responseSignature = response.headers.get("wechatpay-signature") ?? "";
  const responseSerial = response.headers.get("wechatpay-serial") ?? "";
  if (!responseTimestamp || !responseNonce || !responseSignature || responseSerial !== config.public_key_id || !await rsaVerify(`${responseTimestamp}\n${responseNonce}\n${raw}\n`, responseSignature, publicKey())) throw new Error("微信支付应答验签失败");
  const result = raw ? JSON.parse(raw) as Record<string, unknown> : {};
  if (!response.ok) throw new Error(String(result.message ?? result.code ?? "微信支付请求失败"));
  return result;
}

export const wechatAdapter: PaymentAdapter = {
  configured(config) { return Boolean(config.enabled && config.app_id && config.merchant_id && config.certificate_serial && config.public_key_id && privateKey() && publicKey() && apiV3Key()); },
  async create(config, input) {
    const result = await request(config, "POST", "/v3/pay/transactions/native", { appid: config.app_id, mchid: config.merchant_id, description: input.description.slice(0, 127), out_trade_no: input.tradeNo, notify_url: input.notifyUrl, amount: { total: input.amountFen, currency: "CNY" }, time_expire: new Date(Date.now() + 30 * 60_000).toISOString() });
    return { status: "pending", codeUrl: String(result.code_url ?? "") };
  },
  async query(config, tradeNo): Promise<QueryPaymentResult> {
    const result = await request(config, "GET", `/v3/pay/transactions/out-trade-no/${encodeURIComponent(tradeNo)}?mchid=${encodeURIComponent(config.merchant_id)}`);
    return { status: paymentStatus(String(result.trade_state ?? "")), providerTransactionId: String(result.transaction_id ?? "") || undefined, paidAt: String(result.success_time ?? "") || undefined, message: String(result.trade_state_desc ?? "") };
  },
  async refund(config, input) {
    const result = await request(config, "POST", "/v3/refund/domestic/refunds", { out_trade_no: input.transactionId ? undefined : input.tradeNo, transaction_id: input.transactionId || undefined, out_refund_no: input.refundNo, reason: input.reason.slice(0, 80), notify_url: input.notifyUrl, amount: { refund: input.amountFen, total: input.totalFen, currency: "CNY" } });
    return { status: refundStatus(String(result.status ?? "PROCESSING")), providerRefundId: String(result.refund_id ?? "") || undefined };
  },
  async queryRefund(config, refundNo) {
    const result = await request(config, "GET", `/v3/refund/domestic/refunds/${encodeURIComponent(refundNo)}`);
    return { status: refundStatus(String(result.status ?? "PROCESSING")), providerRefundId: String(result.refund_id ?? "") || undefined };
  },
};

export async function verifyWechatWebhook(request: Request, expectedSerial: string) {
  const body = await request.text();
  const timestamp = request.headers.get("wechatpay-timestamp") ?? "";
  const random = request.headers.get("wechatpay-nonce") ?? "";
  const signature = request.headers.get("wechatpay-signature") ?? "";
  const serial = request.headers.get("wechatpay-serial") ?? "";
  if (!timestamp || Math.abs(Date.now() / 1000 - Number(timestamp)) > 300) throw new Error("微信支付通知时间无效");
  if (!serial || serial !== expectedSerial) throw new Error("微信支付平台公钥编号不匹配");
  if (signature.startsWith("WECHATPAY/SIGNTEST/") || !await rsaVerify(`${timestamp}\n${random}\n${body}\n`, signature, publicKey())) throw new Error("微信支付通知验签失败");
  const envelope = JSON.parse(body) as { id: string; event_type: string; resource: { ciphertext: string; nonce: string; associated_data: string } };
  const plaintext = await aesGcmDecrypt(envelope.resource.ciphertext, envelope.resource.nonce, envelope.resource.associated_data, apiV3Key());
  return { eventId: `wechat:${envelope.id}`, eventType: envelope.event_type, serial, body, resource: JSON.parse(plaintext) as Record<string, unknown> };
}
