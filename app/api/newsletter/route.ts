import { getStoreDb } from "../../../db/store";
import { allowRequest, hasTrustedOrigin, rateLimitResponse, safeServerError } from "../../../lib/request-security";
import { enqueueNotification } from "../../../lib/notifications/service";

type NewsletterPayload = {
  email?: string;
  source?: string;
  privacyConsent?: boolean;
  marketingConsent?: boolean;
};

export async function POST(request: Request) {
  try {
    if (!hasTrustedOrigin(request)) return Response.json({ error: "请求来源无效" }, { status: 403 });
    if (!await allowRequest(request, "newsletter", 5, 3600)) return rateLimitResponse();
    const payload = await request.json() as NewsletterPayload;
    const email = payload.email?.trim().toLowerCase() ?? "";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return Response.json({ error: "请输入有效的电子邮箱" }, { status: 400 });
    const source = payload.source?.trim().slice(0, 40) || "website";
    const db = await getStoreDb();
    if (source !== "popup") {
      await db.prepare("INSERT INTO subscribers (email, source, status) VALUES (?, ?, 'active') ON CONFLICT(email) DO UPDATE SET status = 'active', source = excluded.source").bind(email, source).run();
      return Response.json({ ok: true }, { status: 201 });
    }
    if (!payload.privacyConsent || !payload.marketingConsent) return Response.json({ error: "请阅读并勾选两项订阅授权" }, { status: 400 });

    const couponCode = `PUSY${crypto.randomUUID().replaceAll("-", "").slice(0, 8).toUpperCase()}`;
    const startsAt = new Date().toISOString();
    const endsAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
    const subscriber = await db.prepare(`WITH existing_subscriber AS (
        SELECT welcome_coupon_code FROM subscribers WHERE email = ? LIMIT 1
      ), coupon_row AS (
        INSERT INTO coupons (code, kind, value, minimum, usage_limit, status, assignment_mode, starts_at, ends_at)
        SELECT ?, 'percent', 10, 0, 1, 'active', 'public', ?, ?
        WHERE NOT EXISTS (SELECT 1 FROM existing_subscriber WHERE welcome_coupon_code IS NOT NULL)
        ON CONFLICT(code) DO NOTHING
        RETURNING code
      ), upserted AS (
        INSERT INTO subscribers (email, source, status, privacy_consented_at, marketing_consented_at, welcome_coupon_code)
        VALUES (?, ?, 'active', CURRENT_TIMESTAMP, CURRENT_TIMESTAMP,
          COALESCE((SELECT welcome_coupon_code FROM existing_subscriber), (SELECT code FROM coupon_row)))
        ON CONFLICT(email) DO UPDATE SET status = 'active', source = excluded.source,
          privacy_consented_at = CURRENT_TIMESTAMP, marketing_consented_at = CURRENT_TIMESTAMP,
          welcome_coupon_code = COALESCE(subscribers.welcome_coupon_code, excluded.welcome_coupon_code)
        RETURNING id, welcome_coupon_code
      ) SELECT upserted.id, upserted.welcome_coupon_code, coupons.ends_at
        FROM upserted LEFT JOIN coupons ON coupons.code = upserted.welcome_coupon_code`).bind(email, couponCode, startsAt, endsAt, email, source).first<{ id: number; welcome_coupon_code: string | null; ends_at: string | null }>();
    if (!subscriber?.welcome_coupon_code) throw new Error("新客优惠码生成失败");
    await enqueueNotification({
      eventKey: `newsletter-welcome:${subscriber.welcome_coupon_code}`,
      entityType: "subscriber",
      entityId: String(subscriber.id),
      templateKey: "newsletter_welcome",
      email,
      payload: { couponCode: subscriber.welcome_coupon_code, endsAt: new Date(subscriber.ends_at || endsAt).toLocaleDateString("zh-CN", { timeZone: "Asia/Shanghai" }) },
    }).catch(() => []);
    return Response.json({ ok: true, couponCode: subscriber.welcome_coupon_code, message: "订阅成功" }, { status: 201 });
  } catch {
    return safeServerError("订阅失败，请稍后再试");
  }
}
