import { processDueNotifications, processNotificationJob } from "../../notifications/service";
import { createPayment, createRefund, retryRefund, syncPayment, syncRefund } from "../../payments/service";
import type { PaymentProviderName } from "../../payments/types";
import type { AdminActionContext, AdminActionResult } from "./action-context";

export async function handlePaymentNotificationAction(context: AdminActionContext): Promise<AdminActionResult> {
  const { action, payload, db, request } = context;
  if (action === "update-payment-provider") {
      const provider = String(payload.provider ?? "") as PaymentProviderName;
      if (!["wechat", "alipay"].includes(provider)) return Response.json({ error: "支付渠道无效" }, { status: 400 });
      const mode = String(payload.mode ?? "production");
      if (!["production", "sandbox"].includes(mode) || (provider === "wechat" && mode !== "production")) return Response.json({ error: "支付运行环境无效" }, { status: 400 });
      await db.prepare("UPDATE payment_providers SET enabled = ?, mode = ?, app_id = ?, merchant_id = ?, public_key_id = ?, certificate_serial = ?, updated_at = CURRENT_TIMESTAMP WHERE provider = ?").bind(payload.enabled ? 1 : 0, mode, String(payload.appId ?? "").trim(), String(payload.merchantId ?? "").trim(), String(payload.publicKeyId ?? "").trim(), String(payload.certificateSerial ?? "").trim(), provider).run();
    } else if (action === "retry-payment") {
      const provider = String(payload.provider ?? "") as PaymentProviderName;
      await createPayment(String(payload.orderId ?? ""), provider, new URL(request.url).origin);
    } else if (action === "sync-payment") {
      await syncPayment(String(payload.id ?? ""));
    } else if (action === "create-refund") {
      const amountFen = Math.round(Number(payload.amountYuan) * 100);
      const reason = String(payload.reason ?? "").trim();
      if (!Number.isFinite(amountFen) || amountFen <= 0 || !reason) return Response.json({ error: "请填写有效退款金额和原因" }, { status: 400 });
      await createRefund(String(payload.paymentId ?? ""), amountFen, reason, new URL(request.url).origin);
    } else if (action === "retry-refund") {
      await retryRefund(String(payload.id ?? ""), new URL(request.url).origin);
    } else if (action === "sync-refund") {
      await syncRefund(String(payload.id ?? ""));
    } else if (action === "update-notification-setting") {
      const channel = String(payload.channel ?? "");
      if (!["email", "sms"].includes(channel)) return Response.json({ error: "通知渠道无效" }, { status: 400 });
      await db.prepare("UPDATE notification_settings SET enabled = ?, sender_name = ?, sender_address = ?, updated_at = CURRENT_TIMESTAMP WHERE channel = ?").bind(payload.enabled ? 1 : 0, String(payload.senderName ?? "PUSY.CN").trim() || "PUSY.CN", String(payload.senderAddress ?? "").trim(), channel).run();
    } else if (action === "update-notification-template") {
      const key = String(payload.key ?? "");
      const template = await db.prepare("SELECT key FROM notification_templates WHERE key = ?").bind(key).first();
      if (!template) return Response.json({ error: "通知模板不存在" }, { status: 404 });
      await db.prepare("UPDATE notification_templates SET enabled = ?, email_subject = ?, email_body = ?, sms_body = ?, updated_at = CURRENT_TIMESTAMP WHERE key = ?").bind(payload.enabled ? 1 : 0, String(payload.emailSubject ?? "").trim(), String(payload.emailBody ?? "").trim(), String(payload.smsBody ?? "").trim(), key).run();
    } else if (action === "retry-notification") {
      const id = String(payload.id ?? "");
      await db.prepare("UPDATE notification_jobs SET status = 'queued', next_retry_at = NULL, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND status != 'sent'").bind(id).run();
      await processNotificationJob(id);
    } else if (action === "process-notifications") {
      await processDueNotifications();
    } else if (action === "update-review-status") {
      const status = String(payload.status ?? "");
      if (!["pending", "approved", "rejected"].includes(status)) return Response.json({ error: "评价状态无效" }, { status: 400 });
      const reviewId = Number(payload.id);
      await db.prepare("UPDATE product_reviews SET status = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?").bind(status, reviewId).run();
      if (status === "approved") {
        const review = await db.prepare("SELECT member_id FROM product_reviews WHERE id = ? LIMIT 1").bind(reviewId).first<{ member_id: number | null }>();
        if (review?.member_id) await (await import("../../growth/member-program")).syncReviewTasks(review.member_id, reviewId);
      }
  } else return false;
  return true;
}
