import { alipayAdapter } from "./alipay";
import { wechatAdapter } from "./wechat";
import type { PaymentProviderName } from "./types";

export function paymentAdapter(provider: PaymentProviderName) { return provider === "wechat" ? wechatAdapter : alipayAdapter; }
export type { PaymentProviderName, ProviderConfig } from "./types";
