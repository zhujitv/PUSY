import { getStoreDb } from "../../db/store";
import { paymentAdapter } from "./index";
import type { PaymentProviderName, PaymentStatus, ProviderConfig, RefundStatus } from "./types";

export type DbPayment = { id: string; order_id: string; provider: PaymentProviderName; merchant_trade_no: string; provider_transaction_id: string | null; amount_fen: number; status: PaymentStatus; checkout_url: string | null; code_url: string | null; attempts: number };
export type DbRefund = { id: string; payment_id: string; order_id: string; provider: PaymentProviderName; merchant_refund_no: string; provider_refund_id: string | null; amount_fen: number; reason: string; status: RefundStatus; attempts: number };

export async function providerConfig(provider: PaymentProviderName) {
  const db = await getStoreDb();
  const config = await db.prepare("SELECT * FROM payment_providers WHERE provider = ?").bind(provider).first<ProviderConfig>();
  if (!config) throw new Error("支付渠道不存在");
  return config;
}

export async function paymentProviderState() {
  const db = await getStoreDb();
  const rows = await db.prepare("SELECT * FROM payment_providers ORDER BY provider").all<ProviderConfig>();
  return rows.results.map((config) => {
    const secrets = { privateKey: config.provider === "wechat" ? Boolean(process.env.WECHAT_PAY_PRIVATE_KEY) : Boolean(process.env.ALIPAY_PRIVATE_KEY), publicKey: config.provider === "wechat" ? Boolean(process.env.WECHAT_PAY_PUBLIC_KEY) : Boolean(process.env.ALIPAY_PUBLIC_KEY), apiV3Key: config.provider === "wechat" ? Boolean(process.env.WECHAT_PAY_API_V3_KEY) : undefined };
    const missing = [!config.app_id && "应用 ID", !config.merchant_id && "商户号", config.provider === "wechat" && !config.public_key_id && "平台公钥 ID", config.provider === "wechat" && !config.certificate_serial && "商户证书序列号", !secrets.privateKey && "商户私钥", !secrets.publicKey && "平台公钥", config.provider === "wechat" && !secrets.apiV3Key && "API v3 密钥", config.enabled && config.mode !== "production" && "正式环境模式"].filter(Boolean) as string[];
    return { ...config, configured: paymentAdapter(config.provider).configured(config) && (!config.enabled || config.mode === "production"), secrets, missing };
  });
}

export function retryAt(attempts: number) { const seconds = [5, 30, 60, 180, 300, 600, 1800][Math.min(attempts, 6)]; return new Date(Date.now() + seconds * 1000).toISOString(); }
export function tradeNo(orderId: string, provider: PaymentProviderName) {
  const suffix = provider === "wechat" ? "W" : "A";
  return `${orderId.replace(/[^A-Za-z0-9_*-]/g, "").slice(0, 30)}${suffix}`;
}
export function paymentId() { return `PAY-${crypto.randomUUID().slice(0, 12).toUpperCase()}`; }
export function refundId() { return `REF-${crypto.randomUUID().slice(0, 12).toUpperCase()}`; }
