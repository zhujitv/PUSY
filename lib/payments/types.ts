export type PaymentProviderName = "wechat" | "alipay";
export type PaymentStatus = "created" | "pending" | "paid" | "failed" | "closed" | "refunding" | "partially_refunded" | "refunded";
export type RefundStatus = "pending" | "processing" | "succeeded" | "failed";

export type ProviderConfig = {
  provider: PaymentProviderName;
  enabled: number;
  mode: string;
  app_id: string;
  merchant_id: string;
  public_key_id: string;
  certificate_serial: string;
};

export type CreatePaymentInput = { orderId: string; tradeNo: string; amountFen: number; description: string; notifyUrl: string; returnUrl: string };
export type CreatePaymentResult = { status: PaymentStatus; providerTransactionId?: string; checkoutUrl?: string; codeUrl?: string };
export type QueryPaymentResult = { status: PaymentStatus; providerTransactionId?: string; paidAt?: string; message?: string };
export type RefundInput = { tradeNo: string; transactionId?: string; refundNo: string; amountFen: number; totalFen: number; reason: string; notifyUrl: string };
export type RefundResult = { status: RefundStatus; providerRefundId?: string; message?: string };

export interface PaymentAdapter {
  configured(config: ProviderConfig): boolean;
  create(config: ProviderConfig, input: CreatePaymentInput): Promise<CreatePaymentResult>;
  query(config: ProviderConfig, tradeNo: string): Promise<QueryPaymentResult>;
  refund(config: ProviderConfig, input: RefundInput): Promise<RefundResult>;
  queryRefund(config: ProviderConfig, refundNo: string, tradeNo: string): Promise<RefundResult>;
}
