ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS privacy_consented_at TEXT;
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS marketing_consented_at TEXT;
ALTER TABLE subscribers ADD COLUMN IF NOT EXISTS welcome_coupon_code TEXT;

CREATE UNIQUE INDEX IF NOT EXISTS subscribers_welcome_coupon_idx
  ON subscribers (welcome_coupon_code)
  WHERE welcome_coupon_code IS NOT NULL;

INSERT INTO notification_templates (key, name, email_subject, email_body, sms_body, enabled) VALUES
  ('newsletter_welcome', '订阅见面礼', '欢迎加入 PUSY.CN：您的新客 9 折优惠码', '感谢订阅 PUSY.CN。您的专属新客 9 折优惠码为 {{couponCode}}，有效期至 {{endsAt}}，仅可使用一次。', '', 1)
ON CONFLICT (key) DO UPDATE SET
  name = EXCLUDED.name,
  email_subject = EXCLUDED.email_subject,
  email_body = EXCLUDED.email_body,
  sms_body = EXCLUDED.sms_body,
  enabled = EXCLUDED.enabled;
